import { NextResponse } from "next/server";
import { db } from "@/server/db";

export async function GET() {
  try {
    const categories = await db.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        icon: true,
        _count: { select: { products: { where: { isActive: true } } } },
      },
    });

    const formatted = categories.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      icon: c.icon,
      productCount: c._count.products,
    }));

    return NextResponse.json({ success: true, categories: formatted });
  } catch (error) {
    console.error("Categories API error:", error);
    return NextResponse.json(
      { success: false, message: "服务器内部错误" },
      { status: 500 }
    );
  }
}
