import { cn } from "@/lib/utils";
import ProductCard from "@/components/product/product-card";
import EmptyState from "@/components/shared/empty-state";

export interface ProductItem {
  productId?: string;
  name: string;
  slug: string;
  price: number;
  originalPrice?: number;
  image?: string;
  stockCount: number;
  soldCount: number;
  categoryName: string;
  avgRating?: number;
  reviewCount?: number;
  description?: string;
}

interface ProductGridProps {
  products: ProductItem[];
  className?: string;
  searchQuery?: string;
  onQuickView?: (product: ProductItem) => void;
}

export default function ProductGrid({ products, className, searchQuery, onQuickView }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <EmptyState
        title="暂无商品"
        description="当前筛选条件下没有找到商品，请尝试调整筛选条件"
      />
    );
  }

  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3",
        className
      )}
    >
      {products.map((product, idx) => (
        <ProductCard key={product.slug} {...product} searchQuery={searchQuery} priority={idx < 6} onQuickView={onQuickView ? () => onQuickView(product) : undefined} />
      ))}
    </div>
  );
}
