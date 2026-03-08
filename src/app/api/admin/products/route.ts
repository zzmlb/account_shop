import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { parsePagination, paginationMeta } from "@/lib/pagination";
import { db } from "@/server/db";
import { createLogger } from "@/lib/logger";
import { createProductSchema, updateProductSchema, formatZodError } from "@/lib/validators";
import { apiLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { slugify } from "@/lib/utils";

const log = createLogger("admin/products");

async function handleDuplicate(sourceId: string, adminId: string) {
  const source = await db.product.findUnique({
    where: { id: sourceId },
    include: { category: { select: { id: true, name: true, slug: true } } },
  });

  if (!source) {
    return NextResponse.json(
      { success: false, message: "源商品不存在" },
      { status: 404 }
    );
  }

  // Generate unique slug and name
  const baseName = `${source.name} (副本)`;
  const baseSlug = (slugify(baseName) || "product") + `-${Date.now().toString(36)}`;

  const product = await db.product.create({
    data: {
      name: baseName,
      slug: baseSlug,
      description: source.description,
      price: source.price,
      originalPrice: source.originalPrice,
      categoryId: source.categoryId,
      image: source.image,
      images: source.images,
      tags: source.tags,
      isActive: false, // Start as inactive so admin can review
      sortOrder: source.sortOrder,
      deliveryType: source.deliveryType,
      afterSaleHours: source.afterSaleHours,
      stockCount: 0, // New product starts with 0 stock
    },
    include: { category: { select: { id: true, name: true, slug: true } } },
  });

  log.info(
    { adminId, sourceId, newProductId: product.id, newSlug: baseSlug },
    "Admin duplicated product"
  );

  return NextResponse.json({
    success: true,
    message: "商品已复制，请修改名称和slug后上架",
    product: {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      price: Number(product.price),
      originalPrice: product.originalPrice ? Number(product.originalPrice) : null,
      categoryId: product.categoryId,
      category: product.category,
      image: product.image,
      images: product.images,
      tags: product.tags,
      stockCount: product.stockCount,
      soldCount: product.soldCount,
      isActive: product.isActive,
      sortOrder: product.sortOrder,
      deliveryType: product.deliveryType,
      afterSaleHours: product.afterSaleHours,
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
    },
  });
}

// GET - List all products (admin only)
export async function GET(request: NextRequest) {
  try {
    const rl = apiLimiter(getClientIp(request));
    if (!rl.success) return rateLimitResponse(rl);

    const { session, error } = getAdminSession(request);
    if (!session) return error!;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.slice(0, 200);
    const { page, pageSize } = parsePagination(searchParams, { pageSize: 50, maxPageSize: 100 });

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { slug: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const [products, total] = await Promise.all([
      db.product.findMany({
        where,
        include: {
          category: {
            select: { id: true, name: true, slug: true },
          },
        },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.product.count({ where }),
    ]);

    const formatted = products.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description,
      price: Number(p.price),
      originalPrice: p.originalPrice ? Number(p.originalPrice) : null,
      categoryId: p.categoryId,
      category: {
        id: p.category.id,
        name: p.category.name,
        slug: p.category.slug,
      },
      image: p.image,
      images: p.images,
      tags: p.tags,
      stockCount: p.stockCount,
      soldCount: p.soldCount,
      viewCount: p.viewCount,
      isActive: p.isActive,
      sortOrder: p.sortOrder,
      deliveryType: p.deliveryType,
      afterSaleHours: p.afterSaleHours,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      products: formatted,
      pagination: paginationMeta(total, page, pageSize),
    });
  } catch (error) {
    log.error({ err: error }, "Admin products GET error");
    return NextResponse.json(
      { success: false, message: "服务器内部错误" },
      { status: 500 }
    );
  }
}

// POST - Create a new product (admin only)
export async function POST(request: NextRequest) {
  try {
    const rl = apiLimiter(getClientIp(request));
    if (!rl.success) return rateLimitResponse(rl);

    const { session, error } = getAdminSession(request);
    if (!session) return error!;

    // Handle product duplication
    const { searchParams } = new URL(request.url);
    const duplicateId = searchParams.get("duplicateId");
    if (duplicateId) {
      return handleDuplicate(duplicateId, session.id);
    }

    const body = await request.json();
    const parsed = createProductSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: formatZodError(parsed.error) },
        { status: 400 }
      );
    }

    const {
      name,
      slug,
      description,
      price,
      categoryId,
      stockCount,
      originalPrice,
      tags,
      image,
      images,
      isActive,
      sortOrder,
      deliveryType,
      afterSaleHours,
    } = parsed.data;

    // Verify category exists
    const category = await db.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      return NextResponse.json(
        { success: false, message: "分类不存在" },
        { status: 400 }
      );
    }

    // Generate slug from name if not provided
    const productSlug = slug || slugify(name) || `product-${Date.now()}`;

    // Check slug uniqueness and name duplicates in parallel
    const [existingSlug, existingName] = await Promise.all([
      db.product.findUnique({ where: { slug: productSlug } }),
      db.product.findFirst({ where: { name, isActive: true } }),
    ]);

    if (existingSlug) {
      return NextResponse.json(
        { success: false, message: `slug 已存在: ${productSlug}` },
        { status: 409 }
      );
    }

    // Warn about duplicate name (include warning in response, don't block)
    const nameWarning = existingName
      ? `注意: 已存在同名商品 "${existingName.name}" (ID: ${existingName.id})`
      : undefined;

    const product = await db.product.create({
      data: {
        name,
        slug: productSlug,
        description,
        price,
        categoryId,
        stockCount,
        originalPrice: originalPrice ?? undefined,
        tags: tags ?? [],
        image: image ?? undefined,
        images,
        isActive: isActive ?? true,
        sortOrder: sortOrder ?? 0,
        deliveryType: deliveryType ?? undefined,
        afterSaleHours: afterSaleHours ?? undefined,
      },
      include: {
        category: true,
      },
    });

    log.info(
      { adminId: session.id, productId: product.id, productName: name, slug: productSlug },
      "Admin created product"
    );

    return NextResponse.json({
      success: true,
      ...(nameWarning && { warning: nameWarning }),
      product: {
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description,
        price: Number(product.price),
        originalPrice: product.originalPrice ? Number(product.originalPrice) : null,
        categoryId: product.categoryId,
        category: {
          id: product.category.id,
          name: product.category.name,
          slug: product.category.slug,
        },
        image: product.image,
        images: product.images,
        tags: product.tags,
        stockCount: product.stockCount,
        soldCount: product.soldCount,
        isActive: product.isActive,
        sortOrder: product.sortOrder,
        deliveryType: product.deliveryType,
        afterSaleHours: product.afterSaleHours,
        createdAt: product.createdAt.toISOString(),
        updatedAt: product.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    log.error({ err: error }, "Admin products POST error");
    return NextResponse.json(
      { success: false, message: "服务器内部错误" },
      { status: 500 }
    );
  }
}

// PUT - Update a product (admin only)
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
        { success: false, message: "缺少商品ID参数" },
        { status: 400 }
      );
    }

    // Check product exists
    const existing = await db.product.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "商品不存在" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const parsed = updateProductSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: formatZodError(parsed.error) },
        { status: 400 }
      );
    }

    const {
      name,
      slug,
      description,
      price,
      categoryId,
      stockCount,
      originalPrice,
      tags,
      image,
      images,
      isActive,
      sortOrder,
      deliveryType,
      afterSaleHours,
    } = parsed.data;

    // If categoryId is being changed, verify the new category exists
    if (categoryId && categoryId !== existing.categoryId) {
      const category = await db.category.findUnique({
        where: { id: categoryId },
      });
      if (!category) {
        return NextResponse.json(
          { success: false, message: "分类不存在" },
          { status: 400 }
        );
      }
    }

    // If slug is being changed, check uniqueness
    if (slug && slug !== existing.slug) {
      const slugExists = await db.product.findUnique({
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
    if (name !== undefined) updateData.name = name;
    if (slug !== undefined) updateData.slug = slug;
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) updateData.price = price;
    if (categoryId !== undefined) updateData.categoryId = categoryId;
    if (stockCount !== undefined) updateData.stockCount = stockCount;
    if (originalPrice !== undefined) updateData.originalPrice = originalPrice;
    if (tags !== undefined) updateData.tags = tags;
    if (image !== undefined) updateData.image = image;
    if (images !== undefined) updateData.images = images;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;
    if (deliveryType !== undefined) updateData.deliveryType = deliveryType;
    if (afterSaleHours !== undefined) updateData.afterSaleHours = afterSaleHours;

    const product = await db.product.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
      },
    });

    log.info(
      { adminId: session.id, productId: id, productName: existing.name, fields: Object.keys(updateData) },
      "Admin updated product"
    );

    return NextResponse.json({
      success: true,
      product: {
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description,
        price: Number(product.price),
        originalPrice: product.originalPrice ? Number(product.originalPrice) : null,
        categoryId: product.categoryId,
        category: {
          id: product.category.id,
          name: product.category.name,
          slug: product.category.slug,
        },
        image: product.image,
        images: product.images,
        tags: product.tags,
        stockCount: product.stockCount,
        soldCount: product.soldCount,
        isActive: product.isActive,
        sortOrder: product.sortOrder,
        deliveryType: product.deliveryType,
        afterSaleHours: product.afterSaleHours,
        createdAt: product.createdAt.toISOString(),
        updatedAt: product.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    log.error({ err: error }, "Admin products PUT error");
    return NextResponse.json(
      { success: false, message: "服务器内部错误" },
      { status: 500 }
    );
  }
}

// DELETE - Soft delete a product (admin only)
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
        { success: false, message: "缺少商品ID参数" },
        { status: 400 }
      );
    }

    // Check product exists
    const existing = await db.product.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "商品不存在" },
        { status: 404 }
      );
    }

    // Soft delete: set isActive to false
    await db.product.update({
      where: { id },
      data: { isActive: false },
    });

    log.info(
      { adminId: session.id, productId: id, productName: existing.name },
      "Admin soft-deleted product"
    );

    return NextResponse.json({
      success: true,
      message: "商品已下架",
    });
  } catch (error) {
    log.error({ err: error }, "Admin products DELETE error");
    return NextResponse.json(
      { success: false, message: "服务器内部错误" },
      { status: 500 }
    );
  }
}

