import { NextRequest, NextResponse } from "next/server";
import { getUserSession } from "@/lib/auth";
import { db } from "@/server/db";
import { createLogger } from "@/lib/logger";
import { apiLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

const log = createLogger("reviews/my");

// GET - Fetch current user's reviews
export async function GET(request: NextRequest) {
  try {
    const rl = apiLimiter(getClientIp(request));
    if (!rl.success) return rateLimitResponse(rl);

    const { session, error } = getUserSession(request);
    if (error) return error;

    const reviews = await db.review.findMany({
      where: { userId: session.id },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            image: true,
            price: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    const formatted = reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      content: r.content,
      isVisible: r.isVisible,
      adminReply: r.adminReply,
      repliedAt: r.repliedAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
      product: {
        id: r.product.id,
        name: r.product.name,
        slug: r.product.slug,
        image: r.product.image,
        price: Number(r.product.price),
      },
    }));

    return NextResponse.json({ success: true, reviews: formatted });
  } catch (error) {
    log.error({ err: error }, "My reviews GET error");
    return NextResponse.json(
      { success: false, message: "服务器内部错误" },
      { status: 500 }
    );
  }
}
