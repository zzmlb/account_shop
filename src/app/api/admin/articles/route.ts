import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { getAdminSession } from "@/lib/admin-auth";
import { parsePagination } from "@/lib/pagination";
import { createLogger } from "@/lib/logger";
import { createArticleSchema, updateArticleSchema, formatZodError } from "@/lib/validators";
import { apiLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { sanitizeHtml } from "@/lib/sanitize";
import { slugify } from "@/lib/utils";

const log = createLogger("admin/articles");

// GET - List articles with pagination, search, and filters
export async function GET(request: NextRequest) {
  try {
    const rl = apiLimiter(getClientIp(request));
    if (!rl.success) return rateLimitResponse(rl);

    const { session, error } = getAdminSession(request);
    if (!session) return error!;

    const { searchParams } = new URL(request.url);
    const { page, pageSize: limit } = parsePagination(searchParams, { pageSize: 20, maxPageSize: 100 });
    const search = searchParams.get("search")?.slice(0, 100);
    const category = searchParams.get("category")?.slice(0, 50);
    const isPublished = searchParams.get("isPublished");

    const where: Record<string, unknown> = {};

    if (search) {
      where.title = { contains: search, mode: "insensitive" };
    }

    if (category) {
      where.category = category;
    }

    if (isPublished !== null && isPublished !== undefined && isPublished !== "") {
      where.isPublished = isPublished === "true";
    }

    const [articles, total] = await Promise.all([
      db.article.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.article.count({ where }),
    ]);

    const formatted = articles.map((a) => ({
      id: a.id,
      title: a.title,
      slug: a.slug,
      content: a.content,
      category: a.category,
      tags: a.tags,
      isPublished: a.isPublished,
      viewCount: a.viewCount,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      articles: formatted,
      total,
      page,
      limit,
    });
  } catch (error) {
    log.error({ err: error }, "Admin articles GET error");
    return NextResponse.json(
      { success: false, message: "服务器内部错误" },
      { status: 500 }
    );
  }
}

// POST - Create article
export async function POST(request: NextRequest) {
  try {
    const rl = apiLimiter(getClientIp(request));
    if (!rl.success) return rateLimitResponse(rl);

    const { session, error } = getAdminSession(request);
    if (!session) return error!;

    const body = await request.json();
    const parsed = createArticleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: formatZodError(parsed.error) },
        { status: 400 }
      );
    }
    const { title, slug, content, category, isPublished, tags } = parsed.data;

    // Generate slug from title if not provided
    const articleSlug = slug || slugify(title) || `article-${Date.now()}`;

    // Check slug uniqueness
    const existing = await db.article.findUnique({
      where: { slug: articleSlug },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, message: `slug 已存在: ${articleSlug}` },
        { status: 409 }
      );
    }

    const article = await db.article.create({
      data: {
        title,
        slug: articleSlug,
        content: sanitizeHtml(content),
        category,
        tags: tags ?? [],
        isPublished: isPublished ?? false,
      },
    });

    log.info(
      { adminId: session.id, articleId: article.id, title, slug: articleSlug },
      "Admin created article"
    );

    return NextResponse.json({
      success: true,
      article: {
        id: article.id,
        title: article.title,
        slug: article.slug,
        content: article.content,
        category: article.category,
        tags: article.tags,
        isPublished: article.isPublished,
        viewCount: article.viewCount,
        createdAt: article.createdAt.toISOString(),
        updatedAt: article.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    log.error({ err: error }, "Admin articles POST error");
    return NextResponse.json(
      { success: false, message: "服务器内部错误" },
      { status: 500 }
    );
  }
}

// PUT - Update article
export async function PUT(request: NextRequest) {
  try {
    const rl = apiLimiter(getClientIp(request));
    if (!rl.success) return rateLimitResponse(rl);

    const { session, error } = getAdminSession(request);
    if (!session) return error!;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, message: "缺少文章ID参数" },
        { status: 400 }
      );
    }

    const existing = await db.article.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "文章不存在" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const parsed = updateArticleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: formatZodError(parsed.error) },
        { status: 400 }
      );
    }
    const { title, slug, content, category, isPublished, tags } = parsed.data;

    // If slug is being changed, check uniqueness
    if (slug && slug !== existing.slug) {
      const slugExists = await db.article.findUnique({
        where: { slug },
      });
      if (slugExists) {
        return NextResponse.json(
          { success: false, message: `slug 已存在: ${slug}` },
          { status: 409 }
        );
      }
    }

    // Build update data with only provided fields
    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (slug !== undefined) updateData.slug = slug;
    if (content !== undefined) updateData.content = sanitizeHtml(content);
    if (category !== undefined) updateData.category = category;
    if (tags !== undefined) updateData.tags = tags;
    if (isPublished !== undefined) updateData.isPublished = isPublished;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, message: "没有需要更新的字段" },
        { status: 400 }
      );
    }

    const article = await db.article.update({
      where: { id },
      data: updateData,
    });

    log.info(
      { adminId: session.id, articleId: id, title: existing.title, fields: Object.keys(updateData) },
      "Admin updated article"
    );

    return NextResponse.json({
      success: true,
      message: "文章已更新",
      article: {
        id: article.id,
        title: article.title,
        slug: article.slug,
        content: article.content,
        category: article.category,
        tags: article.tags,
        isPublished: article.isPublished,
        viewCount: article.viewCount,
        createdAt: article.createdAt.toISOString(),
        updatedAt: article.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    log.error({ err: error }, "Admin articles PUT error");
    return NextResponse.json(
      { success: false, message: "服务器内部错误" },
      { status: 500 }
    );
  }
}

// PATCH - Batch publish/unpublish articles
export async function PATCH(request: NextRequest) {
  try {
    const rl = apiLimiter(getClientIp(request));
    if (!rl.success) return rateLimitResponse(rl);

    const { session, error } = getAdminSession(request);
    if (!session) return error!;

    const body = await request.json();
    const { ids, isPublished } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, message: "请选择要操作的文章" },
        { status: 400 }
      );
    }
    if (typeof isPublished !== "boolean") {
      return NextResponse.json(
        { success: false, message: "缺少发布状态参数" },
        { status: 400 }
      );
    }

    const result = await db.article.updateMany({
      where: { id: { in: ids } },
      data: { isPublished },
    });

    log.info(
      { adminId: session.id, count: result.count, isPublished },
      "Admin batch updated article publish status"
    );

    return NextResponse.json({
      success: true,
      updated: result.count,
      message: `已${isPublished ? "发布" : "撤回"} ${result.count} 篇文章`,
    });
  } catch (error) {
    log.error({ err: error }, "Admin articles PATCH error");
    return NextResponse.json(
      { success: false, message: "服务器内部错误" },
      { status: 500 }
    );
  }
}

// DELETE - Delete article
export async function DELETE(request: NextRequest) {
  try {
    const rl = apiLimiter(getClientIp(request));
    if (!rl.success) return rateLimitResponse(rl);

    const { session, error } = getAdminSession(request);
    if (!session) return error!;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, message: "缺少文章ID参数" },
        { status: 400 }
      );
    }

    const existing = await db.article.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "文章不存在" },
        { status: 404 }
      );
    }

    await db.article.delete({ where: { id } });

    log.info(
      { adminId: session.id, articleId: id, title: existing.title },
      "Admin deleted article"
    );

    return NextResponse.json({
      success: true,
      message: "文章已删除",
    });
  } catch (error) {
    log.error({ err: error }, "Admin articles DELETE error");
    return NextResponse.json(
      { success: false, message: "服务器内部错误" },
      { status: 500 }
    );
  }
}
