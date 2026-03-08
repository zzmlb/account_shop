import { db } from "@/server/db";
import { createLogger } from "@/lib/logger";

const log = createLogger("order-cleanup");

// Run cleanup at most once every 5 minutes
let lastCleanup = 0;
const CLEANUP_INTERVAL = 5 * 60 * 1000;

/**
 * Lightweight expired order cleanup that runs in-process.
 * Call this from any frequently-hit route; it self-throttles to
 * run at most once every 5 minutes.
 * Fire-and-forget — never blocks the caller.
 */
export function maybeCleanupExpiredOrders() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;

  cleanupExpiredOrders().catch((err) => {
    log.warn({ err }, "Background order cleanup failed");
  });
}

async function cleanupExpiredOrders() {
  const now = new Date();

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
    take: 50, // Process at most 50 per run to avoid long-running queries
  });

  if (expiredOrders.length === 0) return;

  for (const order of expiredOrders) {
    await db.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: { status: "EXPIRED" },
      });

      // Batch release all locked card keys for this order
      const allKeyIds = order.items.flatMap((item) =>
        item.cardKeys.map((k) => k.id)
      );
      if (allKeyIds.length > 0) {
        await tx.cardKey.updateMany({
          where: { id: { in: allKeyIds }, status: "LOCKED" },
          data: { status: "AVAILABLE", orderId: null, soldAt: null },
        });
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

  log.info({ count: expiredOrders.length }, "Auto-cleaned expired orders");
}
