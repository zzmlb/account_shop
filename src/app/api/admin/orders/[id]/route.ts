import { NextRequest, NextResponse } from "next/server";
import { decodeSession } from "@/lib/auth";
import { db } from "@/server/db";
import { createLogger } from "@/lib/logger";

const log = createLogger("admin/orders/[id]");

function getAdminSession(request: NextRequest) {
  const session = decodeSession(
    request.cookies.get("session")?.value || ""
  );
  if (!session) {
    return {
      session: null,
      error: NextResponse.json(
        { success: false, message: "未登录" },
        { status: 401 }
      ),
    };
  }
  const role = session.role.toUpperCase();
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
    return {
      session: null,
      error: NextResponse.json(
        { success: false, message: "无管理员权限" },
        { status: 403 }
      ),
    };
  }
  return { session, error: null };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, error } = getAdminSession(request);
    if (!session) return error!;

    const { id } = await params;

    const order = await db.order.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            role: true,
            balance: true,
            createdAt: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                price: true,
                image: true,
              },
            },
            cardKeys: {
              select: {
                id: true,
                content: true,
                status: true,
                soldAt: true,
              },
            },
          },
        },
        refundRequests: {
          select: {
            id: true,
            reason: true,
            status: true,
            adminNote: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, message: "订单不存在" },
        { status: 404 }
      );
    }

    // Fetch coupon info separately since it's not a relation
    let couponInfo = null;
    if (order.couponId) {
      const coupon = await db.coupon.findUnique({
        where: { id: order.couponId },
        select: { id: true, code: true, type: true, value: true },
      });
      if (coupon) {
        couponInfo = {
          id: coupon.id,
          code: coupon.code,
          type: coupon.type,
          value: Number(coupon.value),
        };
      }
    }

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        orderNo: order.orderNo,
        userId: order.userId,
        user: order.user
          ? {
              id: order.user.id,
              username: order.user.username,
              email: order.user.email,
              role: order.user.role,
              balance: Number(order.user.balance),
              createdAt: order.user.createdAt.toISOString(),
            }
          : null,
        email: order.email,
        totalAmount: Number(order.totalAmount),
        payAmount: Number(order.payAmount),
        status: order.status,
        paymentMethod: order.paymentMethod,
        paymentId: order.paymentId,
        paidAt: order.paidAt?.toISOString() ?? null,
        expireAt: order.expireAt.toISOString(),
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
        coupon: couponInfo,
        items: order.items.map((item) => ({
          id: item.id,
          productId: item.productId,
          productName: item.product.name,
          productSlug: item.product.slug,
          productImage: item.product.image,
          productPrice: Number(item.product.price),
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          cardKeys: item.cardKeys.map((ck) => ({
            id: ck.id,
            content: ck.content,
            status: ck.status,
            soldAt: ck.soldAt?.toISOString() ?? null,
          })),
        })),
        refundRequests: order.refundRequests.map((r) => ({
          id: r.id,
          reason: r.reason,
          status: r.status,
          adminNote: r.adminNote,
          createdAt: r.createdAt.toISOString(),
          updatedAt: r.updatedAt.toISOString(),
        })),
      },
    });
  } catch (error) {
    log.error({ err: error }, "Admin order detail GET error");
    return NextResponse.json(
      { success: false, message: "服务器内部错误" },
      { status: 500 }
    );
  }
}
