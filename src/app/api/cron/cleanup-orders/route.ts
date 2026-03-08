import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { createLogger } from "@/lib/logger";

const log = createLogger("cron/cleanup-orders");

// Secret key to protect cron endpoint (set CRON_SECRET env var)
const CRON_SECRET = process.env.CRON_SECRET;

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
  // Verify cron secret if configured
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

        // Release any reserved card keys back to AVAILABLE
        for (const item of order.items) {
          if (item.cardKeys.length > 0) {
            const keyIds = item.cardKeys.map((k) => k.id);
            const result = await tx.cardKey.updateMany({
              where: {
                id: { in: keyIds },
                status: "LOCKED",
              },
              data: {
                status: "AVAILABLE",
                orderId: null,
                soldAt: null,
              },
            });
            totalKeysReleased += result.count;
          }
        }

        // Restore product stock counts
        for (const item of order.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stockCount: { increment: item.quantity } },
          });
        }
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
