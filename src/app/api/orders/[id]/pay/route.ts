import { NextRequest, NextResponse } from "next/server";
import { decodeSession } from "@/lib/auth";
import { db } from "@/server/db";
import { createLogger } from "@/lib/logger";
import { sendOrderConfirmation, sendCardKeyDelivery } from "@/server/services/email";
import { createNotification, notifyAdminsStockShortage } from "@/server/services/notification";
import { paymentLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { safeDecryptCardKey } from "@/lib/crypto";

export const dynamic = "force-dynamic";
const log = createLogger("orders/pay");

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ip = getClientIp(request);
    const rl = paymentLimiter(ip);
    if (!rl.success) return rateLimitResponse(rl);

    const { id } = await params;
    const session = decodeSession(
      request.cookies.get("session")?.value || ""
    );

    let body: { paymentMethod?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "请求格式无效" },
        { status: 400 }
      );
    }
    const { paymentMethod } = body;

    // Pre-checks outside transaction (read-only)
    const order = await db.order.findUnique({
      where: { id },
      include: {
        items: {
          include: { product: true },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, message: "订单不存在" },
        { status: 404 }
      );
    }

    if (order.status !== "PENDING") {
      return NextResponse.json(
        { success: false, message: "订单状态异常，无法支付" },
        { status: 400 }
      );
    }

    if (new Date() > order.expireAt) {
      await db.order.update({
        where: { id },
        data: { status: "EXPIRED" },
      });
      return NextResponse.json(
        { success: false, message: "订单已过期" },
        { status: 400 }
      );
    }

    // Balance pre-check
    if (paymentMethod === "balance" && session) {
      const user = await db.user.findUnique({
        where: { id: session.id },
      });
      if (!user || Number(user.balance) < Number(order.payAmount)) {
        return NextResponse.json(
          { success: false, message: "余额不足" },
          { status: 400 }
        );
      }
    }

    // === ATOMIC TRANSACTION: balance deduction + card key allocation + order update ===
    const result = await db.$transaction(async (tx) => {
      // Re-check order status inside transaction (prevents double payment)
      const freshOrder = await tx.order.findUnique({
        where: { id },
        select: { status: true },
      });
      if (!freshOrder || freshOrder.status !== "PENDING") {
        throw new Error("ORDER_ALREADY_PROCESSED");
      }

      // Balance deduction (inside transaction for atomicity)
      if (paymentMethod === "balance" && session) {
        const freshUser = await tx.user.findUnique({
          where: { id: session.id },
          select: { balance: true },
        });
        if (!freshUser || Number(freshUser.balance) < Number(order.payAmount)) {
          throw new Error("INSUFFICIENT_BALANCE");
        }

        await tx.user.update({
          where: { id: session.id },
          data: { balance: { decrement: Number(order.payAmount) } },
        });

        await tx.balanceLog.create({
          data: {
            userId: session.id,
            amount: -Number(order.payAmount),
            type: "PURCHASE",
            description: `购买订单 ${order.orderNo}`,
            relatedId: order.id,
          },
        });
      }

      // Re-validate stock inside transaction to prevent race conditions
      for (const item of order.items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          select: { stockCount: true, name: true },
        });
        if (!product || product.stockCount < item.quantity) {
          throw new Error(
            `STOCK_INSUFFICIENT:${product?.name ?? item.productId}`
          );
        }
      }

      // Allocate card keys for each item
      const allocatedKeys: string[] = [];
      let allKeysAllocated = true;

      for (const item of order.items) {
        const keys = await tx.cardKey.findMany({
          where: {
            productId: item.productId,
            status: "AVAILABLE",
          },
          orderBy: { createdAt: "asc" },
          take: item.quantity,
        });

        if (keys.length < item.quantity) {
          allKeysAllocated = false;
          break;
        }

        // Assign keys to order item (batch update)
        const keyIds = keys.map((k) => k.id);
        await tx.cardKey.updateMany({
          where: { id: { in: keyIds } },
          data: {
            status: "SOLD",
            orderId: item.id,
            soldAt: new Date(),
          },
        });
        for (const key of keys) {
          allocatedKeys.push(key.content);
        }

        // Update product stock
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stockCount: { decrement: item.quantity },
            soldCount: { increment: item.quantity },
          },
        });
      }

      // Update order status
      const newStatus = allKeysAllocated ? "DELIVERED" : "PAID";
      const updatedOrder = await tx.order.update({
        where: { id },
        data: {
          status: newStatus,
          paymentMethod: paymentMethod || "balance",
          paidAt: new Date(),
        },
      });

      // Increment coupon usage count atomically (only at payment time)
      if (order.couponId) {
        // Re-validate coupon is still usable at payment time
        const coupon = await tx.coupon.findUnique({
          where: { id: order.couponId },
        });
        if (coupon && coupon.isActive && new Date() <= coupon.expireAt &&
            (coupon.maxUses === null || coupon.usedCount < coupon.maxUses)) {
          await tx.coupon.update({
            where: { id: order.couponId },
            data: { usedCount: { increment: 1 } },
          });
        }

        // Track user-coupon association
        if (session) {
          await tx.userCoupon.create({
            data: {
              userId: session.id,
              couponId: order.couponId,
              usedAt: new Date(),
            },
          });
        }
      }

      return { updatedOrder, allocatedKeys, allKeysAllocated };
    });

    // === Post-transaction: send emails (fire-and-forget, outside transaction) ===
    if (order.email) {
      sendOrderConfirmation({
        to: order.email,
        orderNo: order.orderNo,
        items: order.items.map((i) => ({
          name: i.product.name,
          quantity: i.quantity,
          unitPrice: Number(i.unitPrice),
        })),
        totalAmount: Number(order.payAmount),
        paymentMethod: paymentMethod || "balance",
      }).catch((err) => {
        log.error({ err, orderNo: order.orderNo }, "Failed to send order confirmation email");
      });

      if (result.allKeysAllocated) {
        // Batch fetch all card keys for delivery email (avoids N+1)
        const itemIds = order.items.map((i) => i.id);
        const allKeys = await db.cardKey.findMany({
          where: { orderId: { in: itemIds }, status: "SOLD" },
          select: { content: true, orderId: true },
        });
        const keysByProduct: Record<string, { productName: string; cardKeys: string[] }> = {};
        for (const item of order.items) {
          const itemKeys = allKeys.filter((k) => k.orderId === item.id);
          keysByProduct[item.productId] = {
            productName: item.product.name,
            cardKeys: itemKeys.map((k) => safeDecryptCardKey(k.content)),
          };
        }
        sendCardKeyDelivery({
          to: order.email,
          orderNo: order.orderNo,
          items: Object.values(keysByProduct),
        }).catch((err) => {
          log.error({ err, orderNo: order.orderNo }, "Failed to send card key delivery email");
        });
      }
    }

    // Send in-app notification (fire-and-forget)
    if (session) {
      const productNames = order.items.map((i) => i.product.name).join("、");
      if (result.allKeysAllocated) {
        createNotification({
          userId: session.id,
          type: "ORDER",
          title: "订单已发货",
          content: `您的订单 ${order.orderNo} 已完成支付并发货，包含: ${productNames}。请前往订单详情查看卡密。`,
          href: `/order/${order.orderNo}`,
        });
      } else {
        createNotification({
          userId: session.id,
          type: "ORDER",
          title: "支付成功，等待发货",
          content: `您的订单 ${order.orderNo} 已成功支付，包含: ${productNames}。卡密库存不足，待管理员处理后发货。`,
          href: `/order/${order.orderNo}`,
        });
      }
    }

    if (result.allKeysAllocated) {
      log.info({ orderNo: order.orderNo, keys: result.allocatedKeys.length }, "Payment completed, card keys delivered");
      return NextResponse.json({
        success: true,
        message: "支付成功，卡密已发放",
        order: {
          id: result.updatedOrder.id,
          orderNo: result.updatedOrder.orderNo,
          status: result.updatedOrder.status,
        },
        cardKeys: result.allocatedKeys.map(safeDecryptCardKey),
      });
    } else {
      log.warn({ orderNo: order.orderNo }, "Payment completed but insufficient card keys for delivery");
      // Notify admins about stock shortage (fire-and-forget)
      const productNames = order.items.map((i) => i.product.name);
      notifyAdminsStockShortage(order.orderNo, productNames);
      return NextResponse.json({
        success: true,
        message: "支付成功，卡密库存不足，待管理员处理",
        order: {
          id: result.updatedOrder.id,
          orderNo: result.updatedOrder.orderNo,
          status: "PAID",
        },
      });
    }
  } catch (error) {
    // Handle known transaction errors
    if (error instanceof Error) {
      if (error.message === "ORDER_ALREADY_PROCESSED") {
        return NextResponse.json(
          { success: false, message: "订单已处理，请勿重复支付" },
          { status: 400 }
        );
      }
      if (error.message.startsWith("STOCK_INSUFFICIENT:")) {
        const productName = error.message.split(":")[1];
        return NextResponse.json(
          {
            success: false,
            message: `商品「${productName}」库存不足，请调整后重试`,
            code: "STOCK_INSUFFICIENT",
          },
          { status: 400 }
        );
      }
      if (error.message === "INSUFFICIENT_BALANCE") {
        // Fetch current balance for detailed error
        const session = decodeSession(request.cookies.get("session")?.value || "");
        let balanceInfo: { currentBalance?: number; needed?: number } = {};
        if (session) {
          const user = await db.user.findUnique({
            where: { id: session.id },
            select: { balance: true },
          });
          const order = await db.order.findUnique({
            where: { id: (await params).id },
            select: { payAmount: true },
          });
          if (user && order) {
            balanceInfo = {
              currentBalance: Number(user.balance),
              needed: Number(order.payAmount) - Number(user.balance),
            };
          }
        }
        return NextResponse.json(
          {
            success: false,
            message: balanceInfo.needed
              ? `余额不足，还需充值 ¥${balanceInfo.needed.toFixed(2)}`
              : "余额不足",
            code: "INSUFFICIENT_BALANCE",
            ...balanceInfo,
          },
          { status: 400 }
        );
      }
    }

    log.error({ err: error }, "Payment error");
    return NextResponse.json(
      { success: false, message: "支付处理失败" },
      { status: 500 }
    );
  }
}
