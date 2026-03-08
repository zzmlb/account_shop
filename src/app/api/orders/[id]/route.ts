import { NextRequest, NextResponse } from "next/server";
import { decodeSession } from "@/lib/auth";
import { db } from "@/server/db";
import { createLogger } from "@/lib/logger";

const log = createLogger("orders/detail");

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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

    // Only include card keys when order is DELIVERED or PAID
    const includeCardKeys =
      order.status === "DELIVERED" || order.status === "PAID";

    const formatted = {
      orderNo: order.orderNo,
      status: order.status,
      email: order.email,
      paymentMethod: order.paymentMethod,
      totalAmount: Number(order.totalAmount),
      createdAt: order.createdAt.toISOString(),
      items: order.items.map((item) => ({
        name: item.product.name,
        slug: item.product.slug,
        price: Number(item.product.price),
        quantity: item.quantity,
      })),
      cardKeys: includeCardKeys
        ? order.items.flatMap((item) =>
            item.cardKeys.map((k) => k.content)
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