// PATCH - Reconcile stock counts (admin only)
export async function PATCH(request: NextRequest) {
  try {
    const rl = apiLimiter(getClientIp(request));
    if (!rl.success) return rateLimitResponse(rl);

    const { session, error } = getAdminSession(request);
    if (!session) return error!;

    const body = await request.json();
    const { action } = body;

    if (action !== "reconcile-stock") {
      return NextResponse.json(
        { success: false, message: "无效操作" },
        { status: 400 }
      );
    }

    // Find all active products and batch-count available card keys
    const [products, availableCounts] = await Promise.all([
      db.product.findMany({
        where: { isActive: true },
        select: { id: true, name: true, stockCount: true },
      }),
      db.cardKey.groupBy({
        by: ["productId"],
        where: { status: "AVAILABLE" },
        _count: { id: true },
      }),
    ]);

    const countMap = new Map(
      availableCounts.map((c) => [c.productId, c._count.id])
    );

    let fixedCount = 0;
    const fixes: Array<{ name: string; oldStock: number; newStock: number }> = [];

    for (const product of products) {
      const actualAvailable = countMap.get(product.id) ?? 0;

      if (product.stockCount !== actualAvailable) {
        await db.product.update({
          where: { id: product.id },
          data: { stockCount: actualAvailable },
        });
        fixes.push({
          name: product.name,
          oldStock: product.stockCount,
          newStock: actualAvailable,
        });
        fixedCount++;
      }
    }

    log.info(
      { adminId: session.id, fixedCount, fixes },
      "Admin reconciled stock counts"
    );

    return NextResponse.json({
      success: true,
      message: fixedCount > 0
        ? `已修复 ${fixedCount} 个商品的库存数据`
        : "所有商品库存数据一致，无需修复",
      fixedCount,
      fixes,
    });
  } catch (error) {
    log.error({ err: error }, "Admin products PATCH error");
    return NextResponse.json(
      { success: false, message: "服务器内部错误" },
      { status: 500 }
    );
  }
}
