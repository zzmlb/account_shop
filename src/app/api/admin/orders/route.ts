import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { parsePagination, paginationMeta } from "@/lib/pagination";
import { db } from "@/server/db";
import { createLogger } from "@/lib/logger";
import { sendCardKeyDelivery } from "@/server/services/email";
import { createNotification } from "@/server/services/notification";
import { decryptCardKey } from "@/lib/crypto";
import { apiLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { logAdminAction } from "@/lib/audit";

const log = createLogger("admin/orders");

// GET - List all orders (admin only)
export async function GET(request: NextRequest) {
  try {
    const rl = apiLimiter(getClientIp(request));
    if (!rl.success) return rateLimitResponse(rl);

    const { session, error } = getAdminSession(request);
    if (!session) return error!;

    const now = new Date();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search")?.slice(0, 200);
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const { page, pageSize } = parsePagination(searchParams, { pageSize: 20, maxPageSize: 50 });

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

    const paymentMethod = searchParams.get("paymentMethod");
    if (paymentMethod && ["balance", "alipay", "wechat", "usdt"].includes(paymentMethod)) {
      where.paymentMethod = paymentMethod;
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

    // Calculate today's stats
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

    const [orders, total, todayOrders, todayRevenue, pendingCount, paidCount] = await Promise.all([
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
      db.order.count({ where: { createdAt: { gte: todayStart } } }),
      db.order.aggregate({
        _sum: { payAmount: true },
        where: { status: { in: ["PAID", "DELIVERED"] }, createdAt: { gte: todayStart } },
      }),
      db.order.count({ where: { status: "PENDING" } }),
      db.order.count({ where: { status: "PAID" } }),
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
      pagination: paginationMeta(total, page, pageSize),
      stats: {
        todayOrders,
        todayRevenue: Number(todayRevenue._sum.payAmount ?? 0),
        pendingCount,
        paidCount,
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

        logAdminAction({
          adminId: session.id,
          action: "order.refund",
          target: existing.orderNo,
          detail: JSON.stringify({ from: existing.status, to: newStatus, guest: true }),
          ip: getClientIp(request),
        });

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

      logAdminAction({
        adminId: session.id,
        action: "order.refund",
        target: existing.orderNo,
        detail: JSON.stringify({ from: existing.status, to: newStatus, refundAmount }),
        ip: getClientIp(request),
      });

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

          const keyIds = keys.map((k) => k.id);
          await tx.cardKey.updateMany({
            where: { id: { in: keyIds } },
            data: {
              status: "SOLD",
              orderId: item.id,
              soldAt: new Date(),
            },
          });
          for (const key of keys) {
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

        logAdminAction({
          adminId: session.id,
          action: "order.deliver",
          target: existing.orderNo,
          detail: JSON.stringify({ keysAllocated: result.allocatedKeys.length }),
          ip: getClientIp(request),
        });

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

    logAdminAction({
      adminId: session.id,
      action: "order.status_change",
      target: existing.orderNo,
      detail: JSON.stringify({ from: existing.status, to: newStatus }),
      ip: getClientIp(request),
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

// PATCH - Batch update order statuses (admin only)
export async function PATCH(request: NextRequest) {
  try {
    const rl = apiLimiter(getClientIp(request));
    if (!rl.success) return rateLimitResponse(rl);

    const { session, error } = getAdminSession(request);
    if (!session) return error!;

    const body = await request.json();
    const { ids, status: newStatus } = body as { ids: string[]; status: string };

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, message: "请选择至少一个订单" },
        { status: 400 }
      );
    }

    if (ids.length > 100) {
      return NextResponse.json(
        { success: false, message: "单次批量操作最多100个订单" },
        { status: 400 }
      );
    }

    if (newStatus !== "CANCELLED" && newStatus !== "DELIVERED") {
      return NextResponse.json(
        { success: false, message: "批量操作仅支持取消或发货" },
        { status: 400 }
      );
    }

    if (newStatus === "CANCELLED") {
      // Only cancel orders that are PENDING or PAID
      const result = await db.order.updateMany({
        where: {
          id: { in: ids },
          status: { in: ["PENDING", "PAID"] },
        },
        data: { status: "CANCELLED" },
      });

      log.info(
        { adminId: session.id, ids, affected: result.count },
        "Admin batch cancelled orders"
      );

      return NextResponse.json({
        success: true,
        message: `已取消 ${result.count} 个订单（${ids.length - result.count} 个订单状态不符，已跳过）`,
        affected: result.count,
      });
    }

    // Batch deliver: process PAID orders individually for card key allocation
    const paidOrders = await db.order.findMany({
      where: { id: { in: ids }, status: "PAID" },
      include: {
        items: { include: { product: true } },
      },
    });

    let delivered = 0;
    let failed = 0;

    for (const order of paidOrders) {
      try {
        let allKeysAllocated = true;

        await db.$transaction(async (tx) => {
          for (const item of order.items) {
            const existingKeys = await tx.cardKey.count({
              where: { orderId: item.id, status: "SOLD" },
            });
            if (existingKeys >= item.quantity) continue;

            const needed = item.quantity - existingKeys;
            const keys = await tx.cardKey.findMany({
              where: { productId: item.productId, status: "AVAILABLE" },
              take: needed,
            });

            if (keys.length < needed) {
              allKeysAllocated = false;
              throw new Error("INSUFFICIENT_KEYS");
            }

            await tx.cardKey.updateMany({
              where: { id: { in: keys.map((k) => k.id) } },
              data: { status: "SOLD", orderId: item.id, soldAt: new Date() },
            });

            await tx.product.update({
              where: { id: item.productId },
              data: { stockCount: { decrement: needed }, soldCount: { increment: needed } },
            });
          }

          if (allKeysAllocated) {
            await tx.order.update({
              where: { id: order.id },
              data: { status: "DELIVERED" },
            });
          }
        });

        delivered++;

        // Send delivery email
        if (order.email) {
          const itemIds = order.items.map((i) => i.id);
          const allKeys = await db.cardKey.findMany({
            where: { orderId: { in: itemIds }, status: "SOLD" },
            select: { content: true, orderId: true },
          });
          const keysByProduct: Record<string, { productName: string; cardKeys: string[] }> = {};
          for (const item of order.items) {
            const itemKeys = allKeys.filter((k) => k.orderId === item.id);
            keysByProduct[item.productId] = {
              productName: item.product.name,
              cardKeys: itemKeys.map((k) => decryptCardKey(k.content)),
            };
          }
          sendCardKeyDelivery({
            to: order.email,
            orderNo: order.orderNo,
            items: Object.values(keysByProduct),
          }).catch((err) => {
            log.error({ err, orderNo: order.orderNo }, "Failed to send batch delivery email");
          });
        }

        // In-app notification
        if (order.userId) {
          createNotification({
            userId: order.userId,
            type: "ORDER",
            title: "订单已发货",
            content: `您的订单 ${order.orderNo} 已完成发货，请前往订单详情查看卡密。`,
            href: `/order/${order.orderNo}`,
          });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "";
        if (msg !== "INSUFFICIENT_KEYS") {
          log.error({ err, orderId: order.id }, "Batch deliver single order failed");
        }
        failed++;
      }
    }

    const skipped = ids.length - paidOrders.length;
    log.info(
      { adminId: session.id, ids, delivered, failed, skipped },
      "Admin batch delivered orders"
    );

    return NextResponse.json({
      success: true,
      message: `已发货 ${delivered} 个订单${failed > 0 ? `，${failed} 个发货失败（库存不足）` : ""}${skipped > 0 ? `，${skipped} 个状态不符已跳过` : ""}`,
      affected: delivered,
    });
  } catch (error) {
    log.error({ err: error }, "Admin orders PATCH error");
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
