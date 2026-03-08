import { NextRequest, NextResponse } from "next/server";
import { getUserSession } from "@/lib/auth";
import { db } from "@/server/db";
import { createLogger } from "@/lib/logger";
import { apiLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { claimCouponSchema, formatZodError } from "@/lib/validators";

const log = createLogger("coupons/claim");

// POST - Claim a coupon by code
export async function POST(request: NextRequest) {
  try {
    const rl = apiLimiter(getClientIp(request));
    if (!rl.success) return rateLimitResponse(rl);

    const { session, error } = getUserSession(request);
    if (error) return error;

    const body = await request.json();
    const parsed = claimCouponSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: formatZodError(parsed.error) },
        { status: 400 }
      );
    }

    const { code } = parsed.data;

    // Find the coupon
    const coupon = await db.coupon.findUnique({
      where: { code },
    });

    if (!coupon) {
      return NextResponse.json(
        { success: false, message: "优惠码不存在" },
        { status: 404 }
      );
    }

    const now = new Date();

    if (!coupon.isActive) {
      return NextResponse.json(
        { success: false, message: "该优惠券已停用" },
        { status: 400 }
      );
    }

    if (now < coupon.startAt) {
      return NextResponse.json(
        { success: false, message: "该优惠券活动尚未开始" },
        { status: 400 }
      );
    }

    if (now > coupon.expireAt) {
      return NextResponse.json(
        { success: false, message: "该优惠券已过期" },
        { status: 400 }
      );
    }

    // Check if max uses reached (total claims, not just used)
    if (coupon.maxUses !== null) {
      const claimCount = await db.userCoupon.count({
        where: { couponId: coupon.id },
      });
      if (claimCount >= coupon.maxUses) {
        return NextResponse.json(
          { success: false, message: "该优惠券已被领完" },
          { status: 400 }
        );
      }
    }

    // Check if user already claimed this coupon
    const existingClaim = await db.userCoupon.findFirst({
      where: {
        userId: session.id,
        couponId: coupon.id,
      },
    });

    if (existingClaim) {
      return NextResponse.json(
        { success: false, message: "您已领取过该优惠券" },
        { status: 400 }
      );
    }

    // Claim the coupon
    await db.userCoupon.create({
      data: {
        userId: session.id,
        couponId: coupon.id,
      },
    });

    log.info(
      { userId: session.id, couponId: coupon.id, code: coupon.code },
      "User claimed coupon"
    );

    return NextResponse.json({
      success: true,
      message: "优惠券领取成功",
      coupon: {
        code: coupon.code,
        type: coupon.type,
        value: Number(coupon.value),
        minAmount: coupon.minAmount ? Number(coupon.minAmount) : null,
        expireAt: coupon.expireAt.toISOString(),
      },
    });
  } catch (error) {
    log.error({ err: error }, "Coupon claim error");
    return NextResponse.json(
      { success: false, message: "服务器内部错误" },
      { status: 500 }
    );
  }
}
