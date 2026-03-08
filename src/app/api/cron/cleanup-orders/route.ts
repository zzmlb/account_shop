import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { createLogger } from "@/lib/logger";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

const log = createLogger("cron/cleanup-orders");

// Secret key to protect cron endpoint (set CRON_SECRET env var)
const CRON_SECRET = process.env.CRON_SECRET;

// Rate limit: max 2 requests per 60 seconds
const cronLimiter = rateLimit({ max: 2, windowSeconds: 60 });

/**
 * POST /api/cron/cleanup-orders
 *
 * Finds all PENDING orders past their expireAt, marks them EXPIRED,
 * and releases any reserved card keys back to AVAILABLE.
 *
 * Call this from a cron job (e.g. every 5 minutes):
 *   curl -X POST http://localhost:3001/api/cron/cleanup-orders \
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

    // Find expired PENDING orders
    const expiredOrders = await db.order.findMany({
      where: {
        status: "PENDING",
        expireAt: { lt: now },
      },
      include: {
        items: {
          include: {
            cardKeys: { select: { id: true } },
          },
        },
      },
    });

    if (expiredOrders.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No expired orders found",
        cleaned: 0,
      });
    }

    let totalKeysReleased = 0;

    // Process each expired order in a transaction
    for (const order of expiredOrders) {
      await db.$transaction(async (tx) => {
        // Mark order as EXPIRED
        await tx.order.update({
          where: { id: order.id },
          data: { status: "EXPIRED" },
        });

        // Batch release all locked card keys for this order
        const allKeyIds = order.items.flatMap((item) =>
          item.cardKeys.map((k) => k.id)
        );
        if (allKeyIds.length > 0) {
          const result = await tx.cardKey.updateMany({
            where: { id: { in: allKeyIds }, status: "LOCKED" },
            data: { status: "AVAILABLE", orderId: null, soldAt: null },
          });
          totalKeysReleased += result.count;
        }

        // Aggregate stock increments by product to minimize updates
        const stockMap = new Map<string, number>();
        for (const item of order.items) {
          stockMap.set(item.productId, (stockMap.get(item.productId) ?? 0) + item.quantity);
        }
        await Promise.all(
          Array.from(stockMap).map(([productId, qty]) =>
            tx.product.update({
              where: { id: productId },
              data: { stockCount: { increment: qty } },
            })
          )
        );
      });
    }

    log.info(
      { count: expiredOrders.length, keysReleased: totalKeysReleased },
      "Expired orders cleaned up"
    );

    return NextResponse.json({
      success: true,
      message: `Cleaned ${expiredOrders.length} expired orders`,
      cleaned: expiredOrders.length,
      keysReleased: totalKeysReleased,
    });
  } catch (error) {
    log.error({ err: error }, "Cleanup orders cron error");
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
