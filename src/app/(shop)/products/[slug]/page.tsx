import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProductDetailContent from "./product-detail-content";
import { db } from "@/server/db";
import { SITE_NAME, SITE_URL } from "@/lib/constants";

export const revalidate = 60; // ISR: revalidate every 60 seconds

interface ProductDetailPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ProductDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await db.product.findUnique({
    where: { slug },
    select: { name: true, description: true, image: true },
  });

  if (!product) {
    return {
      title: "商品未找到",
      description: "该商品可能已下架或链接无效",
    };
  }

  const title = product.name;
  const description = product.description?.slice(0, 160) || "数字商品详情页";
  const productUrl = `${SITE_URL}/products/${slug}`;

  return {
    title,
    description,
    openGraph: {
      title: `${title} | ${SITE_NAME}`,
      description,
      url: productUrl,
      siteName: SITE_NAME,
      type: "website",
      ...(product.image && {
        images: [{ url: product.image, width: 800, height: 600, alt: title }],
      }),
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${SITE_NAME}`,
      description,
      ...(product.image && { images: [product.image] }),
    },
  };
}

// Default instructions and after-sales text for products without specific content
const DEFAULT_INSTRUCTIONS =
  "1. 购买成功后在「我的订单」中查看卡密信息\n2. 使用卡密信息登录对应服务\n3. 登录后建议立即修改密码\n4. 如遇问题请在 24 小时内联系客服";

const DEFAULT_AFTER_SALES =
  "1. 账号/卡密保证首次使用有效\n2. 因买家操作导致的问题不在售后范围内\n3. 请在购买后 24 小时内验证并使用\n4. 如有质量问题支持免费更换一次";

export default async function ProductDetailPage({
  params,
}: ProductDetailPageProps) {
  const { slug } = await params;

  const product = await db.product.findUnique({
    where: { slug },
    include: {
      category: { select: { name: true, slug: true } },
    },
  });

  if (!product) {
    notFound();
  }

  // Fire-and-forget view count increment (non-blocking)
  db.product.update({
    where: { id: product.id },
    data: { viewCount: { increment: 1 } },
  }).catch(() => {});

  // Get review stats for aggregateRating schema
  const reviewStats = await db.review.aggregate({
    where: { productId: product.id, isVisible: true },
    _avg: { rating: true },
    _count: true,
  });

  // Get related products from same category
  const relatedProducts = await db.product.findMany({
    where: {
      categoryId: product.categoryId,
      slug: { not: slug },
      isActive: true,
    },
    include: { category: { select: { name: true } } },
    orderBy: { soldCount: "desc" },
    take: 4,
  });

  const productData = {
    id: product.id,
    name: product.name,
    slug: product.slug,
    price: Number(product.price),
    originalPrice: product.originalPrice ? Number(product.originalPrice) : undefined,
    image: product.image || undefined,
    images: product.images || [],
    stockCount: product.stockCount,
    soldCount: product.soldCount,
    categoryName: product.category.name,
    categorySlug: product.category.slug,
    description: product.description,
    instructions: DEFAULT_INSTRUCTIONS,
    afterSales: DEFAULT_AFTER_SALES,
  };

  const relatedData = relatedProducts.map((p) => ({
    productId: p.id,
    name: p.name,
    slug: p.slug,
    price: Number(p.price),
    originalPrice: p.originalPrice ? Number(p.originalPrice) : undefined,
    image: p.image || undefined,
    stockCount: p.stockCount,
    soldCount: p.soldCount,
    categoryName: p.category.name,
  }));

  const avgRating = reviewStats._avg.rating
    ? Math.round(reviewStats._avg.rating * 10) / 10
    : null;
  const reviewCount = reviewStats._count;

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "全部商品",
        item: `${SITE_URL}/products`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: product.category.name,
        item: `${SITE_URL}/products?category=${encodeURIComponent(product.category.name)}`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: product.name,
      },
    ],
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description || `${product.name} - 数字商品`,
    url: `${SITE_URL}/products/${product.slug}`,
    ...(product.image && { image: product.image }),
    brand: { "@type": "Brand", name: SITE_NAME },
    offers: {
      "@type": "Offer",
      price: Number(product.price),
      priceCurrency: "CNY",
      availability: product.stockCount > 0
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      seller: { "@type": "Organization", name: SITE_NAME },
    },
    ...(avgRating && reviewCount > 0 && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: avgRating,
        reviewCount,
        bestRating: 5,
        worstRating: 1,
      },
    }),
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
      <ProductDetailContent product={productData} relatedProducts={relatedData} />
    </>
  );
}
