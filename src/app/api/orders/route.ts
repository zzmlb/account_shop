import { NextRequest, NextResponse } from "next/server";
import { decodeSession } from "@/lib/auth";
import { db } from "@/server/db";
import { apiLimiter } from "@/lib/rate-limit";
import { createLogger } from "@/lib/logger";
import { decryptCardKey } from "@/lib/crypto";
import { createOrderSchema, formatZodError } from "@/lib/validators";

const log = createLogger("orders");

// Simple in-memory idempotency cache to prevent duplicate order creation
const idempotencyCache = new Map<string, { orderNo: string; expiresAt: number }>();

function generateOrderNo(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `PJ37-${date}-${rand}`;
}

export async function GET(request: NextRequest) {
  try {
    const session = decodeSession(
      request.cookies.get("session")?.value || ""
    );

    if (!session) {
      return NextResponse.json(
        { success: false, message: "未登录" },
        { status: 401 }
      );
    }

    const orders = await db.order.findMany({
      where: { userId: session.id },
      include: {
        items: {
          include: {
            product: { select: { name: true, slug: true } },
            cardKeys: { select: { content: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = orders.map((o) => ({
      id: o.id,
      orderNo: o.orderNo,
      totalAmount: Number(o.totalAmount),
      payAmount: Number(o.payAmount),
      status: o.status,
      paymentMethod: o.paymentMethod,
      email: o.email,
      createdAt: o.createdAt.toISOString(),
      paidAt: o.paidAt?.toISOString(),
      items: o.items.map((item) => ({
        productName: item.product.name,
        productSlug: item.product.slug,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        cardKeys: item.cardKeys.map((k) => decryptCardKey(k.content)),
      })),
    }));

    return NextResponse.json({ success: true, orders: formatted });
  } catch (error) {
    log.error({ err: error }, "Orders fetch error");
    return NextResponse.json(
      { success: false, message: "服务器内部错误" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const rl = apiLimiter(ip);
    if (!rl.success) {
      return NextResponse.json(
        { success: false, message: "请求过于频繁，请稍后再试" },
        { status: 429 }
      );
    }

    // Idempotency check: prevent duplicate orders from double-clicks / retries
    const idempotencyKey = request.headers.get("x-idempotency-key");
    if (idempotencyKey) {
      const cached = idempotencyCache.get(idempotencyKey);
      if (cached && cached.expiresAt > Date.now()) {
        log.info({ idempotencyKey, orderNo: cached.orderNo }, "Duplicate order creation prevented");
        const existingOrder = await db.order.findUnique({
          where: { orderNo: cached.orderNo },
          include: { items: { include: { product: { select: { name: true } } } } },
        });
        if (existingOrder) {
          return NextResponse.json({
            success: true,
            order: {
              id: existingOrder.id,
              orderNo: existingOrder.orderNo,
              totalAmount: Number(existingOrder.totalAmount),
              payAmount: Number(existingOrder.payAmount),
              status: existingOrder.status,
            },
          });
        }
      }
    }

    const session = decodeSession(
      request.cookies.get("session")?.value || ""
    );

    const body = await request.json();
    const parsed = createOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: formatZodError(parsed.error) },
        { status: 400 }
      );
    }
    const { items, paymentMethod, email, couponCode } = parsed.data;

    // Batch-fetch all products in one query (by id and slug for compatibility)
    const productIds = items.map((i) => i.productId);
    const [byId, bySlug] = await Promise.all([
      db.product.findMany({ where: { id: { in: productIds } } }),
      db.product.findMany({ where: { slug: { in: productIds } } }),
    ]);
    const productMap = new Map<string, typeof byId[0]>();
    for (const p of byId) productMap.set(p.id, p);
    for (const p of bySlug) { if (!productMap.has(p.slug)) productMap.set(p.slug, p); }

    // Validate all products and calculate total
    let totalAmount = 0;
    const productDetails = [];

    for (const item of items) {
      const product = productMap.get(item.productId);

      if (!product || !product.isActive) {
        return NextResponse.json(
          { success: false, message: `商品不存在或已下架: ${item.productId}` },
          { status: 400 }
        );
      }

      if (product.stockCount < item.quantity) {
        return NextResponse.json(
          {
            success: false,
            message: product.stockCount === 0
              ? `${product.name} 已售罄`
              : `${product.name} 库存不足，仅剩 ${product.stockCount} 件`,
            code: "STOCK_INSUFFICIENT",
          },
          { status: 400 }
        );
      }

      const subtotal = Number(product.price) * item.quantity;
      totalAmount += subtotal;
      productDetails.push({ product, quantity: item.quantity, unitPrice: Number(product.price) });
    }

    // Validate and apply coupon discount server-side
    let discount = 0;
    let couponId: string | null = null;

    if (couponCode && typeof couponCode === "string") {
      const coupon = await db.coupon.findUnique({
        where: { code: couponCode.trim().toUpperCase() },
      });

      if (coupon && coupon.isActive) {
        const now = new Date();
        const isValid =
          now >= coupon.startAt &&
          now <= coupon.expireAt &&
          (coupon.maxUses === null || coupon.usedCount < coupon.maxUses);

        const minAmount = coupon.minAmount ? Number(coupon.minAmount) : 0;

        if (isValid && totalAmount >= minAmount) {
          const couponValue = Number(coupon.value);
          if (coupon.type === "FIXED") {
            discount = Math.min(couponValue, totalAmount);
          } else {
            discount = Math.round((totalAmount * couponValue) / 100 * 100) / 100;
            discount = Math.min(discount, totalAmount);
          }
          couponId = coupon.id;

          // Increment coupon usage count
          await db.coupon.update({
            where: { id: coupon.id },
            data: { usedCount: { increment: 1 } },
          });

          // Track user-coupon association if user is logged in
          if (session?.id) {
            await db.userCoupon.create({
              data: {
                userId: session.id,
                couponId: coupon.id,
                usedAt: now,
              },
            });
          }

          log.info({ couponCode: coupon.code, discount, orderId: couponId }, "Coupon applied to order");
        } else {
          log.warn({ couponCode: coupon.code, reason: "invalid or unmet conditions" }, "Coupon rejected");
        }
      }
    }

    const payAmount = Math.max(0, Math.round((totalAmount - discount) * 100) / 100);

    // Create order with items
    const order = await db.order.create({
      data: {
        orderNo: generateOrderNo(),
        userId: session?.id,
        email: email || null,
        totalAmount,
        payAmount,
        status: "PENDING",
        paymentMethod: paymentMethod || null,
        couponId,
        expireAt: new Date(Date.now() + 15 * 60 * 1000), // 15 min expiry
        items: {
          create: productDetails.map((d) => ({
            productId: d.product.id,
            quantity: d.quantity,
            unitPrice: d.unitPrice,
          })),
        },
      },
      include: {
        items: {
          include: { product: { select: { name: true } } },
        },
      },
    });

    log.info({ orderNo: order.orderNo, userId: session?.id, total: Number(order.totalAmount), payAmount: Number(order.payAmount), discount, couponId }, "Order created");

    // Cache idempotency key for 60 seconds
    if (idempotencyKey) {
      idempotencyCache.set(idempotencyKey, {
        orderNo: order.orderNo,
        expiresAt: Date.now() + 60_000,
      });
      // Cleanup expired entries periodically
      if (idempotencyCache.size > 1000) {
        const now = Date.now();
        for (const [k, v] of idempotencyCache) {
          if (v.expiresAt < now) idempotencyCache.delete(k);
        }
      }
    }

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        orderNo: order.orderNo,
        totalAmount: Number(order.totalAmount),
        payAmount: Number(order.payAmount),
        discount,
        status: order.status,
        createdAt: order.createdAt.toISOString(),
        expireAt: order.expireAt.toISOString(),
        items: order.items.map((item) => ({
          productName: item.product.name,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
        })),
      },
    });
  } catch (error) {
    log.error({ err: error }, "Create order error");
    return NextResponse.json(
      { success: false, message: "服务器内部错误" },
      { status: 500 }
    );
  }
}
