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

    // ---------- Sales Chart (configurable period, single query) ----------

    const periodParam = searchParams.get("period");
    const chartPeriod = [7, 14, 30].includes(Number(periodParam)) ? Number(periodParam) : 7;

    const chartStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - chartPeriod + 1);

    const chartRaw = await db.$queryRaw<Array<{ day: Date; revenue: unknown; orders: bigint }>>`
      SELECT
        DATE("createdAt") as day,
        COALESCE(SUM(CASE WHEN status IN ('PAID', 'DELIVERED') THEN "payAmount" ELSE 0 END), 0) as revenue,
        COUNT(*) as orders
      FROM orders
      WHERE "createdAt" >= ${chartStart}
      GROUP BY DATE("createdAt")
      ORDER BY day ASC
    `;

    const chartMap = new Map(
      chartRaw.map((r) => {
        const d = new Date(r.day);
        const key = `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
        return [key, { amount: Number(r.revenue), orders: Number(r.orders) }];
      })
    );

    const salesChart = Array.from({ length: chartPeriod }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (chartPeriod - 1 - i));
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const key = `${mm}/${dd}`;
      const data = chartMap.get(key);
      return { date: key, amount: data?.amount ?? 0, orders: data?.orders ?? 0 };
    });

    // ---------- User Growth Chart ----------

    const userGrowthRaw = await db.$queryRaw<Array<{ day: Date; count: bigint }>>`
      SELECT
        DATE("createdAt") as day,
        COUNT(*) as count
      FROM users
      WHERE "createdAt" >= ${chartStart}
      GROUP BY DATE("createdAt")
      ORDER BY day ASC
    `;

    const userGrowthMap = new Map(
      userGrowthRaw.map((r) => {
        const d = new Date(r.day);
        const key = `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
        return [key, Number(r.count)];
      })
    );

    const userGrowthChart = Array.from({ length: chartPeriod }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (chartPeriod - 1 - i));
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const key = `${mm}/${dd}`;
      return { date: key, users: userGrowthMap.get(key) ?? 0 };
    });

    // ---------- Monthly Revenue Comparison ----------

    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [thisMonthRevenue, lastMonthRevenue, thisMonthOrders, lastMonthOrders] =
      await Promise.all([
        db.order.aggregate({
          _sum: { payAmount: true },
          where: {
            status: { in: ["PAID", "DELIVERED"] },
            createdAt: { gte: thisMonthStart },
          },
        }),
        db.order.aggregate({
          _sum: { payAmount: true },
          where: {
            status: { in: ["PAID", "DELIVERED"] },
            createdAt: { gte: lastMonthStart, lt: thisMonthStart },
          },
        }),
        db.order.count({
          where: { createdAt: { gte: thisMonthStart } },
        }),
        db.order.count({
          where: { createdAt: { gte: lastMonthStart, lt: thisMonthStart } },
        }),
      ]);

    const monthlyComparison = {
      thisMonthRevenue: Number(thisMonthRevenue._sum.payAmount ?? 0),
      lastMonthRevenue: Number(lastMonthRevenue._sum.payAmount ?? 0),
      thisMonthOrders,
      lastMonthOrders,
    };

    // ---------- Revenue by Payment Method ----------

    const paymentMethodStats = await db.order.groupBy({
      by: ["paymentMethod"],
      where: { status: { in: ["PAID", "DELIVERED"] } },
      _sum: { payAmount: true },
      _count: { id: true },
    });

    const revenueByMethod = paymentMethodStats
      .filter((m) => m.paymentMethod)
      .map((m) => ({
        method: m.paymentMethod,
        revenue: Number(m._sum.payAmount ?? 0),
        count: m._count.id,
      }));

    // ---------- Low Stock Products (top 8) ----------

    const lowStockProducts = await db.product.findMany({
      where: { isActive: true, stockCount: { lt: 10 } },
      orderBy: { stockCount: "asc" },
      take: 8,
      select: {
        id: true,
        name: true,
        slug: true,
        stockCount: true,
        soldCount: true,
        price: true,
      },
    });

    // ---------- Recent Login Activity (last 10) ----------

    const recentLoginsRaw = await db.loginLog.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        username: true,
        success: true,
        ip: true,
        createdAt: true,
      },
    });
    const recentLogins = recentLoginsRaw.map((l) => ({
      id: l.id,
      username: l.username,
      success: l.success,
      ip: l.ip,
      createdAt: l.createdAt.toISOString(),
    }));

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
      userGrowthChart,
      chartPeriod,
      ordersByStatus,
      revenueByMethod,
      monthlyComparison,
      recentLogins,
      lowStockProducts: lowStockProducts.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        stockCount: p.stockCount,
        soldCount: p.soldCount,
        price: Number(p.price),
      })),
    });
  } catch (error) {
    log.error({ err: error }, "Admin stats GET error");
    return NextResponse.json(
      { success: false, message: "服务器内部错误" },
      { status: 500 }
    );
  }
}
