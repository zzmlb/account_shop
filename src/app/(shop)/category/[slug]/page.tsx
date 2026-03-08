import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/server/db";
import { SITE_NAME, SITE_URL, SITE_DESCRIPTION } from "@/lib/constants";
import CategoryPageContent from "./category-page-content";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = await db.category.findUnique({ where: { slug } });

  if (!category) {
    return { title: "分类不存在" };
  }

  const description =
    category.description ||
    `浏览 ${category.name} 分类下的所有数字商品 — ${SITE_DESCRIPTION}`;
  const url = `${SITE_URL}/category/${slug}`;

  return {
    title: `${category.name} - ${SITE_NAME}`,
    description,
    openGraph: {
      title: `${category.name} - ${SITE_NAME}`,
      description,
      url,
      siteName: SITE_NAME,
      type: "website",
    },
    twitter: {
      card: "summary",
      title: `${category.name} - ${SITE_NAME}`,
      description,
    },
    alternates: { canonical: url },
  };
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;

  const category = await db.category.findUnique({
    where: { slug },
  });

  if (!category || !category.isActive) {
    notFound();
  }

  const products = await db.product.findMany({
    where: {
      categoryId: category.id,
      isActive: true,
    },
    include: {
      category: { select: { name: true } },
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });

  const allCategories = await db.category.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  const formattedProducts = products.map((p) => ({
    productId: p.id,
    name: p.name,
    slug: p.slug,
    price: Number(p.price),
    originalPrice: p.originalPrice ? Number(p.originalPrice) : undefined,
    image: p.image ?? undefined,
    stockCount: p.stockCount,
    soldCount: p.soldCount,
    categoryName: p.category.name,
  }));

  const formattedCategories = allCategories.map((c) => ({
    name: c.name,
    slug: c.slug,
    icon: c.icon,
  }));

  return (
    <CategoryPageContent
      category={{
        name: category.name,
        slug: category.slug,
        description: category.description,
        icon: category.icon,
      }}
      products={formattedProducts}
      categories={formattedCategories}
    />
  );
}
