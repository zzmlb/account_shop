import { NextRequest, NextResponse } from "next/server";
import { getUserSession } from "@/lib/auth";
import { db } from "@/server/db";
import { createLogger } from "@/lib/logger";
import { apiLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
const log = createLogger("coupons");

export async function GET(request: NextRequest) {
  try {
    const rl = apiLimiter(getClientIp(request));
    if (!rl.success) return rateLimitResponse(rl);

    const { session, error } = getUserSession(request);
    if (error) return error;

    // Limit to 100 coupons max to prevent unbounded queries
    const userCoupons = await db.userCoupon.findMany({
      where: { userId: session.id },
      include: {
        coupon: true,
      },
      orderBy: { coupon: { expireAt: "desc" } },
      take: 100,
    });

    const formatted = userCoupons.map((uc) => ({
      id: uc.id,
      couponId: uc.couponId,
      name: uc.coupon.code,
      code: uc.coupon.code,
      type: uc.coupon.type,
      value: Number(uc.coupon.value),
      minAmount: uc.coupon.minAmount ? Number(uc.coupon.minAmount) : null,
      startDate: uc.coupon.startAt.toISOString(),
      endDate: uc.coupon.expireAt.toISOString(),
      isUsed: uc.usedAt !== null,
      usedAt: uc.usedAt?.toISOString() ?? null,
    }));

    return NextResponse.json({ success: true, coupons: formatted });
  } catch (error) {
    log.error({ err: error }, "Coupons GET error");
    return NextResponse.json(
      { success: false, message: "服务器内部错误" },
      { status: 500 }
    );
  }
}
