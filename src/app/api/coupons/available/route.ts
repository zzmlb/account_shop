import { NextRequest, NextResponse } from "next/server";
import { decodeSession } from "@/lib/auth";
import { db } from "@/server/db";
import { createLogger } from "@/lib/logger";
import { apiLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

const log = createLogger("coupons/available");

// GET - List publicly available coupons that can be claimed
export async function GET(request: NextRequest) {
  try {
    const rl = apiLimiter(getClientIp(request));
    if (!rl.success) return rateLimitResponse(rl);

    const now = new Date();

    // Find active, non-expired coupons
    const coupons = await db.coupon.findMany({
      where: {
        isActive: true,
        startAt: { lte: now },
        expireAt: { gt: now },
      },
      include: {
        _count: { select: { users: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    // Filter out fully claimed coupons
    const available = coupons.filter((c) => {
      if (c.maxUses === null) return true;
      return c._count.users < c.maxUses;
    });

    // Check if user has already claimed any
    const session = decodeSession(
      request.cookies.get("session")?.value || ""
    );

    let claimedCouponIds: Set<string> = new Set();
    if (session) {
      const userCoupons = await db.userCoupon.findMany({
        where: {
          userId: session.id,
          couponId: { in: available.map((c) => c.id) },
        },
        select: { couponId: true },
      });
      claimedCouponIds = new Set(userCoupons.map((uc) => uc.couponId));
    }

    const formatted = available.map((c) => ({
      id: c.id,
      code: c.code,
      type: c.type,
      value: Number(c.value),
      minAmount: c.minAmount ? Number(c.minAmount) : null,
      maxUses: c.maxUses,
      claimedCount: c._count.users,
      startAt: c.startAt.toISOString(),
      expireAt: c.expireAt.toISOString(),
      isClaimed: claimedCouponIds.has(c.id),
    }));

    return NextResponse.json({ success: true, coupons: formatted });
  } catch (error) {
    log.error({ err: error }, "Available coupons GET error");
    return NextResponse.json(
      { success: false, message: "服务器内部错误" },
      { status: 500 }
    );
  }
}
