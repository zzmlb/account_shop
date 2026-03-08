import { NextRequest, NextResponse } from "next/server";
import { getUserSession } from "@/lib/auth";
import { db } from "@/server/db";
import { createLogger } from "@/lib/logger";
import { apiLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
const log = createLogger("auth/login-history");

// GET - Get current user's recent login history
export async function GET(request: NextRequest) {
  try {
    const rl = apiLimiter(getClientIp(request));
    if (!rl.success) return rateLimitResponse(rl);

    const { session, error } = getUserSession(request);
    if (error) return error;

    const logs = await db.loginLog.findMany({
      where: { userId: session.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        success: true,
        ip: true,
        userAgent: true,
        reason: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      logs: logs.map((l) => ({
        id: l.id,
        success: l.success,
        ip: l.ip,
        userAgent: l.userAgent,
        reason: l.reason,
        createdAt: l.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    log.error({ err: error }, "获取登录历史失败");
    return NextResponse.json(
      { success: false, message: "服务器内部错误" },
      { status: 500 }
    );
  }
}
