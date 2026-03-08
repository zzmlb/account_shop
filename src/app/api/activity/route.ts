import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { apiLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * GET - Returns recent anonymized order activity for social proof on the homepage.
 * No authentication required.
 */
export async function GET(request: NextRequest) {
  try {
    const rl = apiLimiter(getClientIp(request));
    if (!rl.success) return rateLimitResponse(rl);

    const recentOrders = await db.order.findMany({
      where: {
        status: { in: ["PAID", "DELIVERED"] },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        user: { select: { username: true } },
        items: {
          take: 1,
          include: {
            product: { select: { name: true, slug: true } },
          },
        },
      },
    });

    const activity = recentOrders
      .filter((o) => o.items.length > 0)
      .map((order) => {
        const username = order.user?.username || "游客";
        // Anonymize: show first char + asterisks
        const masked =
          username.length <= 1
            ? "***"
            : username.charAt(0) + "***" + (username.length > 3 ? username.charAt(username.length - 1) : "");
        return {
          id: order.id,
          user: masked,
          product: order.items[0].product.name,
          slug: order.items[0].product.slug,
          time: order.createdAt.toISOString(),
        };
      });

    return NextResponse.json({
      success: true,
      activity,
    });
  } catch {
    return NextResponse.json(
      { success: false, activity: [] },
      { status: 500 }
    );
  }
}
