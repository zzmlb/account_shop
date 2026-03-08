import { NextRequest, NextResponse } from "next/server";
import { decodeSession } from "@/lib/auth";
import { db } from "@/server/db";
import { createLogger } from "@/lib/logger";
import { apiLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

const log = createLogger("balance-logs");

export async function GET(request: NextRequest) {
  try {
    const rl = apiLimiter(getClientIp(request));
    if (!rl.success) return rateLimitResponse(rl);

    const session = decodeSession(
      request.cookies.get("session")?.value || ""
    );

    if (!session) {
      return NextResponse.json(
        { success: false, message: "未登录" },
        { status: 401 }
      );
    }

    const [logs, user] = await Promise.all([
      db.balanceLog.findMany({
        where: { userId: session.id },
        orderBy: { createdAt: "desc" },
      }),
      db.user.findUnique({
        where: { id: session.id },
        select: { balance: true },
      }),
    ]);

    const formatted = logs.map((log) => ({
      id: log.id,
      amount: Number(log.amount),
      type: log.type,
      description: log.description,
      createdAt: log.createdAt.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      logs: formatted,
      balance: user ? Number(user.balance) : 0,
    });
  } catch (error) {
    log.error({ err: error }, "Balance logs API error");
    return NextResponse.json(
      { success: false, message: "服务器内部错误" },
      { status: 500 }
    );
  }
}
