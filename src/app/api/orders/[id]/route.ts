import { NextRequest, NextResponse } from "next/server";
import { decodeSession } from "@/lib/auth";
import { db } from "@/server/db";
import { createLogger } from "@/lib/logger";
import { safeDecryptCardKey } from "@/lib/crypto";
import { apiLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

const log = createLogger("orders/detail");

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rl = apiLimiter(getClientIp(request));
    if (!rl.success) return rateLimitResponse(rl);

    const { id } = await params;

    // Optionally decode session — endpoint works for guests too
    const session = decodeSession(
      request.cookies.get("session")?.value || ""
    );

    // Look up order by orderNo
    const order = await db.order.findFirst({
      where: { orderNo: id },
      include: {
        items: {
          include: {
            product: { select: { name: true, slug: true, price: true } },
            cardKeys: { select: { content: true } },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, message: "订单不存在" },
        { status: 404 }
      );
    }

    // If a user is logged in, verify they own the order (when order has userId)
    if (session && order.userId && order.userId !== session.id) {
      return NextResponse.json(
        { success: false, message: "无权查看此订单" },
        { status: 403 }
      );
    }

    // Email verification for guest users querying card keys
    const { searchParams } = new URL(request.url);
    const verifyEmail = searchParams.get("email");
    // Guests MUST provide email and it must match the order email
    const emailVerified = verifyEmail &&
      order.email &&
      order.email.toLowerCase() === verifyEmail.toLowerCase();

    // Only include card keys when order is DELIVERED or PAID
    // Logged-in users see their own order keys; guests must verify email
    const includeCardKeys =
      (order.status === "DELIVERED" || order.status === "PAID") &&
      (session || emailVerified);

    const totalAmount = Number(order.totalAmount);
    const payAmount = Number(order.payAmount);
    const discount = Math.round((totalAmount - payAmount) * 100) / 100;

    const formatted = {
      id: order.id,
      orderNo: order.orderNo,
      status: order.status,
      email: order.email,
      paymentMethod: order.paymentMethod,
      totalAmount,
      payAmount,
      discount: discount > 0 ? discount : 0,
      createdAt: order.createdAt.toISOString(),
      expireAt: order.expireAt.toISOString(),
      paidAt: order.paidAt?.toISOString() || null,
      items: order.items.map((item) => ({
        name: item.product.name,
        slug: item.product.slug,
        price: Number(item.product.price),
        quantity: item.quantity,
      })),
      cardKeys: includeCardKeys
        ? order.items.flatMap((item) =>
            item.cardKeys.map((k) => safeDecryptCardKey(k.content))
          )
        : [],
    };

    return NextResponse.json({ success: true, order: formatted });
  } catch (error) {
    log.error({ err: error }, "Order detail API error");
    return NextResponse.json(
      { success: false, message: "服务器内部错误" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rl = apiLimiter(getClientIp(request));
    if (!rl.success) return rateLimitResponse(rl);

    const { id } = await params;
    const body = await request.json();
    const { action } = body;

    if (action !== "cancel") {
      return NextResponse.json(
        { success: false, message: "不支持的操作" },
        { status: 400 }
      );
    }

    const session = decodeSession(
      request.cookies.get("session")?.value || ""
    );

    const order = await db.order.findFirst({
      where: { orderNo: id },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, message: "订单不存在" },
        { status: 404 }
      );
    }

    // Verify ownership
    if (order.userId) {
      // Registered user order - must be the owner
      if (!session || session.id !== order.userId) {
        return NextResponse.json(
          { success: false, message: "无权操作此订单" },
          { status: 403 }
        );
      }
    } else {
      // Guest order - require logged-in admin, or reject
      const isAdmin = session && (session.role.toUpperCase() === "ADMIN" || session.role.toUpperCase() === "SUPER_ADMIN");
      if (!isAdmin) {
        return NextResponse.json(
          { success: false, message: "游客订单仅管理员可取消" },
          { status: 403 }
        );
      }
    }

    if (order.status !== "PENDING") {
      return NextResponse.json(
        { success: false, message: "只能取消待支付的订单" },
        { status: 400 }
      );
    }

    await db.order.update({
      where: { id: order.id },
      data: { status: "CANCELLED" },
    });

    log.info({ orderNo: id }, "Order cancelled by user");

    return NextResponse.json({
      success: true,
      message: "订单已取消",
    });
  } catch (error) {
    log.error({ err: error }, "Order cancel API error");
    return NextResponse.json(
      { success: false, message: "服务器内部错误" },
      { status: 500 }
    );
  }
}
