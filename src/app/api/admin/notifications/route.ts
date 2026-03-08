import { NextRequest, NextResponse } from "next/server";
import { decodeSession } from "@/lib/auth";
import { db } from "@/server/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = decodeSession(
      request.cookies.get("session")?.value || ""
    );

    if (!session || (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN")) {
      return NextResponse.json(
        { success: false, message: "无权限" },
        { status: 403 }
      );
    }

    // Fetch notification-worthy data in parallel
    const [pendingOrders, lowStockProducts, todayOrders] = await Promise.all([
      db.order.count({ where: { status: "PENDING" } }),
      db.product.count({
        where: { isActive: true, stockCount: { gt: 0, lte: 5 } },
      }),
      db.order.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
    ]);

    const notifications = [];

    if (pendingOrders > 0) {
      notifications.push({
        id: "pending-orders",
        type: "warning",
        title: `${pendingOrders} 个待处理订单`,
        description: "有订单等待支付或发货",
        href: "/admin/orders?status=PENDING",
      });
    }

    if (lowStockProducts > 0) {
      notifications.push({
        id: "low-stock",
        type: "alert",
        title: `${lowStockProducts} 个商品库存不足`,
        description: "库存低于5件，建议及时补充",
        href: "/admin/products",
      });
    }

    if (todayOrders > 0) {
      notifications.push({
        id: "today-orders",
        type: "info",
        title: `今日 ${todayOrders} 个新订单`,
        description: "查看今日订单详情",
        href: "/admin/orders",
      });
    }

    return NextResponse.json({
      success: true,
      count: notifications.length,
      notifications,
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "服务器内部错误" },
      { status: 500 }
    );
  }
}
