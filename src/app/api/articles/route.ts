import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { createLogger } from "@/lib/logger";
import { apiLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

const log = createLogger("articles");

// GET - Public articles list (published only)
export async function GET(request: NextRequest) {
  try {
    const rl = apiLimiter(getClientIp(request));
    if (!rl.success) return rateLimitResponse(rl);

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const tag = searchParams.get("tag");
    const search = searchParams.get("search");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = searchParams.get("pageSize");
    const limit = Math.max(1, Math.min(50, parseInt(pageSize || searchParams.get("limit") || "20", 10)));

    const where: Record<string, unknown> = { isPublished: true };

    if (category) {
      where.category = category;
    }

    if (tag) {
      where.tags = { has: tag };
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { content: { contains: search, mode: "insensitive" } },
      ];
    }

    const [articles, total] = await Promise.all([
      db.article.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          title: true,
          slug: true,
          content: true,
          category: true,
          tags: true,
          viewCount: true,
          createdAt: true,
        },
      }),
      db.article.count({ where }),
    ]);

    const formatted = articles.map((a) => ({
      id: a.id,
      title: a.title,
      slug: a.slug,
      excerpt: a.content.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim().slice(0, 150),
      category: a.category,
      tags: a.tags,
      viewCount: a.viewCount,
      date: a.createdAt.toISOString().split("T")[0],
    }));

    const response = NextResponse.json({
      success: true,
      articles: formatted,
      total,
      page,
      limit,
    });
    response.headers.set(
      "Cache-Control",
      "public, s-maxage=120, stale-while-revalidate=600"
    );
    return response;
  } catch (error) {
    log.error({ err: error }, "Articles GET error");
    return NextResponse.json(
      { success: false, message: "获取文章列表失败" },
      { status: 500 }
    );
  }
}
