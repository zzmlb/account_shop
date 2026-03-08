import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { db } from "@/server/db";
import { createLogger } from "@/lib/logger";
import { apiLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
const log = createLogger("admin/users/[id]");

// GET - Get user detail with orders, balance logs, login logs
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rl = apiLimiter(getClientIp(request));
    if (!rl.success) return rateLimitResponse(rl);

    const { session, error } = getAdminSession(request);
    if (!session) return error!;

    const { id } = await params;

    const user = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
        balance: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            orders: true,
            reviews: true,
            favorites: true,
            notifications: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "用户不存在" },
        { status: 404 }
      );
    }

    // Fetch recent orders
    const recentOrders = await db.order.findMany({
      where: { userId: id },
      select: {
        id: true,
        orderNo: true,
        totalAmount: true,
        payAmount: true,
        status: true,
        paymentMethod: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    // Fetch recent balance logs
    const recentBalanceLogs = await db.balanceLog.findMany({
      where: { userId: id },
      select: {
        id: true,
        amount: true,
        type: true,
        description: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    // Fetch recent login logs
    const recentLoginLogs = await db.loginLog.findMany({
      where: { userId: id },
      select: {
        id: true,
        ip: true,
        userAgent: true,
        success: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    // Calculate total spent
    const totalSpent = await db.order.aggregate({
      where: { userId: id, status: { in: ["PAID", "DELIVERED"] } },
      _sum: { payAmount: true },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        balance: Number(user.balance),
        role: user.role,
        status: user.status,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
        counts: {
          orders: user._count.orders,
          reviews: user._count.reviews,
          favorites: user._count.favorites,
          notifications: user._count.notifications,
        },
        totalSpent: Number(totalSpent._sum.payAmount || 0),
      },
      recentOrders: recentOrders.map((o) => ({
        id: o.id,
        orderNo: o.orderNo,
        totalAmount: Number(o.totalAmount),
        payAmount: Number(o.payAmount),
        status: o.status,
        paymentMethod: o.paymentMethod,
        createdAt: o.createdAt.toISOString(),
      })),
      recentBalanceLogs: recentBalanceLogs.map((l) => ({
        id: l.id,
        amount: Number(l.amount),
        type: l.type,
        description: l.description,
        createdAt: l.createdAt.toISOString(),
      })),
      recentLoginLogs: recentLoginLogs.map((l) => ({
        id: l.id,
        ip: l.ip,
        userAgent: l.userAgent,
        success: l.success,
        createdAt: l.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    log.error({ err: error }, "Admin user detail GET error");
    return NextResponse.json(
      { success: false, message: "服务器内部错误" },
      { status: 500 }
    );
  }
}
