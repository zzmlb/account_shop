import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { createLogger } from "@/lib/logger";
import { apiLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { maybeCleanupExpiredOrders } from "@/server/services/order-cleanup";

const log = createLogger("health");

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const rl = apiLimiter(getClientIp(request));
  if (!rl.success) return rateLimitResponse(rl);
  const checks: Record<string, string> = {};

  // Database check
  try {
    await db.$queryRaw`SELECT 1`;
    checks.database = "ok";
  } catch (error) {
    log.error({ err: error }, "Database health check failed");
    checks.database = "error";
  }

  const allOk = Object.values(checks).every((v) => v === "ok");

  // Trigger background expired order cleanup (self-throttled to every 5 min)
  if (allOk) maybeCleanupExpiredOrders();

  return NextResponse.json(
    {
      status: allOk ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      checks,
    },
    { status: allOk ? 200 : 503 }
  );
}
