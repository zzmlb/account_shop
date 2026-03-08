import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { createLogger } from "@/lib/logger";

const log = createLogger("cron/cleanup-data");

const CRON_SECRET = process.env.CRON_SECRET;

/**
 * POST /api/cron/cleanup-data
 *
 * Cleans up old data:
 * - Login logs older than 90 days
 * - Expired/used password reset tokens older than 7 days
 *
 * Call this from a cron job (e.g. daily):
 *   curl -X POST http://localhost:3001/api/cron/cleanup-data \
 *     -H "Authorization: Bearer YOUR_CRON_SECRET"
 */
export async function POST(request: NextRequest) {
  if (CRON_SECRET) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }
  }

  try {
    const now = new Date();

    // Delete login logs older than 90 days
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const deletedLogs = await db.loginLog.deleteMany({
      where: { createdAt: { lt: ninetyDaysAgo } },
    });

    // Delete expired/used password reset tokens older than 7 days
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const deletedTokens = await db.passwordReset.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: sevenDaysAgo } },
          { usedAt: { not: null }, createdAt: { lt: sevenDaysAgo } },
        ],
      },
    });

    log.info(
      {
        loginLogs: deletedLogs.count,
        passwordResets: deletedTokens.count,
      },
      "Data cleanup completed"
    );

    return NextResponse.json({
      success: true,
      message: "Data cleanup completed",
      cleaned: {
        loginLogs: deletedLogs.count,
        passwordResets: deletedTokens.count,
      },
    });
  } catch (error) {
    log.error({ err: error }, "Cleanup data cron error");
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
