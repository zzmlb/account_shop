import { NextRequest, NextResponse } from "next/server";
import { decodeSession } from "@/lib/auth";
import { db } from "@/server/db";
import { createLogger } from "@/lib/logger";
import { sendRefundNotification } from "@/server/services/email";
import { createNotification } from "@/server/services/notification";
import { apiLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { stripHtml } from "@/lib/sanitize";

const log = createLogger("admin/refunds");

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

// GET - List all refund requests
export async function GET(request: NextRequest) {
  try {
    const rl = apiLimiter(getClientIp(request));
    if (!rl.success) return rateLimitResponse(rl);

    const { session, error } = getAdminSession(request);
    if (!session) return error!;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.max(
      1,
      Math.min(50, parseInt(searchParams.get("pageSize") || "20", 10))
    );

    const where: Record<string, unknown> = {};

    if (status && ["PENDING", "APPROVED", "REJECTED"].includes(status)) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { order: { orderNo: { contains: search, mode: "insensitive" } } },
        { user: { username: { contains: search, mode: "insensitive" } } },
        { user: { email: { contains: search, mode: "insensitive" } } },
        { reason: { contains: search, mode: "insensitive" } },
      ];
    }

    const [refunds, total] = await Promise.all([
      db.refundRequest.findMany({
        where,
        include: {
          order: {
            select: {
              orderNo: true,
              totalAmount: true,
              payAmount: true,
              status: true,
              paymentMethod: true,
              createdAt: true,
              items: {
                include: {
                  product: { select: { name: true } },
                },
              },
            },
          },
          user: {
            select: {
              id: true,
              username: true,
              email: true,
              balance: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.refundRequest.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      refunds: refunds.map((r) => ({
        id: r.id,
        orderId: r.orderId,
        orderNo: r.order.orderNo,
        reason: r.reason,
        status: r.status,
        adminNote: r.adminNote,
        amount: Number(r.amount),
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
        orderStatus: r.order.status,
        paymentMethod: r.order.paymentMethod,
        products: r.order.items.map((i) => i.product.name).join(", "),
        user: {
          id: r.user.id,
          username: r.user.username,
          email: r.user.email,
          balance: Number(r.user.balance),
        },
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    log.error({ err: error }, "获取退款列表失败");
    return NextResponse.json(
      { success: false, message: "服务器内部错误" },
      { status: 500 }
    );
  }
}

// PUT - Approve or reject a refund request
export async function PUT(request: NextRequest) {
  try {
    const rl = apiLimiter(getClientIp(request));
    if (!rl.success) return rateLimitResponse(rl);

    const { session, error } = getAdminSession(request);
    if (!session) return error!;

    const body = await request.json();
    const { id, action, adminNote } = body;

    if (!id || !action) {
      return NextResponse.json(
        { success: false, message: "缺少必要参数" },
        { status: 400 }
      );
    }

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { success: false, message: "无效操作，只能 approve 或 reject" },
        { status: 400 }
      );
    }

    const refund = await db.refundRequest.findUnique({
      where: { id },
      include: {
        order: {
          select: {
            id: true,
            orderNo: true,
            userId: true,
            payAmount: true,
            status: true,
            email: true,
            couponId: true,
          },
        },
        user: {
          select: { email: true },
        },
      },
    });

    if (!refund) {
      return NextResponse.json(
        { success: false, message: "退款申请不存在" },
        { status: 404 }
      );
    }

    if (refund.status !== "PENDING") {
      return NextResponse.json(
        { success: false, message: "该退款申请已处理" },
        { status: 400 }
      );
    }

    if (action === "approve") {
      // Approve: refund balance + update order status + update refund status
      await db.$transaction(async (tx) => {
        // Update refund request status
        await tx.refundRequest.update({
          where: { id },
          data: {
            status: "APPROVED",
            adminNote: adminNote ? stripHtml(adminNote) : null,
          },
        });

        // Update order status to REFUNDED
        await tx.order.update({
          where: { id: refund.orderId },
          data: { status: "REFUNDED" },
        });

        // Refund balance to user if there's a userId
        if (refund.order.userId) {
          const refundAmount = Number(refund.amount);

          await tx.user.update({
            where: { id: refund.order.userId },
            data: {
              balance: { increment: refundAmount },
            },
          });

          await tx.balanceLog.create({
            data: {
              userId: refund.order.userId,
              amount: refundAmount,
              type: "REFUND",
              description: `退款申请通过 - 订单 ${refund.order.orderNo}`,
              relatedId: refund.orderId,
            },
          });
        }

        // Decrement coupon usage count on refund (reverse the payment increment)
        if (refund.order.couponId) {
          await tx.coupon.update({
            where: { id: refund.order.couponId },
            data: { usedCount: { decrement: 1 } },
          });
        }
      });

      log.info(
        {
          refundId: id,
          orderNo: refund.order.orderNo,
          amount: Number(refund.amount),
          adminId: session.id,
        },
        "退款申请已批准"
      );

      // Send refund approval email
      const recipientEmail = refund.order.email || refund.user?.email;
      if (recipientEmail) {
        sendRefundNotification({
          to: recipientEmail,
          orderNo: refund.order.orderNo,
          amount: Number(refund.amount),
          status: "approved",
          adminNote: adminNote || undefined,
        }).catch((err) => {
          log.warn({ err, orderNo: refund.order.orderNo }, "Failed to send refund approval email");
        });
      }

      // In-app notification
      createNotification({
        userId: refund.userId,
        type: "REFUND",
        title: "退款申请已通过",
        content: `您的订单 ${refund.order.orderNo} 退款申请已通过，¥${Number(refund.amount).toFixed(2)} 已退还至账户余额。${adminNote ? `管理员备注: ${adminNote}` : ""}`,
        href: "/dashboard/refunds",
      });

      return NextResponse.json({
        success: true,
        message: `退款已批准，¥${Number(refund.amount).toFixed(2)} 已退还至用户余额`,
      });
    } else {
      // Reject
      await db.refundRequest.update({
        where: { id },
        data: {
          status: "REJECTED",
          adminNote: adminNote ? stripHtml(adminNote) : null,
        },
      });

      log.info(
        {
          refundId: id,
          orderNo: refund.order.orderNo,
          adminId: session.id,
        },
        "退款申请已拒绝"
      );

      // Send refund rejection email
      const recipientEmail = refund.order.email || refund.user?.email;
      if (recipientEmail) {
        sendRefundNotification({
          to: recipientEmail,
          orderNo: refund.order.orderNo,
          amount: Number(refund.amount),
          status: "rejected",
          adminNote: adminNote || undefined,
        }).catch((err) => {
          log.warn({ err, orderNo: refund.order.orderNo }, "Failed to send refund rejection email");
        });
      }

      // In-app notification
      createNotification({
        userId: refund.userId,
        type: "REFUND",
        title: "退款申请被拒绝",
        content: `您的订单 ${refund.order.orderNo} 退款申请未通过。${adminNote ? `管理员备注: ${adminNote}` : "如有疑问请联系客服。"}`,
        href: "/dashboard/refunds",
      });

      return NextResponse.json({
        success: true,
        message: "退款申请已拒绝",
      });
    }
  } catch (error) {
    log.error({ err: error }, "处理退款申请失败");
    return NextResponse.json(
      { success: false, message: "服务器内部错误" },
      { status: 500 }
    );
  }
}
