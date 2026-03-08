import { NextRequest, NextResponse } from "next/server";
import { decodeSession } from "@/lib/auth";
import { db } from "@/server/db";
import { createLogger } from "@/lib/logger";
import { apiLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

const log = createLogger("admin/stats");

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

export async function GET(request: NextRequest) {
  try {
    const rl = apiLimiter(getClientIp(request));
    if (!rl.success) return rateLimitResponse(rl);

    const { session, error } = getAdminSession(request);
    if (!session) return error!;

    const { searchParams } = new URL(request.url);

    // Calculate today's start (midnight in server timezone)
    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

    // ---------- Stats ----------

    const yesterdayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - 1
    );

    // Parallel fetch for efficiency
    const [
      todaySalesResult,
      yesterdaySalesResult,
      todayOrders,
      yesterdayOrders,
      todayPaidOrders,
      yesterdayPaidOrders,
      newUsers,
      yesterdayUsers,
      lowStockCount,
      totalProducts,
      totalUsers,
      pendingRefunds,
      pendingMessages,
    ] = await Promise.all([
      db.order.aggregate({
        _sum: { payAmount: true },
        where: {
          status: { in: ["PAID", "DELIVERED"] },
          createdAt: { gte: todayStart },
        },
      }),
      db.order.aggregate({
        _sum: { payAmount: true },
        where: {
          status: { in: ["PAID", "DELIVERED"] },
          createdAt: { gte: yesterdayStart, lt: todayStart },
        },
      }),
      db.order.count({
        where: { createdAt: { gte: todayStart } },
      }),
      db.order.count({
        where: { createdAt: { gte: yesterdayStart, lt: todayStart } },
      }),
      db.order.count({
        where: {
          status: { in: ["PAID", "DELIVERED"] },
          createdAt: { gte: todayStart },
        },
      }),
      db.order.count({
        where: {
          status: { in: ["PAID", "DELIVERED"] },
          createdAt: { gte: yesterdayStart, lt: todayStart },
        },
      }),
      db.user.count({
        where: { createdAt: { gte: todayStart } },
      }),
      db.user.count({
        where: { createdAt: { gte: yesterdayStart, lt: todayStart } },
      }),
      db.product.count({
        where: { isActive: true, stockCount: { lt: 10 } },
      }),
      db.product.count({ where: { isActive: true } }),
      db.user.count(),
      db.refundRequest.count({ where: { status: "PENDING" } }),
      db.contactMessage.count({ where: { status: "PENDING" } }),
    ]);

    const todaySales = Number(todaySalesResult._sum.payAmount ?? 0);
    const yesterdaySales = Number(yesterdaySalesResult._sum.payAmount ?? 0);

    // Conversion rate: paid orders / total orders
    const todayConversion = todayOrders > 0 ? todayPaidOrders / todayOrders : 0;
    const yesterdayConversion = yesterdayOrders > 0 ? yesterdayPaidOrders / yesterdayOrders : 0;

    // ---------- Recent Orders ----------

    const recentOrdersRaw = await db.order.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        items: {
          include: {
            product: { select: { name: true } },
          },
        },
      },
    });

    const recentOrders = recentOrdersRaw.map((order) => ({
      id: order.orderNo,
      product: order.items.map((item) => item.product.name).join(", ") || "---",
      quantity: order.items.reduce((sum, item) => sum + item.quantity, 0),
      amount: Number(order.totalAmount),
      status: order.status,
      createdAt: order.createdAt.toISOString(),
    }));

    // ---------- Hot Products ----------

    const hotProductsRaw = await db.product.findMany({
      where: { isActive: true },
      orderBy: { soldCount: "desc" },
      take: 5,
      select: {
        id: true,
        name: true,
        price: true,
        soldCount: true,
        viewCount: true,
      },
    });

    const hotProducts = hotProductsRaw.map((p, idx) => ({
      rank: idx + 1,
      name: p.name,
      sales: p.soldCount,
      views: p.viewCount,
      revenue: Number(p.price) * p.soldCount,
    }));

    // ---------- Order Status Distribution ----------

    const statusDistribution = await db.order.groupBy({
      by: ["status"],
      _count: { id: true },
    });

    const ordersByStatus = statusDistribution.map((s) => ({
      status: s.status,
      count: s._count.id,
    }));

    // ---------- Total Revenue (all time) ----------

    const totalRevenueResult = await db.order.aggregate({
      _sum: { payAmount: true },
      where: { status: { in: ["PAID", "DELIVERED"] } },
    });
    const totalRevenue = Number(totalRevenueResult._sum.payAmount ?? 0);

    // ---------- Sales Chart (configurable period) ----------

    const periodParam = searchParams.get("period");
    const chartPeriod = [7, 14, 30].includes(Number(periodParam)) ? Number(periodParam) : 7;

    // Build array of days for the period
    const chartDays = Array.from({ length: chartPeriod }, (_, i) => {
      const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (chartPeriod - 1 - i));
      const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (chartPeriod - 1 - i) + 1);
      return { dayStart, dayEnd };
    });

    const chartResults = await Promise.all(
      chartDays.map(({ dayStart, dayEnd }) =>
        Promise.all([
          db.order.aggregate({
            _sum: { payAmount: true },
            where: {
              status: { in: ["PAID", "DELIVERED"] },
              createdAt: { gte: dayStart, lt: dayEnd },
            },
          }),
          db.order.count({
            where: { createdAt: { gte: dayStart, lt: dayEnd } },
          }),
        ])
      )
    );

    const salesChart = chartDays.map(({ dayStart }, idx) => {
      const mm = String(dayStart.getMonth() + 1).padStart(2, "0");
      const dd = String(dayStart.getDate()).padStart(2, "0");
      return {
        date: `${mm}/${dd}`,
        amount: Number(chartResults[idx][0]._sum.payAmount ?? 0),
        orders: chartResults[idx][1],
      };
    });

    return NextResponse.json({
      success: true,
      stats: {
        todaySales,
        todayOrders,
        newUsers,
        lowStockCount,
        // Comparison metrics
        yesterdaySales,
        yesterdayOrders,
        yesterdayUsers,
        todayConversion: Math.round(todayConversion * 10000) / 100, // percentage
        yesterdayConversion: Math.round(yesterdayConversion * 10000) / 100,
        // Totals
        totalProducts,
        totalUsers,
        totalRevenue,
        pendingRefunds,
        pendingMessages,
      },
      recentOrders,
      hotProducts,
      salesChart,
      chartPeriod,
      ordersByStatus,
    });
  } catch (error) {
    log.error({ err: error }, "Admin stats GET error");
    return NextResponse.json(
      { success: false, message: "服务器内部错误" },
      { status: 500 }
    );
  }
}
