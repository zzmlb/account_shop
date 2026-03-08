import { NextRequest, NextResponse } from "next/server";
import { decodeSession } from "@/lib/auth";
import { db } from "@/server/db";

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
    const { session, error } = getAdminSession(request);
    if (!session) return error!;

    // Calculate today's start (midnight in server timezone)
    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

    // ---------- Stats ----------

    // todaySales: sum of totalAmount from orders with status PAID or DELIVERED created today
    const todaySalesResult = await db.order.aggregate({
      _sum: { totalAmount: true },
      where: {
        status: { in: ["PAID", "DELIVERED"] },
        createdAt: { gte: todayStart },
      },
    });
    const todaySales = Number(todaySalesResult._sum.totalAmount ?? 0);

    // todayOrders: count of orders created today
    const todayOrders = await db.order.count({
      where: { createdAt: { gte: todayStart } },
    });

    // newUsers: count of users created today
    const newUsers = await db.user.count({
      where: { createdAt: { gte: todayStart } },
    });

    // lowStockCount: count of active products with stockCount < 10
    const lowStockCount = await db.product.count({
      where: {
        isActive: true,
        stockCount: { lt: 10 },
      },
    });

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
      },
    });

    const hotProducts = hotProductsRaw.map((p, idx) => ({
      rank: idx + 1,
      name: p.name,
      sales: p.soldCount,
      revenue: Number(p.price) * p.soldCount,
    }));

    // ---------- Sales Chart (last 7 days) ----------

    // Build array of last 7 days
    const salesChart: { date: string; amount: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - i
      );
      const dayEnd = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - i + 1
      );

      const dayResult = await db.order.aggregate({
        _sum: { totalAmount: true },
        where: {
          status: { in: ["PAID", "DELIVERED"] },
          createdAt: { gte: dayStart, lt: dayEnd },
        },
      });

      const mm = String(dayStart.getMonth() + 1).padStart(2, "0");
      const dd = String(dayStart.getDate()).padStart(2, "0");

      salesChart.push({
        date: `${mm}/${dd}`,
        amount: Number(dayResult._sum.totalAmount ?? 0),
      });
    }

    return NextResponse.json({
      success: true,
      stats: {
        todaySales,
        todayOrders,
        newUsers,
        lowStockCount,
      },
      recentOrders,
      hotProducts,
      salesChart,
    });
  } catch (error) {
    console.error("Admin stats GET error:", error);
    return NextResponse.json(
      { success: false, message: "服务器内部错误" },
      { status: 500 }
    );
  }
}
