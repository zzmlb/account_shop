import { NextRequest, NextResponse } from "next/server";
import { decodeSession } from "@/lib/auth";
import { db } from "@/server/db";
import { createLogger } from "@/lib/logger";

const log = createLogger("admin/articles");

function isAdmin(role: string): boolean {
  const upper = role.toUpperCase();
  return upper === "ADMIN" || upper === "SUPER_ADMIN";
}

function getAdminSession(request: NextRequest) {
  const session = decodeSession(
    request.cookies.get("session")?.value || ""
  );

  if (!session) {
    return {
      session: null,
      error: NextResponse.json(
        { success: false, message: "未登录" },
        { status: 401 }
      ),
    };
  }

  if (!isAdmin(session.role)) {
    return {
      session: null,
      error: NextResponse.json(
        { success: false, message: "无管理员权限" },
        { status: 403 }
      ),
    };
  }

  return { session, error: null };
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[\s]+/g, "-")
    .replace(/[^\w\u4e00-\u9fa5-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    || `article-${Date.now()}`;
}

// GET - List articles with pagination, search, and filters
export async function GET(request: NextRequest) {
  try {
    const { session, error } = getAdminSession(request);
    if (!session) return error!;

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "20", 10)));
    const search = searchParams.get("search");
    const category = searchParams.get("category");
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
    const { session, error } = getAdminSession(request);
    if (!session) return error!;

    const body = await request.json();
    const { title, slug, content, category, isPublished, tags } = body;

    // Validate required fields
    if (!title || !content || !category) {
      return NextResponse.json(
        { success: false, message: "缺少必填字段: title, content, category" },
        { status: 400 }
      );
    }

    // Generate slug from title if not provided
    const articleSlug = slug || generateSlug(title);

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
        content,
        category,
        tags: tags ?? [],
        isPublished: isPublished ?? false,
      },
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
    const { title, slug, content, category, isPublished, tags } = body;

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
    if (content !== undefined) updateData.content = content;
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

// DELETE - Delete article
export async function DELETE(request: NextRequest) {
  try {
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
