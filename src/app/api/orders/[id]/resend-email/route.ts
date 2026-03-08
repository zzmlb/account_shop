import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { db } from "@/server/db";
import { sendCardKeyDelivery } from "@/server/services/email";
import { apiLimiter, rateLimitResponse, getClientIp } from "@/lib/rate-limit";
import { createLogger } from "@/lib/logger";

const log = createLogger("api/orders/resend-email");

/**
 * POST /api/orders/[id]/resend-email
 *
 * Resend card key delivery email for a delivered order.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = apiLimiter(getClientIp(request));
  if (!rl.success) return rateLimitResponse(rl);

  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json(
      { success: false, message: "请先登录" },
      { status: 401 }
    );
  }

  const { id } = await params;

  try {
    const order = await db.order.findUnique({
      where: { id, userId: session.id },
      select: {
        orderNo: true,
        status: true,
        email: true,
        items: {
          select: {
            product: { select: { name: true } },
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

    if (order.status !== "DELIVERED") {
      return NextResponse.json(
        { success: false, message: "只有已发货的订单可以重发邮件" },
        { status: 400 }
      );
    }

    if (!order.email) {
      return NextResponse.json(
        { success: false, message: "该订单无关联邮箱" },
        { status: 400 }
      );
    }

    const items = order.items
      .filter((item) => item.cardKeys.length > 0)
      .map((item) => ({
        productName: item.product.name,
        cardKeys: item.cardKeys.map((k) => k.content),
      }));

    if (items.length === 0) {
      return NextResponse.json(
        { success: false, message: "该订单无可发送的卡密" },
        { status: 400 }
      );
    }

    const sent = await sendCardKeyDelivery({
      to: order.email,
      orderNo: order.orderNo,
      items,
    });

    if (sent) {
      log.info({ orderId: id, email: order.email }, "Card key email resent");
      return NextResponse.json({ success: true, message: "邮件已重新发送" });
    } else {
      return NextResponse.json(
        { success: false, message: "邮件发送失败，请稍后重试" },
        { status: 500 }
      );
    }
  } catch (error) {
    log.error({ err: error, orderId: id }, "Resend email error");
    return NextResponse.json(
      { success: false, message: "服务器错误" },
      { status: 500 }
    );
  }
}
