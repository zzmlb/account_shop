import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { createLogger } from "@/lib/logger";
import { apiLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { stripHtml } from "@/lib/sanitize";
import { getAdminSession } from "@/lib/admin-auth";

const log = createLogger("admin/reviews");

// GET - List all reviews with pagination
export async function GET(request: NextRequest) {
  try {
    const rl = apiLimiter(getClientIp(request));
    if (!rl.success) return rateLimitResponse(rl);

    const { session, error } = getAdminSession(request);
    if (!session) return error!;

    const { searchParams } = request.nextUrl;
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit")) || 20));
    const search = (searchParams.get("search") || "").slice(0, 200);
    const rating = searchParams.get("rating");
    const visible = searchParams.get("visible");

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { content: { contains: search, mode: "insensitive" } },
        { user: { username: { contains: search, mode: "insensitive" } } },
        { product: { name: { contains: search, mode: "insensitive" } } },
      ];
    }

    if (rating) {
      where.rating = Number(rating);
    }

    if (visible === "true") where.isVisible = true;
    else if (visible === "false") where.isVisible = false;

    const [reviews, total] = await Promise.all([
      db.review.findMany({
        where,
        include: {
          user: { select: { id: true, username: true } },
          product: { select: { id: true, name: true, slug: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.review.count({ where }),
    ]);

    const formatted = reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      content: r.content,
      adminReply: r.adminReply,
      repliedAt: r.repliedAt?.toISOString() ?? null,
      isVisible: r.isVisible,
      createdAt: r.createdAt.toISOString(),
      user: { id: r.user.id, username: r.user.username },
      product: { id: r.product.id, name: r.product.name, slug: r.product.slug },
    }));

    return NextResponse.json({
      success: true,
      reviews: formatted,
      total,
      page,
      limit,
    });
  } catch (error) {
    log.error({ err: error }, "Admin reviews GET error");
    return NextResponse.json(
      { success: false, message: "服务器内部错误" },
      { status: 500 }
    );
  }
}

// PUT - Toggle review visibility
export async function PUT(request: NextRequest) {
  try {
    const rl = apiLimiter(getClientIp(request));
    if (!rl.success) return rateLimitResponse(rl);

    const { session, error } = getAdminSession(request);
    if (!session) return error!;

    const { searchParams } = request.nextUrl;
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { success: false, message: "缺少评价ID" },
        { status: 400 }
      );
    }

    const review = await db.review.findUnique({ where: { id } });
    if (!review) {
      return NextResponse.json(
        { success: false, message: "评价不存在" },
        { status: 404 }
      );
    }

    const updated = await db.review.update({
      where: { id },
      data: { isVisible: !review.isVisible },
    });

    log.info(
      { reviewId: id, isVisible: updated.isVisible, adminId: session.id },
      "Review visibility toggled"
    );

    return NextResponse.json({
      success: true,
      message: updated.isVisible ? "评价已显示" : "评价已隐藏",
      isVisible: updated.isVisible,
    });
  } catch (error) {
    log.error({ err: error }, "Admin reviews PUT error");
    return NextResponse.json(
      { success: false, message: "服务器内部错误" },
      { status: 500 }
    );
  }
}

// PATCH - Reply to a review
export async function PATCH(request: NextRequest) {
  try {
    const rl = apiLimiter(getClientIp(request));
    if (!rl.success) return rateLimitResponse(rl);

    const { session, error } = getAdminSession(request);
    if (!session) return error!;

    const body = await request.json();
    const { id, reply } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, message: "缺少评价ID" },
        { status: 400 }
      );
    }

    if (typeof reply !== "string") {
      return NextResponse.json(
        { success: false, message: "回复内容格式错误" },
        { status: 400 }
      );
    }

    const review = await db.review.findUnique({ where: { id } });
    if (!review) {
      return NextResponse.json(
        { success: false, message: "评价不存在" },
        { status: 404 }
      );
    }

    const trimmedReply = stripHtml(reply);
    const updated = await db.review.update({
      where: { id },
      data: {
        adminReply: trimmedReply || null,
        repliedAt: trimmedReply ? new Date() : null,
      },
    });

    log.info(
      { reviewId: id, hasReply: !!trimmedReply, adminId: session.id },
      "Review reply updated"
    );

    return NextResponse.json({
      success: true,
      message: trimmedReply ? "回复已保存" : "回复已清除",
      adminReply: updated.adminReply,
      repliedAt: updated.repliedAt?.toISOString() ?? null,
    });
  } catch (error) {
    log.error({ err: error }, "Admin reviews PATCH error");
    return NextResponse.json(
      { success: false, message: "服务器内部错误" },
      { status: 500 }
    );
  }
}

// POST - Batch toggle visibility
export async function POST(request: NextRequest) {
  try {
    const rl = apiLimiter(getClientIp(request));
    if (!rl.success) return rateLimitResponse(rl);

    const { session, error } = getAdminSession(request);
    if (!session) return error!;

    const body = await request.json();
    const { ids, visible } = body as { ids: string[]; visible: boolean };

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ success: false, message: "请选择至少一条评价" }, { status: 400 });
    }
    if (ids.length > 100) {
      return NextResponse.json({ success: false, message: "单次批量操作最多100条" }, { status: 400 });
    }
    if (typeof visible !== "boolean") {
      return NextResponse.json({ success: false, message: "visible 参数必须为布尔值" }, { status: 400 });
    }

    const result = await db.review.updateMany({
      where: { id: { in: ids } },
      data: { isVisible: visible },
    });

    log.info({ adminId: session.id, ids, visible, affected: result.count }, "Batch review visibility update");

    return NextResponse.json({
      success: true,
      message: `已${visible ? "显示" : "隐藏"} ${result.count} 条评价`,
      affected: result.count,
    });
  } catch (error) {
    log.error({ err: error }, "Admin reviews POST batch error");
    return NextResponse.json({ success: false, message: "服务器内部错误" }, { status: 500 });
  }
}

// DELETE - Delete a review
export async function DELETE(request: NextRequest) {
  try {
    const rl = apiLimiter(getClientIp(request));
    if (!rl.success) return rateLimitResponse(rl);

    const { session, error } = getAdminSession(request);
    if (!session) return error!;

    const { searchParams } = request.nextUrl;
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { success: false, message: "缺少评价ID" },
        { status: 400 }
      );
    }

    const review = await db.review.findUnique({ where: { id } });
    if (!review) {
      return NextResponse.json(
        { success: false, message: "评价不存在" },
        { status: 404 }
      );
    }

    await db.review.delete({ where: { id } });

    log.info({ reviewId: id, adminId: session.id }, "Review deleted");

    return NextResponse.json({
      success: true,
      message: "评价已删除",
    });
  } catch (error) {
    log.error({ err: error }, "Admin reviews DELETE error");
    return NextResponse.json(
      { success: false, message: "服务器内部错误" },
      { status: 500 }
    );
  }
}
