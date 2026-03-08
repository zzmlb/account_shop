import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { createLogger } from "@/lib/logger";

const log = createLogger("health");

export const dynamic = "force-dynamic";

export async function GET() {
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

  return NextResponse.json(
    {
      status: allOk ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      checks,
    },
    { status: allOk ? 200 : 503 }
  );
}
