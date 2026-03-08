import { NextRequest, NextResponse } from "next/server";
import { decodeSession } from "@/lib/auth";
import { db } from "@/server/db";
import { apiLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const rl = apiLimiter(getClientIp(request));
    if (!rl.success) return rateLimitResponse(rl);

    const session = decodeSession(
      request.cookies.get("session")?.value || ""
    );

    if (!session || (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN")) {
      return NextResponse.json(
        { success: false, message: "无权限" },
        { status: 403 }
      );
    }

    const todayStart = new Date(new Date().setHours(0, 0, 0, 0));

    // Fetch notification-worthy data in parallel
    const [
      pendingOrders,
      lowStockProducts,
      outOfStockProducts,
      todayOrders,
      todayRevenue,
      newUsers,
      expiringCoupons,
      pendingRefunds,
      pendingMessages,
    ] = await Promise.all([
      db.order.count({ where: { status: "PENDING" } }),
      db.product.count({
        where: { isActive: true, stockCount: { gt: 0, lte: 5 } },
      }),
      db.product.count({
        where: { isActive: true, stockCount: 0 },
      }),
      db.order.count({
        where: { createdAt: { gte: todayStart } },
      }),
      db.order.aggregate({
        where: {
          status: { in: ["PAID", "DELIVERED"] },
          createdAt: { gte: todayStart },
        },
        _sum: { payAmount: true },
      }),
      db.user.count({
        where: { createdAt: { gte: todayStart } },
      }),
      db.coupon.count({
        where: {
          isActive: true,
          expireAt: {
            gte: new Date(),
            lte: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          },
        },
      }),
      db.refundRequest.count({ where: { status: "PENDING" } }),
      db.contactMessage.count({ where: { status: "PENDING" } }),
    ]);

    // Stock reconciliation: check if stockCount matches actual AVAILABLE card keys
    const stockMismatch = await db.$queryRaw<Array<{ cnt: bigint }>>`
      SELECT COUNT(*) as cnt FROM products p
      WHERE p."isActive" = true
      AND p."stockCount" != (
        SELECT COUNT(*) FROM card_keys ck
        WHERE ck."productId" = p.id AND ck.status = 'AVAILABLE'
      )
    `;
    const mismatchCount = Number(stockMismatch[0]?.cnt ?? 0);

    const notifications = [];

    if (mismatchCount > 0) {
      notifications.push({
        id: "stock-mismatch",
        type: "alert",
        title: `${mismatchCount} 个商品库存数据不一致`,
        description: "商品的库存计数与实际可用卡密数量不匹配，请检查",
        href: "/admin/products",
      });
    }

    if (outOfStockProducts > 0) {
      notifications.push({
        id: "out-of-stock",
        type: "alert",
        title: `${outOfStockProducts} 个商品已售罄`,
        description: "这些商品无法被购买，请尽快补货",
        href: "/admin/card-keys",
      });
    }

    if (pendingOrders > 0) {
      notifications.push({
        id: "pending-orders",
        type: "warning",
        title: `${pendingOrders} 个待处理订单`,
        description: "有订单等待支付或发货",
        href: "/admin/orders",
      });
    }

    if (lowStockProducts > 0) {
      notifications.push({
        id: "low-stock",
        type: "warning",
        title: `${lowStockProducts} 个商品库存不足`,
        description: "库存低于5件，建议及时补充卡密",
        href: "/admin/card-keys",
      });
    }

    if (pendingRefunds > 0) {
      notifications.push({
        id: "pending-refunds",
        type: "alert",
        title: `${pendingRefunds} 个待处理退款申请`,
        description: "用户提交了退款申请，请尽快审核",
        href: "/admin/refunds",
      });
    }

    if (pendingMessages > 0) {
      notifications.push({
        id: "pending-messages",
        type: "info",
        title: `${pendingMessages} 条待处理留言`,
        description: "用户提交了留言反馈，请查看处理",
        href: "/admin/messages",
      });
    }

    if (expiringCoupons > 0) {
      notifications.push({
        id: "expiring-coupons",
        type: "warning",
        title: `${expiringCoupons} 张优惠券即将过期`,
        description: "3天内过期，可考虑续期或创建新券",
        href: "/admin/coupons",
      });
    }

    const revenue = Number(todayRevenue._sum.payAmount ?? 0);
    if (todayOrders > 0) {
      notifications.push({
        id: "today-orders",
        type: "info",
        title: `今日 ${todayOrders} 个新订单`,
        description: `今日营收 ¥${revenue.toFixed(2)}`,
        href: "/admin/orders",
      });
    }

    if (newUsers > 0) {
      notifications.push({
        id: "new-users",
        type: "info",
        title: `今日 ${newUsers} 个新注册用户`,
        description: "查看用户详情",
        href: "/admin/users",
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
