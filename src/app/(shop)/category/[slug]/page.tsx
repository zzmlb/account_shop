import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/server/db";
import { SITE_NAME, SITE_URL, SITE_DESCRIPTION } from "@/lib/constants";
import CategoryPageContent from "./category-page-content";

export const revalidate = 60; // ISR: revalidate every 60 seconds

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const categories = await db.category.findMany({
    where: { isActive: true },
    select: { slug: true },
  });
  return categories.map((c) => ({ slug: c.slug }));
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

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "分类",
        item: `${SITE_URL}/categories`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: category.name,
      },
    ],
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${category.name} - ${SITE_NAME}`,
    description:
      category.description ||
      `浏览 ${category.name} 分类下的所有数字商品`,
    url: `${SITE_URL}/category/${category.slug}`,
    isPartOf: {
      "@type": "WebSite",
      name: SITE_NAME,
      url: SITE_URL,
    },
    numberOfItems: formattedProducts.length,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
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
    </>
  );
}
