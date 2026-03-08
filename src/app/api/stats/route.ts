import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { createLogger } from "@/lib/logger";
import { apiLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

const log = createLogger("stats");

function formatCount(count: number): string {
  if (count >= 10000) {
    const thousands = Math.floor(count / 1000);
    return `${thousands.toLocaleString("en-US")},000+`;
  }
  if (count >= 1000) {
    const thousands = Math.floor(count / 1000);
    return `${thousands.toLocaleString("en-US")},000+`;
  }
  if (count >= 100) {
    const hundreds = Math.floor(count / 100) * 100;
    return `${hundreds}+`;
  }
  return String(count);
}

export async function GET(request: NextRequest) {
  const rl = apiLimiter(getClientIp(request));
  if (!rl.success) return rateLimitResponse(rl);

  try {
    const [productsCount, usersCount, ordersCount, trending] =
      await Promise.all([
        db.product.count({ where: { isActive: true } }),
        db.user.count(),
        db.order.count({ where: { status: "DELIVERED" } }),
        db.product.findMany({
          where: { isActive: true, soldCount: { gt: 0 } },
          orderBy: { soldCount: "desc" },
          take: 6,
          select: { name: true, slug: true },
        }),
      ]);

    const res = NextResponse.json({
      success: true,
      stats: {
        products: formatCount(productsCount),
        users: formatCount(usersCount),
        orders: formatCount(ordersCount),
      },
      trending: trending.map((p) => p.name),
    });
    res.headers.set(
      "Cache-Control",
      "public, s-maxage=300, stale-while-revalidate=600"
    );
    return res;
  } catch (error) {
    log.error({ err: error }, "Public stats GET error");
    return NextResponse.json(
      { success: false, message: "服务器内部错误" },
      { status: 500 }
    );
  }
}
