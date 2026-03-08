import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { createLogger } from "@/lib/logger";
import { sendRefundNotification } from "@/server/services/email";
import { createNotification } from "@/server/services/notification";
import { apiLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { stripHtml } from "@/lib/sanitize";
import { getAdminSession } from "@/lib/admin-auth";
import { parsePagination, paginationMeta } from "@/lib/pagination";

const log = createLogger("admin/refunds");

// GET - List all refund requests
export async function GET(request: NextRequest) {
  try {
    const rl = apiLimiter(getClientIp(request));
    if (!rl.success) return rateLimitResponse(rl);

    const { session, error } = getAdminSession(request);
    if (!session) return error!;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search")?.slice(0, 200);
    const { page, pageSize } = parsePagination(searchParams, { pageSize: 20, maxPageSize: 50 });

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

    // Gather stats (always, regardless of filters)
    const [pendingCount, approvedStats, rejectedCount] = await Promise.all([
      db.refundRequest.count({ where: { status: "PENDING" } }),
      db.refundRequest.aggregate({
        where: { status: "APPROVED" },
        _sum: { amount: true },
        _count: true,
      }),
      db.refundRequest.count({ where: { status: "REJECTED" } }),
    ]);

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

    const totalProcessed = (approvedStats._count || 0) + rejectedCount;
    const approvalRate = totalProcessed > 0
      ? Math.round(((approvedStats._count || 0) / totalProcessed) * 100)
      : 0;

    return NextResponse.json({
      success: true,
      stats: {
        pendingCount,
        approvedCount: approvedStats._count || 0,
        approvedAmount: Number(approvedStats._sum.amount || 0),
        rejectedCount,
        approvalRate,
      },
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
      pagination: paginationMeta(total, page, pageSize),
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

    // Cap adminNote length
    if (adminNote && typeof adminNote === "string" && adminNote.length > 500) {
      return NextResponse.json(
        { success: false, message: "管理员备注不能超过500个字符" },
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
        // Re-validate status inside transaction to prevent double-approval race condition
        const current = await tx.refundRequest.findUnique({ where: { id } });
        if (!current || current.status !== "PENDING") {
          throw new Error("ALREADY_PROCESSED");
        }

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
        content: `您的订单 ${refund.order.orderNo} 退款申请已通过，¥${Number(refund.amount).toFixed(2)} 已退还至账户余额。${adminNote ? `管理员备注: ${stripHtml(adminNote)}` : ""}`,
        href: "/dashboard/refunds",
      });

      return NextResponse.json({
        success: true,
        message: `退款已批准，¥${Number(refund.amount).toFixed(2)} 已退还至用户余额`,
      });
    } else {
      // Reject (atomic: only update if still PENDING to prevent race with approve)
      const rejected = await db.refundRequest.updateMany({
        where: { id, status: "PENDING" },
        data: {
          status: "REJECTED",
          adminNote: adminNote ? stripHtml(adminNote) : null,
        },
      });
      if (rejected.count === 0) {
        return NextResponse.json(
          { success: false, message: "该退款申请已处理" },
          { status: 400 }
        );
      }

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
        content: `您的订单 ${refund.order.orderNo} 退款申请未通过。${adminNote ? `管理员备注: ${stripHtml(adminNote)}` : "如有疑问请联系客服。"}`,
        href: "/dashboard/refunds",
      });

      return NextResponse.json({
        success: true,
        message: "退款申请已拒绝",
      });
    }
  } catch (error) {
    if (error instanceof Error && error.message === "ALREADY_PROCESSED") {
      return NextResponse.json(
        { success: false, message: "该退款申请已处理" },
        { status: 400 }
      );
    }
    log.error({ err: error }, "处理退款申请失败");
    return NextResponse.json(
      { success: false, message: "服务器内部错误" },
      { status: 500 }
    );
  }
}

// PATCH - Batch reject refund requests (batch approve is too risky)
export async function PATCH(request: NextRequest) {
  try {
    const rl = apiLimiter(getClientIp(request));
    if (!rl.success) return rateLimitResponse(rl);

    const { session, error } = getAdminSession(request);
    if (!session) return error!;

    const body = await request.json();
    const { ids, action, adminNote: note } = body as {
      ids: string[];
      action: "reject";
      adminNote?: string;
    };

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, message: "请选择至少一个退款申请" },
        { status: 400 }
      );
    }

    if (ids.length > 50) {
      return NextResponse.json(
        { success: false, message: "单次批量操作最多50个" },
        { status: 400 }
      );
    }

    // Only allow batch reject for safety (approve needs individual review for balance refund)
    if (action !== "reject") {
      return NextResponse.json(
        { success: false, message: "批量操作仅支持拒绝（批量通过需逐一审核以确保退款金额正确）" },
        { status: 400 }
      );
    }

    const cleanNote = note ? stripHtml(note).slice(0, 500) : null;

    const result = await db.refundRequest.updateMany({
      where: {
        id: { in: ids },
        status: "PENDING",
      },
      data: {
        status: "REJECTED",
        adminNote: cleanNote,
      },
    });

    log.info(
      { adminId: session.id, ids, affected: result.count },
      "Admin batch rejected refund requests"
    );

    return NextResponse.json({
      success: true,
      message: `已拒绝 ${result.count} 个退款申请${ids.length !== result.count ? `（${ids.length - result.count} 个已跳过）` : ""}`,
      affected: result.count,
    });
  } catch (error) {
    log.error({ err: error }, "批量处理退款申请失败");
    return NextResponse.json(
      { success: false, message: "服务器内部错误" },
      { status: 500 }
    );
  }
}
