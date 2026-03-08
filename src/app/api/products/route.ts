import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { createLogger } from "@/lib/logger";
import { apiLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { parsePagination, paginationMeta } from "@/lib/pagination";

const log = createLogger("products");

export async function GET(request: NextRequest) {
  try {
    const rl = apiLimiter(getClientIp(request));
    if (!rl.success) return rateLimitResponse(rl);
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get("category");
    const search = searchParams.get("search")?.slice(0, 100);
    const sort = searchParams.get("sort");
    const inStock = searchParams.get("inStock");
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    const slugs = searchParams.get("slugs");
    // Accept "limit" as an alias for "pageSize"
    const limit = searchParams.get("limit");
    if (limit && !searchParams.has("pageSize")) {
      searchParams.set("pageSize", limit);
    }
    const { page, pageSize } = parsePagination(searchParams, { pageSize: 12, maxPageSize: 100 });

    // Build where clause
    const where: Record<string, unknown> = { isActive: true };

    // Filter by specific slugs (for cart validation, max 50)
    if (slugs) {
      const slugList = slugs.split(",").filter(Boolean).slice(0, 50);
      where.slug = { in: slugList };
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

    const priceFilter: { gte?: number; lte?: number } = {};
    if (minPrice) {
      const v = parseFloat(minPrice);
      if (Number.isFinite(v) && v >= 0) priceFilter.gte = v;
    }
    if (maxPrice) {
      const v = parseFloat(maxPrice);
      if (Number.isFinite(v) && v >= 0) priceFilter.lte = v;
    }
    if (priceFilter.gte !== undefined && priceFilter.lte !== undefined && priceFilter.gte > priceFilter.lte) {
      // Swap if min > max
      [priceFilter.gte, priceFilter.lte] = [priceFilter.lte, priceFilter.gte];
    }
    if (Object.keys(priceFilter).length > 0) {
      where.price = priceFilter;
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
        include: {
          category: { select: { name: true, slug: true } },
          _count: { select: { reviews: { where: { isVisible: true } } } },
        },
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.product.count({ where }),
    ]);

    // Batch fetch average ratings for returned products
    const productIds = products.map((p) => p.id);
    const ratingStats = productIds.length > 0
      ? await db.review.groupBy({
          by: ["productId"],
          where: { productId: { in: productIds }, isVisible: true },
          _avg: { rating: true },
        })
      : [];
    const avgRatingMap = new Map(
      ratingStats.map((s) => [s.productId, Math.round((s._avg.rating ?? 0) * 10) / 10])
    );

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
      images: p.images,
      tags: p.tags,
      avgRating: avgRatingMap.get(p.id) ?? 0,
      reviewCount: p._count.reviews,
      createdAt: p.createdAt.toISOString(),
    }));

    const response = NextResponse.json({
      success: true,
      products: formatted,
      pagination: paginationMeta(total, page, pageSize),
    });
    // Cache public product listings for 60s, allow stale for 5min while revalidating
    response.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    return response;
  } catch (error) {
    log.error({ err: error }, "Products API error");
    return NextResponse.json(
      { success: false, message: "服务器内部错误" },
      { status: 500 }
    );
  }
}
