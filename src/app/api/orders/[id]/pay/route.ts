import { NextRequest, NextResponse } from "next/server";
import { decodeSession } from "@/lib/auth";
import { db } from "@/server/db";
import { createLogger } from "@/lib/logger";
import { sendOrderConfirmation, sendCardKeyDelivery } from "@/server/services/email";
import { paymentLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

const log = createLogger("orders/pay");

// Simulate payment - in production this would integrate with real payment gateway
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

    const body = await request.json();
    const { paymentMethod } = body;

    // Find the order
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

    // Check expiry
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

    // Handle balance payment
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

      // Deduct balance
      await db.user.update({
        where: { id: session.id },
        data: { balance: { decrement: Number(order.payAmount) } },
      });

      // Create balance log
      await db.balanceLog.create({
        data: {
          userId: session.id,
          amount: -Number(order.payAmount),
          type: "PURCHASE",
          description: `购买订单 ${order.orderNo}`,
          relatedId: order.id,
        },
      });
    }

    // Allocate card keys for each item
    const allocatedKeys: string[] = [];

    for (const item of order.items) {
      // Find available card keys for this product
      const keys = await db.cardKey.findMany({
        where: {
          productId: item.productId,
          status: "AVAILABLE",
        },
        take: item.quantity,
      });

      if (keys.length < item.quantity) {
        // Not enough keys - in production would handle this gracefully
        // For now, mark as PAID (not DELIVERED) so admin can manually process
        await db.order.update({
          where: { id },
          data: {
            status: "PAID",
            paymentMethod: paymentMethod || "balance",
            paidAt: new Date(),
          },
        });

        // Send order confirmation email (async, don't block response)
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
          }).catch(() => {});
        }

        return NextResponse.json({
          success: true,
          message: "支付成功，卡密库存不足，待管理员处理",
          order: { id: order.id, orderNo: order.orderNo, status: "PAID" },
        });
      }

      // Assign keys to order item
      for (const key of keys) {
        await db.cardKey.update({
          where: { id: key.id },
          data: {
            status: "SOLD",
            orderId: item.id,
            soldAt: new Date(),
          },
        });
        allocatedKeys.push(key.content);
      }

      // Update product stock
      await db.product.update({
        where: { id: item.productId },
        data: {
          stockCount: { decrement: item.quantity },
          soldCount: { increment: item.quantity },
        },
      });
    }

    // Update order status to DELIVERED
    const updatedOrder = await db.order.update({
      where: { id },
      data: {
        status: "DELIVERED",
        paymentMethod: paymentMethod || "balance",
        paidAt: new Date(),
      },
    });

    // Send emails (async, don't block response)
    if (order.email) {
      // Order confirmation
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
      }).catch(() => {});

      // Card key delivery - group keys by product
      const keysByProduct: Record<string, { productName: string; cardKeys: string[] }> = {};
      for (const item of order.items) {
        const itemKeys = await db.cardKey.findMany({
          where: { orderId: item.id, status: "SOLD" },
          select: { content: true },
        });
        keysByProduct[item.productId] = {
          productName: item.product.name,
          cardKeys: itemKeys.map((k) => k.content),
        };
      }
      sendCardKeyDelivery({
        to: order.email,
        orderNo: order.orderNo,
        items: Object.values(keysByProduct),
      }).catch(() => {});
    }

    log.info({ orderNo: order.orderNo, keys: allocatedKeys.length }, "Payment completed, card keys delivered");

    return NextResponse.json({
      success: true,
      message: "支付成功，卡密已发放",
      order: {
        id: updatedOrder.id,
        orderNo: updatedOrder.orderNo,
        status: updatedOrder.status,
      },
      cardKeys: allocatedKeys,
    });
  } catch (error) {
    log.error({ err: error }, "Payment error");
    return NextResponse.json(
      { success: false, message: "支付处理失败" },
      { status: 500 }
    );
  }
}
