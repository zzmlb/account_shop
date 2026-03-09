import { NextRequest, NextResponse } from "next/server";
import { getUserSession } from "@/lib/auth";
import { db } from "@/server/db";
import { createLogger } from "@/lib/logger";
import { apiLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { stripHtml } from "@/lib/sanitize";
import { refundRequestSchema, formatZodError } from "@/lib/validators";

export const dynamic = "force-dynamic";
const log = createLogger("refunds");

// GET - List user's refund requests
export async function GET(request: NextRequest) {
  try {
    const rl = apiLimiter(getClientIp(request));
    if (!rl.success) return rateLimitResponse(rl);

    const { session, error } = getUserSession(request);
    if (error) return error;

    const { searchParams } = request.nextUrl;
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize")) || 50));

    const where = { userId: session.id };

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
              items: {
                include: {
                  product: { select: { name: true, slug: true } },
                },
              },
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
        // adminNote intentionally excluded — internal admin-only data
        rejectReason: r.status === "REJECTED" ? r.adminNote : undefined,
        amount: Number(r.amount),
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
        orderStatus: r.order.status,
        products: r.order.items.map((i) => i.product.name).join(", "),
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

// POST - Submit a refund request
export async function POST(request: NextRequest) {
  try {
    const rl = apiLimiter(getClientIp(request));
    if (!rl.success) return rateLimitResponse(rl);

    const { session, error: authError } = getUserSession(request);
    if (authError) return authError;

    const body = await request.json();
    const parsed = refundRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: formatZodError(parsed.error) },
        { status: 400 }
      );
    }

    const { orderId, reason } = parsed.data;

    // Find the order and verify ownership
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: { select: { afterSaleHours: true } },
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

    if (order.userId !== session.id) {
      return NextResponse.json(
        { success: false, message: "无权操作此订单" },
        { status: 403 }
      );
    }

    // Only DELIVERED orders can request refund
    if (order.status !== "DELIVERED") {
      return NextResponse.json(
        { success: false, message: "只有已发货的订单才能申请退款" },
        { status: 400 }
      );
    }

    // Check after-sale window (use max afterSaleHours from items)
    const maxAfterSaleHours = Math.max(
      ...order.items.map((i) => i.product.afterSaleHours)
    );
    // Use paidAt as the reference time for after-sale window (not updatedAt)
    const referenceTime = order.paidAt ?? order.updatedAt;
    const deliveredHoursAgo =
      (Date.now() - referenceTime.getTime()) / (1000 * 60 * 60);

    if (deliveredHoursAgo > maxAfterSaleHours) {
      return NextResponse.json(
        {
          success: false,
          message: `已超过售后时限（${maxAfterSaleHours}小时），无法申请退款`,
        },
        { status: 400 }
      );
    }

    // Check pending refund and recent rejection in parallel
    const [existing, recentRejection] = await Promise.all([
      db.refundRequest.findFirst({
        where: { orderId, status: "PENDING" },
      }),
      db.refundRequest.findFirst({
        where: {
          orderId,
          status: "REJECTED",
          updatedAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    if (existing) {
      return NextResponse.json(
        { success: false, message: "该订单已有待处理的退款申请" },
        { status: 400 }
      );
    }

    if (recentRejection) {
      return NextResponse.json(
        { success: false, message: "退款申请被拒绝后需等待24小时才能重新提交" },
        { status: 400 }
      );
    }

    const refund = await db.refundRequest.create({
      data: {
        orderId,
        userId: session.id,
        reason: stripHtml(reason),
        amount: order.payAmount,
      },
    });

    log.info(
      { refundId: refund.id, orderId, userId: session.id },
      "退款申请已提交"
    );

    return NextResponse.json({
      success: true,
      message: "退款申请已提交，请等待审核",
      refund: {
        id: refund.id,
        status: refund.status,
        amount: Number(refund.amount),
        createdAt: refund.createdAt.toISOString(),
      },
    });
  } catch (error) {
    log.error({ err: error }, "提交退款申请失败");
    return NextResponse.json(
      { success: false, message: "服务器内部错误" },
      { status: 500 }
    );
  }
}
