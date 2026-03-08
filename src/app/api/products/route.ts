import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { createLogger } from "@/lib/logger";
import { apiLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

const log = createLogger("products");

export async function GET(request: NextRequest) {
  try {
    const rl = apiLimiter(getClientIp(request));
    if (!rl.success) return rateLimitResponse(rl);
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    const sort = searchParams.get("sort");
    const inStock = searchParams.get("inStock");
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    const slugs = searchParams.get("slugs");
    const limit = searchParams.get("limit");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = limit ? parseInt(limit, 10) : parseInt(searchParams.get("pageSize") || "12", 10);

    // Build where clause
    const where: Record<string, unknown> = { isActive: true };

    // Filter by specific slugs (for cart validation)
    if (slugs) {
      where.slug = { in: slugs.split(",").filter(Boolean) };
    }

    if (category && category !== "全部") {
      where.category = { name: category };
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    if (inStock === "true") {
      where.stockCount = { gt: 0 };
    }

    if (minPrice) {
      where.price = { ...(where.price as Record<string, unknown> || {}), gte: parseFloat(minPrice) };
    }
    if (maxPrice) {
      where.price = { ...(where.price as Record<string, unknown> || {}), lte: parseFloat(maxPrice) };
    }

    // Build orderBy (support both dash and underscore formats)
    let orderBy: Record<string, string> = { soldCount: "desc" };
    switch (sort) {
      case "price_asc":
      case "price-asc": orderBy = { price: "asc" }; break;
      case "price_desc":
      case "price-desc": orderBy = { price: "desc" }; break;
      case "sales":
      case "best-selling": orderBy = { soldCount: "desc" }; break;
      case "newest": orderBy = { createdAt: "desc" }; break;
    }

    const [products, total] = await Promise.all([
      db.product.findMany({
        where,
        include: { category: { select: { name: true, slug: true } } },
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.product.count({ where }),
    ]);

    const formatted = products.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      category: p.category.name,
      categorySlug: p.category.slug,
      price: Number(p.price),
      originalPrice: p.originalPrice ? Number(p.originalPrice) : undefined,
      stock: p.stockCount,
      stockCount: p.stockCount,
      status: p.isActive ? (p.stockCount > 0 ? "active" : "out_of_stock") : "inactive",
      salesCount: p.soldCount,
      description: p.description,
      image: p.image,
      tags: p.tags,
      createdAt: p.createdAt.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      products: formatted,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    log.error({ err: error }, "Products API error");
    return NextResponse.json(
      { success: false, message: "服务器内部错误" },
      { status: 500 }
    );
  }
}
