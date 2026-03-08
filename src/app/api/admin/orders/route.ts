import { NextRequest, NextResponse } from "next/server";
import { decodeSession } from "@/lib/auth";
import { db } from "@/server/db";
import { createLogger } from "@/lib/logger";

const log = createLogger("admin/orders");

function isAdmin(role: string): boolean {
  const upper = role.toUpperCase();
  return upper === "ADMIN" || upper === "SUPER_ADMIN";
}

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

  if (!isAdmin(session.role)) {
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

// GET - List all orders (admin only)
export async function GET(request: NextRequest) {
  try {
    const { session, error } = getAdminSession(request);
    if (!session) return error!;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.max(1, Math.min(50, parseInt(searchParams.get("pageSize") || "20", 10)));

    const where: Record<string, unknown> = {};

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { orderNo: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { user: { email: { contains: search, mode: "insensitive" } } },
        { user: { username: { contains: search, mode: "insensitive" } } },
      ];
    }

    const [orders, total] = await Promise.all([
      db.order.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
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
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.order.count({ where }),
    ]);

    const formatted = orders.map((o) => ({
      id: o.id,
      orderNo: o.orderNo,
      userId: o.userId,
      user: o.user
        ? {
            id: o.user.id,
            username: o.user.username,
            email: o.user.email,
          }
        : null,
      email: o.email,
      totalAmount: Number(o.totalAmount),
      payAmount: Number(o.payAmount),
      status: o.status,
      paymentMethod: o.paymentMethod,
      paymentId: o.paymentId,
      paidAt: o.paidAt?.toISOString() ?? null,
      expireAt: o.expireAt.toISOString(),
      couponId: o.couponId,
      createdAt: o.createdAt.toISOString(),
      updatedAt: o.updatedAt.toISOString(),
      items: o.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.product.name,
        productSlug: item.product.slug,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        cardKeys:
          o.status === "DELIVERED" || o.status === "REFUNDED"
            ? item.cardKeys.map((ck) => ({
                id: ck.id,
                content: ck.content,
                status: ck.status,
                soldAt: ck.soldAt?.toISOString() ?? null,
              }))
            : [],
      })),
    }));

    return NextResponse.json({
      success: true,
      orders: formatted,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    log.error({ err: error }, "Admin orders GET error");
    return NextResponse.json(
      { success: false, message: "服务器内部错误" },
      { status: 500 }
    );
  }
}

// PUT - Update order status (admin only)
export async function PUT(request: NextRequest) {
  try {
    const { session, error } = getAdminSession(request);
    if (!session) return error!;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, message: "缺少订单ID参数" },
        { status: 400 }
      );
    }

    const existing = await db.order.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: "订单不存在" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { status: newStatus } = body;

    if (!newStatus) {
      return NextResponse.json(
        { success: false, message: "缺少状态参数" },
        { status: 400 }
      );
    }

    const validStatuses = [
      "PENDING",
      "PAID",
      "DELIVERED",
      "CANCELLED",
      "REFUNDED",
      "EXPIRED",
    ];
    if (!validStatuses.includes(newStatus)) {
      return NextResponse.json(
        {
          success: false,
          message: `无效的订单状态，可选值: ${validStatuses.join(", ")}`,
        },
        { status: 400 }
      );
    }

    if (existing.status === newStatus) {
      return NextResponse.json(
        { success: false, message: "订单状态未改变" },
        { status: 400 }
      );
    }

    // If refunding, handle balance refund in a transaction
    if (newStatus === "REFUNDED") {
      if (!existing.userId) {
        // Guest order - just update the status, no balance to refund
        const updated = await db.order.update({
          where: { id },
          data: { status: newStatus },
          include: {
            user: {
              select: { id: true, username: true, email: true },
            },
            items: {
              include: {
                product: {
                  select: { id: true, name: true, slug: true },
                },
              },
            },
          },
        });

        return NextResponse.json({
          success: true,
          message: "订单已退款（游客订单，无余额退还）",
          order: formatOrder(updated),
        });
      }

      const refundAmount = Number(existing.payAmount);

      const updated = await db.$transaction(async (tx) => {
        // Update order status
        const updatedOrder = await tx.order.update({
          where: { id },
          data: { status: newStatus },
          include: {
            user: {
              select: { id: true, username: true, email: true, balance: true },
            },
            items: {
              include: {
                product: {
                  select: { id: true, name: true, slug: true },
                },
              },
            },
          },
        });

        // Refund balance to user
        await tx.user.update({
          where: { id: existing.userId! },
          data: {
            balance: {
              increment: refundAmount,
            },
          },
        });

        // Create balance log
        await tx.balanceLog.create({
          data: {
            userId: existing.userId!,
            amount: refundAmount,
            type: "REFUND",
            description: `订单 ${existing.orderNo} 退款`,
            relatedId: existing.id,
          },
        });

        return updatedOrder;
      });

      return NextResponse.json({
        success: true,
        message: `订单已退款，已退还 ${refundAmount} 至用户余额`,
        order: formatOrder(updated),
      });
    }

    // Normal status update (non-refund)
    const updated = await db.order.update({
      where: { id },
      data: { status: newStatus },
      include: {
        user: {
          select: { id: true, username: true, email: true },
        },
        items: {
          include: {
            product: {
              select: { id: true, name: true, slug: true },
            },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "订单状态已更新",
      order: formatOrder(updated),
    });
  } catch (error) {
    log.error({ err: error }, "Admin orders PUT error");
    return NextResponse.json(
      { success: false, message: "服务器内部错误" },
      { status: 500 }
    );
  }
}

// Helper to format an order for response
function formatOrder(o: {
  id: string;
  orderNo: string;
  userId: string | null;
  user: { id: string; username: string; email: string | null } | null;
  email: string | null;
  totalAmount: unknown;
  payAmount: unknown;
  status: string;
  paymentMethod: string | null;
  paymentId: string | null;
  paidAt: Date | null;
  expireAt: Date;
  couponId: string | null;
  createdAt: Date;
  updatedAt: Date;
  items: Array<{
    id: string;
    productId: string;
    product: { id: string; name: string; slug: string };
    quantity: number;
    unitPrice: unknown;
  }>;
}) {
  return {
    id: o.id,
    orderNo: o.orderNo,
    userId: o.userId,
    user: o.user
      ? {
          id: o.user.id,
          username: o.user.username,
          email: o.user.email,
        }
      : null,
    email: o.email,
    totalAmount: Number(o.totalAmount),
    payAmount: Number(o.payAmount),
    status: o.status,
    paymentMethod: o.paymentMethod,
    paymentId: o.paymentId,
    paidAt: o.paidAt?.toISOString() ?? null,
    expireAt: o.expireAt.toISOString(),
    couponId: o.couponId,
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
    items: o.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.product.name,
      productSlug: item.product.slug,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
    })),
  };
}
