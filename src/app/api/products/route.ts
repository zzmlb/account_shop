import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    const sort = searchParams.get("sort");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "12", 10);

    // Build where clause
    const where: Record<string, unknown> = { isActive: true };

    if (category && category !== "全部") {
      where.category = { name: category };
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    // Build orderBy
    let orderBy: Record<string, string> = { soldCount: "desc" };
    switch (sort) {
      case "price_asc": orderBy = { price: "asc" }; break;
      case "price_desc": orderBy = { price: "desc" }; break;
      case "sales": orderBy = { soldCount: "desc" }; break;
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
    console.error("Products API error:", error);
    return NextResponse.json(
      { success: false, message: "服务器内部错误" },
      { status: 500 }
    );
  }
}
