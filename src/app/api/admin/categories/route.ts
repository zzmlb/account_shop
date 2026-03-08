import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { getSessionFromRequest } from "@/lib/auth";
import { createLogger } from "@/lib/logger";
import { createCategorySchema, updateCategorySchema, formatZodError } from "@/lib/validators";

const log = createLogger("admin/categories");

function isAdmin(role: string): boolean {
  const r = role.toUpperCase();
  return r === "ADMIN" || r === "SUPER_ADMIN";
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fff]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// GET - List all categories (admin sees all, including inactive)
export async function GET(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request);
    if (!session || !isAdmin(session.role)) {
      return NextResponse.json(
        { success: false, message: "无权限" },
        { status: 403 }
      );
    }

    const categories = await db.category.findMany({
      orderBy: { sortOrder: "asc" },
      include: {
        _count: { select: { products: true } },
      },
    });

    const formatted = categories.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      icon: c.icon,
      sortOrder: c.sortOrder,
      isActive: c.isActive,
      productCount: c._count.products,
      createdAt: c.createdAt.toISOString(),
    }));

    return NextResponse.json({ success: true, categories: formatted });
  } catch (error) {
    log.error({ err: error }, "Admin categories GET error");
    return NextResponse.json(
      { success: false, message: "服务器内部错误" },
      { status: 500 }
    );
  }
}

// POST - Create a new category
export async function POST(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request);
    if (!session || !isAdmin(session.role)) {
      return NextResponse.json(
        { success: false, message: "无权限" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = createCategorySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: formatZodError(parsed.error) },
        { status: 400 }
      );
    }
    const { name, description, icon, sortOrder } = parsed.data;

    // Generate slug
    let slug = slugify(name.trim());
    if (!slug) slug = `cat-${Date.now()}`;

    // Check uniqueness
    const existing = await db.category.findUnique({ where: { slug } });
    if (existing) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    const category = await db.category.create({
      data: {
        name: name.trim(),
        slug,
        description: description?.trim() || null,
        icon: icon?.trim() || null,
        sortOrder: typeof sortOrder === "number" ? sortOrder : 0,
      },
    });

    return NextResponse.json({ success: true, category });
  } catch (error) {
    log.error({ err: error }, "Admin categories POST error");
    return NextResponse.json(
      { success: false, message: "服务器内部错误" },
      { status: 500 }
    );
  }
}

// PUT - Update a category
export async function PUT(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request);
    if (!session || !isAdmin(session.role)) {
      return NextResponse.json(
        { success: false, message: "无权限" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = updateCategorySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: formatZodError(parsed.error) },
        { status: 400 }
      );
    }
    const { id, name, description, icon, sortOrder, isActive } = parsed.data;

    const existing = await db.category.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "分类不存在" },
        { status: 404 }
      );
    }

    const data: Record<string, unknown> = {};
    if (name !== undefined) {
      data.name = name.trim();
      let newSlug = slugify(name.trim());
      if (!newSlug) newSlug = `cat-${Date.now()}`;
      if (newSlug !== existing.slug) {
        const slugExists = await db.category.findFirst({
          where: { slug: newSlug, id: { not: id } },
        });
        if (slugExists) newSlug = `${newSlug}-${Date.now().toString(36)}`;
        data.slug = newSlug;
      }
    }
    if (description !== undefined) data.description = typeof description === "string" ? description.trim() || null : null;
    if (icon !== undefined) data.icon = typeof icon === "string" ? icon.trim() || null : null;
    if (sortOrder !== undefined) data.sortOrder = sortOrder;
    if (isActive !== undefined) data.isActive = isActive;

    const updated = await db.category.update({ where: { id }, data });

    return NextResponse.json({ success: true, category: updated });
  } catch (error) {
    log.error({ err: error }, "Admin categories PUT error");
    return NextResponse.json(
      { success: false, message: "服务器内部错误" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a category (only if no products)
export async function DELETE(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request);
    if (!session || !isAdmin(session.role)) {
      return NextResponse.json(
        { success: false, message: "无权限" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, message: "缺少分类ID" },
        { status: 400 }
      );
    }

    // Check if category has products
    const productCount = await db.product.count({
      where: { categoryId: id },
    });

    if (productCount > 0) {
      return NextResponse.json(
        { success: false, message: `该分类下有 ${productCount} 个商品，无法删除。请先移动或删除这些商品。` },
        { status: 400 }
      );
    }

    await db.category.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "分类已删除" });
  } catch (error) {
    log.error({ err: error }, "Admin categories DELETE error");
    return NextResponse.json(
      { success: false, message: "服务器内部错误" },
      { status: 500 }
    );
  }
}
