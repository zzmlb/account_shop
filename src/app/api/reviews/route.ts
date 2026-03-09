import { NextRequest, NextResponse } from "next/server";
import { getUserSession } from "@/lib/auth";
import { db } from "@/server/db";
import { apiLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { createLogger } from "@/lib/logger";
import { createReviewSchema, formatZodError } from "@/lib/validators";
import { stripHtml } from "@/lib/sanitize";

export const dynamic = "force-dynamic";
const log = createLogger("reviews");

/**
 * GET /api/reviews?productId=xxx&page=1&pageSize=10
 * Public — fetch reviews for a product
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const productId = searchParams.get("productId");

    if (!productId) {
      return NextResponse.json(
        { success: false, message: "缺少商品ID" },
        { status: 400 }
      );
    }

    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(searchParams.get("pageSize")) || 10));
    const ratingParam = searchParams.get("rating");
    const ratingFilter = ratingParam ? Math.min(5, Math.max(1, Number(ratingParam))) : null;
    const sortParam = searchParams.get("sort");

    const where = {
      productId,
      isVisible: true as const,
      ...(ratingFilter ? { rating: ratingFilter } : {}),
    };

    // Determine sort order
    let orderBy: Record<string, string>;
    switch (sortParam) {
      case "oldest":
        orderBy = { createdAt: "asc" };
        break;
      case "rating-high":
        orderBy = { rating: "desc" };
        break;
      case "rating-low":
        orderBy = { rating: "asc" };
        break;
      default:
        orderBy = { createdAt: "desc" };
    }

    const [reviews, total, stats] = await Promise.all([
      db.review.findMany({
        where,
        include: {
          user: { select: { id: true, username: true, avatar: true } },
        },
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.review.count({ where }),
      db.review.groupBy({
        by: ["rating"],
        where: { productId, isVisible: true },
        _count: true,
      }),
    ]);

    const ratingCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let totalRating = 0;
    for (const s of stats) {
      ratingCounts[s.rating] = s._count;
      totalRating += s.rating * s._count;
    }
    const avgRating = total > 0 ? Math.round((totalRating / total) * 10) / 10 : 0;

    const formatted = reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      content: r.content,
      username: r.user.username,
      avatar: r.user.avatar,
      adminReply: r.adminReply,
      repliedAt: r.repliedAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
    }));

    const response = NextResponse.json({
      success: true,
      reviews: formatted,
      stats: { avgRating, total, ratingCounts },
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
    response.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    return response;
  } catch (error) {
    log.error({ err: error }, "Reviews fetch error");
    return NextResponse.json(
      { success: false, message: "服务器内部错误" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/reviews
 * Authenticated — create a review (one per user per product)
 */
export async function POST(request: NextRequest) {
  try {
    const rl = apiLimiter(getClientIp(request));
    if (!rl.success) return rateLimitResponse(rl);

    const { session, error } = getUserSession(request);
    if (error) return error;

    const body = await request.json();
    const parsed = createReviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: formatZodError(parsed.error) },
        { status: 400 }
      );
    }

    const { productId, rating, content } = parsed.data;

    // Parallel validation: product exists, user purchased, no existing review
    const [product, hasPurchased, existing] = await Promise.all([
      db.product.findUnique({
        where: { id: productId },
        select: { id: true, name: true, isActive: true },
      }),
      db.orderItem.findFirst({
        where: {
          productId,
          order: { userId: session.id, status: "DELIVERED" },
        },
      }),
      db.review.findUnique({
        where: { userId_productId: { userId: session.id, productId } },
      }),
    ]);
    if (!product || !product.isActive) {
      return NextResponse.json(
        { success: false, message: "商品不存在或已下架" },
        { status: 400 }
      );
    }
    if (!hasPurchased) {
      return NextResponse.json(
        { success: false, message: "只有购买过该商品的用户才能评价" },
        { status: 403 }
      );
    }
    if (existing) {
      return NextResponse.json(
        { success: false, message: "您已经评价过该商品" },
        { status: 409 }
      );
    }

    const review = await db.review.create({
      data: {
        productId,
        userId: session.id,
        rating,
        content: stripHtml(content),
      },
      include: {
        user: { select: { username: true, avatar: true } },
      },
    });

    log.info({ reviewId: review.id, productId, userId: session.id, rating }, "Review created");

    return NextResponse.json({
      success: true,
      review: {
        id: review.id,
        rating: review.rating,
        content: review.content,
        username: review.user.username,
        avatar: review.user.avatar,
        createdAt: review.createdAt.toISOString(),
      },
    });
  } catch (error) {
    log.error({ err: error }, "Create review error");
    return NextResponse.json(
      { success: false, message: "服务器内部错误" },
      { status: 500 }
    );
  }
}
