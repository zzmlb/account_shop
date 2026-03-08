import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { getAdminSession } from "@/lib/admin-auth";
import { createLogger } from "@/lib/logger";
import { createCouponSchema, updateCouponSchema, formatZodError } from "@/lib/validators";
import { apiLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
const log = createLogger("admin/coupons");

// GET - List all coupons
export async function GET(request: NextRequest) {
  try {
    const rl = apiLimiter(getClientIp(request));
    if (!rl.success) return rateLimitResponse(rl);

    const { session, error } = getAdminSession(request);
    if (!session) return error!;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status"); // active, expired, all

    const where: Record<string, unknown> = {};
    const now = new Date();

    if (status === "active") {
      where.isActive = true;
      where.expireAt = { gt: now };
    } else if (status === "expired") {
      where.OR = [
        { isActive: false },
        { expireAt: { lte: now } },
      ];
    }

    const coupons = await db.coupon.findMany({
      where,
      include: {
        _count: { select: { users: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = coupons.map((c) => ({
      id: c.id,
      code: c.code,
      type: c.type,
      value: Number(c.value),
      minAmount: c.minAmount ? Number(c.minAmount) : null,
      maxUses: c.maxUses,
      usedCount: c.usedCount,
      startAt: c.startAt.toISOString(),
      expireAt: c.expireAt.toISOString(),
      isActive: c.isActive,
      createdAt: c.createdAt.toISOString(),
      claimedCount: c._count.users,
    }));

    return NextResponse.json({ success: true, coupons: formatted });
  } catch (error) {
    log.error({ err: error }, "Admin coupons GET error");
    return NextResponse.json(
      { success: false, message: "服务器内部错误" },
      { status: 500 }
    );
  }
}

// POST - Create coupon
export async function POST(request: NextRequest) {
  try {
    const rl = apiLimiter(getClientIp(request));
    if (!rl.success) return rateLimitResponse(rl);

    const { session, error } = getAdminSession(request);
    if (!session) return error!;

    const body = await request.json();
    const parsed = createCouponSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: formatZodError(parsed.error) },
        { status: 400 }
      );
    }
    const { code, type, value, minAmount, maxUses, startAt, expireAt } = parsed.data;

    // Check if code already exists
    const existing = await db.coupon.findUnique({
      where: { code: code.toUpperCase() },
    });
    if (existing) {
      return NextResponse.json(
        { success: false, message: "优惠码已存在" },
        { status: 400 }
      );
    }

    let coupon;
    try {
      coupon = await db.coupon.create({
        data: {
          code: code.toUpperCase(),
          type,
          value,
          minAmount: minAmount ?? null,
          maxUses: maxUses ?? null,
          startAt: new Date(startAt),
          expireAt: new Date(expireAt),
          isActive: true,
        },
      });
    } catch (createErr: unknown) {
      // Handle unique constraint violation (race condition with duplicate code)
      if (typeof createErr === "object" && createErr !== null && "code" in createErr && (createErr as { code: string }).code === "P2002") {
        return NextResponse.json(
          { success: false, message: "优惠码已存在" },
          { status: 400 }
        );
      }
      throw createErr;
    }

    log.info(
      { adminId: session.id, couponId: coupon.id, code: coupon.code, type, value },
      "Admin created coupon"
    );

    return NextResponse.json({
      success: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        type: coupon.type,
        value: Number(coupon.value),
      },
      message: "优惠券创建成功",
    });
  } catch (error) {
    log.error({ err: error }, "Admin coupons POST error");
    return NextResponse.json(
      { success: false, message: "服务器内部错误" },
      { status: 500 }
    );
  }
}

// PUT - Update coupon
export async function PUT(request: NextRequest) {
  try {
    const rl = apiLimiter(getClientIp(request));
    if (!rl.success) return rateLimitResponse(rl);

    const { session, error } = getAdminSession(request);
    if (!session) return error!;

    const body = await request.json();
    const parsed = updateCouponSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: formatZodError(parsed.error) },
        { status: 400 }
      );
    }
    const { id, ...updates } = parsed.data;

    const existing = await db.coupon.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "优惠券不存在" },
        { status: 404 }
      );
    }

    const data: Record<string, unknown> = {};
    if (updates.isActive !== undefined) data.isActive = updates.isActive;
    if (updates.maxUses !== undefined) data.maxUses = updates.maxUses;
    if (updates.minAmount !== undefined) data.minAmount = updates.minAmount;
    if (updates.expireAt) data.expireAt = new Date(updates.expireAt);

    const updated = await db.coupon.update({
      where: { id },
      data,
    });

    log.info(
      { adminId: session.id, couponId: id, code: existing.code, fields: Object.keys(data) },
      "Admin updated coupon"
    );

    return NextResponse.json({
      success: true,
      coupon: {
        id: updated.id,
        code: updated.code,
        isActive: updated.isActive,
      },
      message: "优惠券更新成功",
    });
  } catch (error) {
    log.error({ err: error }, "Admin coupons PUT error");
    return NextResponse.json(
      { success: false, message: "服务器内部错误" },
      { status: 500 }
    );
  }
}

// DELETE - Delete coupon
export async function DELETE(request: NextRequest) {
  try {
    const rl = apiLimiter(getClientIp(request));
    if (!rl.success) return rateLimitResponse(rl);

    const { session, error } = getAdminSession(request);
    if (!session) return error!;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const mode = searchParams.get("mode"); // "expired" for batch delete expired

    // Batch delete expired coupons with 0 uses
    if (mode === "expired") {
      const now = new Date();
      const expired = await db.coupon.findMany({
        where: { expireAt: { lte: now }, usedCount: 0 },
        select: { id: true, code: true },
      });

      if (expired.length === 0) {
        return NextResponse.json({
          success: true,
          deleted: 0,
          message: "没有可清理的过期优惠券",
        });
      }

      const ids = expired.map((c) => c.id);
      await db.userCoupon.deleteMany({ where: { couponId: { in: ids } } });
      await db.coupon.deleteMany({ where: { id: { in: ids } } });

      log.info(
        { adminId: session.id, count: expired.length, codes: expired.map((c) => c.code) },
        "Admin batch deleted expired coupons"
      );

      return NextResponse.json({
        success: true,
        deleted: expired.length,
        message: `已清理 ${expired.length} 张过期优惠券`,
      });
    }

    if (!id) {
      return NextResponse.json(
        { success: false, message: "缺少优惠券ID" },
        { status: 400 }
      );
    }

    const existing = await db.coupon.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "优惠券不存在" },
        { status: 404 }
      );
    }

    if (existing.usedCount > 0) {
      return NextResponse.json(
        { success: false, message: "已使用的优惠券不能删除" },
        { status: 400 }
      );
    }

    // Delete associated UserCoupon records first
    await db.userCoupon.deleteMany({ where: { couponId: id } });
    await db.coupon.delete({ where: { id } });

    log.info(
      { adminId: session.id, couponId: id, code: existing.code },
      "Admin deleted coupon"
    );

    return NextResponse.json({
      success: true,
      message: "优惠券已删除",
    });
  } catch (error) {
    log.error({ err: error }, "Admin coupons DELETE error");
    return NextResponse.json(
      { success: false, message: "服务器内部错误" },
      { status: 500 }
    );
  }
}
