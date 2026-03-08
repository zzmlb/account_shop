import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { createLogger } from "@/lib/logger";
import { apiLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

const log = createLogger("coupons/validate");

export async function POST(request: NextRequest) {
  try {
    const rl = apiLimiter(getClientIp(request));
    if (!rl.success) return rateLimitResponse(rl);
    const body = await request.json();
    const { code, amount } = body as { code?: string; amount?: number };

    if (!code || typeof code !== "string") {
      return NextResponse.json(
        { success: false, message: "请提供优惠码" },
        { status: 400 }
      );
    }

    if (amount == null || typeof amount !== "number" || amount <= 0) {
      return NextResponse.json(
        { success: false, message: "订单金额无效" },
        { status: 400 }
      );
    }

    // Look up the coupon by code
    const coupon = await db.coupon.findUnique({
      where: { code: code.trim().toUpperCase() },
    });

    if (!coupon) {
      return NextResponse.json(
        { success: false, message: "无效的优惠券" },
        { status: 200 }
      );
    }

    // Check if coupon is active
    if (!coupon.isActive) {
      return NextResponse.json(
        { success: false, message: "该优惠券已停用" },
        { status: 200 }
      );
    }

    // Check if coupon has started
    const now = new Date();
    if (now < coupon.startAt) {
      return NextResponse.json(
        { success: false, message: "该优惠券尚未生效" },
        { status: 200 }
      );
    }

    // Check if coupon has expired
    if (now > coupon.expireAt) {
      return NextResponse.json(
        { success: false, message: "该优惠券已过期" },
        { status: 200 }
      );
    }

    // Check if max uses exceeded
    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
      return NextResponse.json(
        { success: false, message: "该优惠券已达到使用上限" },
        { status: 200 }
      );
    }

    // Check minimum amount requirement
    const minAmount = coupon.minAmount ? Number(coupon.minAmount) : 0;
    if (amount < minAmount) {
      return NextResponse.json(
        {
          success: false,
          message: `订单金额不满足最低要求 ¥${minAmount.toFixed(2)}`,
        },
        { status: 200 }
      );
    }

    // Calculate discount based on coupon type
    let discount: number;
    const couponValue = Number(coupon.value);

    if (coupon.type === "FIXED") {
      // Fixed discount: directly subtract the coupon value
      discount = Math.min(couponValue, amount);
    } else {
      // PERCENTAGE discount: amount * value / 100
      discount = Math.round(amount * couponValue) / 100;
      // Ensure discount does not exceed the order amount
      discount = Math.min(discount, amount);
    }

    return NextResponse.json({
      success: true,
      discount,
      couponId: coupon.id,
      message:
        coupon.type === "FIXED"
          ? `已减免 ¥${discount.toFixed(2)}`
          : `已享受 ${couponValue}% 折扣，减免 ¥${discount.toFixed(2)}`,
    });
  } catch (error) {
    log.error({ err: error }, "Coupon validate error");
    return NextResponse.json(
      { success: false, message: "服务器内部错误" },
      { status: 500 }
    );
  }
}
