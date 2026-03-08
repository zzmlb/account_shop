import { NextRequest, NextResponse } from "next/server";
import { decodeSession } from "@/lib/auth";
import { db } from "@/server/db";
import { createLogger } from "@/lib/logger";
import { sendCardKeyDelivery } from "@/server/services/email";
import { createNotification } from "@/server/services/notification";
import { decryptCardKey } from "@/lib/crypto";
import { apiLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

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
    const rl = apiLimiter(getClientIp(request));
    if (!rl.success) return rateLimitResponse(rl);

    const { session, error } = getAdminSession(request);
    if (!session) return error!;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.max(1, Math.min(50, parseInt(searchParams.get("pageSize") || "20", 10)));

    const where: Record<string, unknown> = {};

    const VALID_ORDER_STATUSES = ["PENDING", "PAID", "DELIVERED", "CANCELLED", "REFUNDED", "EXPIRED"];
    if (status) {
      if (!VALID_ORDER_STATUSES.includes(status)) {
        return NextResponse.json(
          { success: false, message: "无效的订单状态" },
          { status: 400 }
        );
      }
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

    if (dateFrom || dateTo) {
      const createdAt: Record<string, Date> = {};
      if (dateFrom) createdAt.gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setDate(end.getDate() + 1);
        createdAt.lt = end;
      }
      where.createdAt = createdAt;
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
    const rl = apiLimiter(getClientIp(request));
    if (!rl.success) return rateLimitResponse(rl);

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

    // If refunding, handle balance refund + return card keys in a transaction
    if (newStatus === "REFUNDED") {
      // Get order items with card keys for returning
      const orderWithItems = await db.order.findUnique({
        where: { id },
        include: {
          items: {
            include: {
              cardKeys: { where: { status: "SOLD" } },
            },
          },
        },
      });

      if (!existing.userId) {
        // Guest order - return card keys and update status, no balance to refund
        const updated = await db.$transaction(async (tx) => {
          // Return card keys to available
          if (orderWithItems) {
            for (const item of orderWithItems.items) {
              if (item.cardKeys.length > 0) {
                await tx.cardKey.updateMany({
                  where: { orderId: item.id, status: "SOLD" },
                  data: { status: "AVAILABLE", orderId: null, soldAt: null },
                });
                await tx.product.update({
                  where: { id: item.productId },
                  data: {
                    stockCount: { increment: item.cardKeys.length },
                    soldCount: { decrement: item.cardKeys.length },
                  },
                });
              }
            }
          }

          return tx.order.update({
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
        });

        log.info(
          { adminId: session.id, orderId: id, orderNo: existing.orderNo },
          "Admin refunded guest order with card key return"
        );

        return NextResponse.json({
          success: true,
          message: "订单已退款（游客订单，卡密已归还库存）",
          order: formatOrder(updated),
        });
      }

      const refundAmount = Number(existing.payAmount);

      const updated = await db.$transaction(async (tx) => {
        // Return card keys to available
        if (orderWithItems) {
          for (const item of orderWithItems.items) {
            if (item.cardKeys.length > 0) {
              await tx.cardKey.updateMany({
                where: { orderId: item.id, status: "SOLD" },
                data: { status: "AVAILABLE", orderId: null, soldAt: null },
              });
              await tx.product.update({
                where: { id: item.productId },
                data: {
                  stockCount: { increment: item.cardKeys.length },
                  soldCount: { decrement: item.cardKeys.length },
                },
              });
            }
          }
        }

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

      log.info(
        { adminId: session.id, orderId: id, orderNo: existing.orderNo, refundAmount },
        "Admin refunded order with card key return and balance refund"
      );

      // In-app notification
      createNotification({
        userId: existing.userId!,
        type: "BALANCE",
        title: "订单已退款",
        content: `您的订单 ${existing.orderNo} 已退款，¥${refundAmount.toFixed(2)} 已退还至账户余额。`,
        href: `/order/${existing.orderNo}`,
      });

      return NextResponse.json({
        success: true,
        message: `订单已退款，已退还 ¥${refundAmount.toFixed(2)} 至用户余额，卡密已归还库存`,
        order: formatOrder(updated),
      });
    }

    // Handle manual delivery: auto-allocate card keys for PAID orders
    if (newStatus === "DELIVERED" && existing.status === "PAID") {
      const orderWithItems = await db.order.findUnique({
        where: { id },
        include: {
          items: {
            include: { product: true },
          },
        },
      });

      if (!orderWithItems) {
        return NextResponse.json(
          { success: false, message: "订单不存在" },
          { status: 404 }
        );
      }

      // Use transaction for card key allocation
      const result = await db.$transaction(async (tx) => {
        let allKeysAllocated = true;
        const allocatedKeys: string[] = [];

        for (const item of orderWithItems.items) {
          // Check if item already has card keys
          const existingKeys = await tx.cardKey.count({
            where: { orderId: item.id, status: "SOLD" },
          });
          if (existingKeys >= item.quantity) continue;

          const needed = item.quantity - existingKeys;
          const keys = await tx.cardKey.findMany({
            where: {
              productId: item.productId,
              status: "AVAILABLE",
            },
            take: needed,
          });

          if (keys.length < needed) {
            allKeysAllocated = false;
            continue;
          }

          for (const key of keys) {
            await tx.cardKey.update({
              where: { id: key.id },
              data: {
                status: "SOLD",
                orderId: item.id,
                soldAt: new Date(),
              },
            });
            allocatedKeys.push(key.content);
          }

          await tx.product.update({
            where: { id: item.productId },
            data: {
              stockCount: { decrement: needed },
              soldCount: { increment: needed },
            },
          });
        }

        const updatedOrder = await tx.order.update({
          where: { id },
          data: { status: allKeysAllocated ? "DELIVERED" : "PAID" },
          include: {
            user: { select: { id: true, username: true, email: true } },
            items: {
              include: {
                product: { select: { id: true, name: true, slug: true } },
              },
            },
          },
        });

        return { updatedOrder, allKeysAllocated, allocatedKeys };
      });

      // Send card key delivery email
      if (result.allKeysAllocated && orderWithItems.email) {
        // Batch fetch all card keys for this order's items (avoids N+1)
        const itemIds = orderWithItems.items.map((i) => i.id);
        const allKeys = await db.cardKey.findMany({
          where: { orderId: { in: itemIds }, status: "SOLD" },
          select: { content: true, orderId: true },
        });
        const keysByProduct: Record<string, { productName: string; cardKeys: string[] }> = {};
        for (const item of orderWithItems.items) {
          const itemKeys = allKeys.filter((k) => k.orderId === item.id);
          keysByProduct[item.productId] = {
            productName: item.product.name,
            cardKeys: itemKeys.map((k) => decryptCardKey(k.content)),
          };
        }
        sendCardKeyDelivery({
          to: orderWithItems.email,
          orderNo: orderWithItems.orderNo,
          items: Object.values(keysByProduct),
        }).catch((err) => {
          log.error({ err, orderNo: orderWithItems.orderNo }, "Failed to send delivery email");
        });
      }

      if (result.allKeysAllocated) {
        log.info({ orderNo: existing.orderNo, keys: result.allocatedKeys.length }, "Admin manual delivery completed");

        // In-app notification for delivery
        if (existing.userId) {
          createNotification({
            userId: existing.userId,
            type: "ORDER",
            title: "订单已发货",
            content: `您的订单 ${existing.orderNo} 已完成发货，请前往订单详情查看卡密。`,
            href: `/order/${existing.orderNo}`,
          });
        }

        return NextResponse.json({
          success: true,
          message: `已发货，分配了 ${result.allocatedKeys.length} 个卡密`,
          order: formatOrder(result.updatedOrder),
        });
      } else {
        return NextResponse.json({
          success: false,
          message: "卡密库存不足，无法完成发货",
        }, { status: 400 });
      }
    }

    // Normal status update
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

    log.info(
      { adminId: session.id, orderId: id, orderNo: existing.orderNo, oldStatus: existing.status, newStatus },
      "Admin updated order status"
    );

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
