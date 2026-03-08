import { NextRequest, NextResponse } from "next/server";
import { getUserSession } from "@/lib/auth";
import { db } from "@/server/db";
import { createLogger } from "@/lib/logger";
import { apiLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
const log = createLogger("balance-logs");

export async function GET(request: NextRequest) {
  try {
    const rl = apiLimiter(getClientIp(request));
    if (!rl.success) return rateLimitResponse(rl);

    const { session, error } = getUserSession(request);
    if (error) return error;

    const { searchParams } = request.nextUrl;
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const pageSize = Math.min(500, Math.max(1, Number(searchParams.get("pageSize")) || 200));
    const typeFilter = searchParams.get("type");

    const validTypes = ["RECHARGE", "PURCHASE", "REFUND", "ADMIN_ADJUST"] as const;
    type BalanceType = (typeof validTypes)[number];
    const isValidType = (v: string): v is BalanceType => (validTypes as readonly string[]).includes(v);
    const where = {
      userId: session.id,
      ...(typeFilter && isValidType(typeFilter) ? { type: typeFilter as BalanceType } : {}),
    };

    const [logs, total, user] = await Promise.all([
      db.balanceLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.balanceLog.count({ where }),
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
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    log.error({ err: error }, "Balance logs API error");
    return NextResponse.json(
      { success: false, message: "服务器内部错误" },
      { status: 500 }
    );
  }
}
