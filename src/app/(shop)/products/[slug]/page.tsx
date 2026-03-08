import ProductDetailContent from "./product-detail-content";
import { db } from "@/server/db";

interface ProductDetailPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ProductDetailPageProps) {
  const { slug } = await params;
  const product = await db.product.findUnique({
    where: { slug },
    select: { name: true, description: true },
  });
  return {
    title: product
      ? `${product.name} - PJ37 数字商品交易平台`
      : "商品未找到 - PJ37",
    description: product?.description ?? "数字商品详情页",
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
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">
          商品未找到
        </h1>
        <p className="mt-2 text-[var(--muted-foreground)]">
          该商品可能已下架或链接无效
        </p>
      </div>
    );
  }

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
    stockCount: product.stockCount,
    soldCount: product.soldCount,
    categoryName: product.category.name,
    description: product.description,
    instructions: DEFAULT_INSTRUCTIONS,
    afterSales: DEFAULT_AFTER_SALES,
  };

  const relatedData = relatedProducts.map((p) => ({
    name: p.name,
    slug: p.slug,
    price: Number(p.price),
    originalPrice: p.originalPrice ? Number(p.originalPrice) : undefined,
    stockCount: p.stockCount,
    soldCount: p.soldCount,
    categoryName: p.category.name,
  }));

  return (
    <ProductDetailContent product={productData} relatedProducts={relatedData} />
  );
}
