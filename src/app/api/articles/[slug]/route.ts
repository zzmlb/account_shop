import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { createLogger } from "@/lib/logger";
import { apiLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

const log = createLogger("articles/detail");

// GET - Public article detail by slug
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const rl = apiLimiter(getClientIp(request));
    if (!rl.success) return rateLimitResponse(rl);

    const { slug } = await params;

    const article = await db.article.findUnique({
      where: { slug, isPublished: true },
    });

    if (!article) {
      return NextResponse.json(
        { success: false, message: "文章不存在" },
        { status: 404 }
      );
    }

    // Increment view count (fire-and-forget)
    db.article.update({
      where: { id: article.id },
      data: { viewCount: { increment: 1 } },
    }).catch((err) => {
      log.warn({ err, slug }, "Failed to increment article view count");
    });

    return NextResponse.json({
      success: true,
      article: {
        id: article.id,
        title: article.title,
        slug: article.slug,
        content: article.content,
        category: article.category,
        tags: article.tags,
        viewCount: article.viewCount,
        date: article.createdAt.toISOString().split("T")[0],
        updatedAt: article.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    log.error({ err: error }, "Article detail GET error");
    return NextResponse.json(
      { success: false, message: "获取文章详情失败" },
      { status: 500 }
    );
  }
}
