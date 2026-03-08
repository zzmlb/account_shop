import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { createLogger } from "@/lib/logger";
import { apiLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { maybeCleanupExpiredOrders } from "@/server/services/order-cleanup";

const log = createLogger("health");
const startTime = Date.now();

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const rl = apiLimiter(getClientIp(request));
  if (!rl.success) return rateLimitResponse(rl);

  const checks: Record<string, string> = {};
  const timings: Record<string, number> = {};

  // Database check with timing
  const dbStart = Date.now();
  try {
    await db.$queryRaw`SELECT 1`;
    checks.database = "ok";
    timings.database_ms = Date.now() - dbStart;
  } catch (error) {
    log.error({ err: error }, "Database health check failed");
    checks.database = "error";
    timings.database_ms = Date.now() - dbStart;
  }

  const allOk = Object.values(checks).every((v) => v === "ok");

  // Trigger background expired order cleanup (self-throttled to every 5 min)
  if (allOk) maybeCleanupExpiredOrders();

  // Memory usage
  const mem = process.memoryUsage();

  return NextResponse.json(
    {
      status: allOk ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      uptime_seconds: Math.floor((Date.now() - startTime) / 1000),
      checks,
      timings,
      memory: {
        rss_mb: Math.round(mem.rss / 1024 / 1024),
        heap_used_mb: Math.round(mem.heapUsed / 1024 / 1024),
        heap_total_mb: Math.round(mem.heapTotal / 1024 / 1024),
      },
      version: process.env.npm_package_version || "1.0.0",
    },
    { status: allOk ? 200 : 503 }
  );
}
