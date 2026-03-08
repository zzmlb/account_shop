import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { createLogger } from "@/lib/logger";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
const log = createLogger("cron/cleanup-data");

const CRON_SECRET = process.env.CRON_SECRET;

// Rate limit: max 2 requests per 60 seconds
const cronLimiter = rateLimit({ max: 2, windowSeconds: 60 });

/**
 * POST /api/cron/cleanup-data
 *
 * Cleans up old data:
 * - Login logs older than 90 days
 * - Expired/used password reset tokens older than 7 days
 * - Read notifications older than 30 days
 *
 * Call this from a cron job (e.g. daily):
 *   curl -X POST http://localhost:3001/api/cron/cleanup-data \
 *     -H "Authorization: Bearer YOUR_CRON_SECRET"
 */
export async function POST(request: NextRequest) {
  // Verify cron secret (required)
  const auth = request.headers.get("authorization");
  if (!CRON_SECRET || auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 }
    );
  }

  // Rate limit even authenticated cron calls
  const rl = cronLimiter(getClientIp(request));
  if (!rl.success) return rateLimitResponse(rl);

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

    // Delete read notifications older than 30 days
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const deletedNotifications = await db.notification.deleteMany({
      where: { isRead: true, createdAt: { lt: thirtyDaysAgo } },
    });

    // Auto-deactivate expired coupons
    const deactivatedCoupons = await db.coupon.updateMany({
      where: {
        isActive: true,
        expireAt: { lt: now },
      },
      data: { isActive: false },
    });

    log.info(
      {
        loginLogs: deletedLogs.count,
        passwordResets: deletedTokens.count,
        notifications: deletedNotifications.count,
        deactivatedCoupons: deactivatedCoupons.count,
      },
      "Data cleanup completed"
    );

    return NextResponse.json({
      success: true,
      message: "Data cleanup completed",
      cleaned: {
        loginLogs: deletedLogs.count,
        passwordResets: deletedTokens.count,
        notifications: deletedNotifications.count,
        deactivatedCoupons: deactivatedCoupons.count,
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
