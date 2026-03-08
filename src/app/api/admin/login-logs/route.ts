import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { getAdminSession } from "@/lib/admin-auth";
import { createLogger } from "@/lib/logger";
import { apiLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { parsePagination, paginationMeta } from "@/lib/pagination";

const log = createLogger("admin/login-logs");

export async function GET(request: NextRequest) {
  try {
    const rl = apiLimiter(getClientIp(request));
    if (!rl.success) return rateLimitResponse(rl);

    const { session, error } = getAdminSession(request);
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.slice(0, 200);
    const status = searchParams.get("status"); // "success" | "failed"
    const { page, pageSize } = parsePagination(searchParams, { pageSize: 20, maxPageSize: 50 });

    const where: Record<string, unknown> = {};

    if (status === "success") where.success = true;
    else if (status === "failed") where.success = false;

    if (search) {
      where.OR = [
        { username: { contains: search, mode: "insensitive" } },
        { ip: { contains: search } },
        { user: { email: { contains: search, mode: "insensitive" } } },
      ];
    }

    // Today's stats
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [todayTotal, todayFailed, todayUniqueIPs] = await Promise.all([
      db.loginLog.count({ where: { createdAt: { gte: todayStart } } }),
      db.loginLog.count({ where: { createdAt: { gte: todayStart }, success: false } }),
      db.loginLog.findMany({
        where: { createdAt: { gte: todayStart }, ip: { not: null } },
        select: { ip: true },
        distinct: ["ip"],
      }),
    ]);

    const [logs, total] = await Promise.all([
      db.loginLog.findMany({
        where,
        include: {
          user: {
            select: { id: true, username: true, email: true, role: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.loginLog.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      stats: {
        todayTotal,
        todayFailed,
        todaySuccess: todayTotal - todayFailed,
        todayUniqueIPs: todayUniqueIPs.length,
      },
      logs: logs.map((l) => ({
        id: l.id,
        userId: l.userId,
        username: l.username,
        success: l.success,
        ip: l.ip,
        userAgent: l.userAgent,
        reason: l.reason,
        createdAt: l.createdAt.toISOString(),
        user: l.user
          ? {
              id: l.user.id,
              username: l.user.username,
              email: l.user.email,
              role: l.user.role,
            }
          : null,
      })),
      pagination: paginationMeta(total, page, pageSize),
    });
  } catch (error) {
    log.error({ err: error }, "获取登录日志失败");
    return NextResponse.json(
      { success: false, message: "服务器内部错误" },
      { status: 500 }
    );
  }
}
