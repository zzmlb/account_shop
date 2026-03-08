import { NextRequest, NextResponse } from "next/server";
import { decodeSession } from "@/lib/auth";
import { db } from "@/server/db";
import { apiLimiter } from "@/lib/rate-limit";
import { createLogger } from "@/lib/logger";
import { decryptCardKey } from "@/lib/crypto";

const log = createLogger("orders");

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

    const session = decodeSession(
      request.cookies.get("session")?.value || ""
    );

    const body = await request.json();
    const { items, paymentMethod, email } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, message: "订单商品不能为空" },
        { status: 400 }
      );
    }

    // Calculate total from DB prices (never trust frontend prices)
    let totalAmount = 0;
    const productDetails = [];

    for (const item of items) {
      // Look up by id first, fall back to slug for client compatibility
      let product = await db.product.findUnique({
        where: { id: item.productId },
      });
      if (!product) {
        product = await db.product.findUnique({
          where: { slug: item.productId },
        });
      }

      if (!product || !product.isActive) {
        return NextResponse.json(
          { success: false, message: `商品不存在或已下架: ${item.productId}` },
          { status: 400 }
        );
      }

      if (product.stockCount < item.quantity) {
        return NextResponse.json(
          { success: false, message: `${product.name} 库存不足` },
          { status: 400 }
        );
      }

      const subtotal = Number(product.price) * item.quantity;
      totalAmount += subtotal;
      productDetails.push({ product, quantity: item.quantity, unitPrice: Number(product.price) });
    }

    // Create order with items
    const order = await db.order.create({
      data: {
        orderNo: generateOrderNo(),
        userId: session?.id,
        email: email || null,
        totalAmount,
        payAmount: totalAmount,
        status: "PENDING",
        paymentMethod: paymentMethod || null,
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

    log.info({ orderNo: order.orderNo, userId: session?.id, total: Number(order.totalAmount) }, "Order created");

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        orderNo: order.orderNo,
        totalAmount: Number(order.totalAmount),
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
