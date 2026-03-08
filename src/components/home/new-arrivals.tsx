import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingCart, ArrowRight, Sparkles } from "lucide-react";
import { db } from "@/server/db";
import FavoriteButton from "@/components/product/favorite-button";

const GRADIENTS = [
  "linear-gradient(135deg, #ff6b6b 0%, #ffa500 100%)",
  "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)",
  "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
  "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
  "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
  "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
  "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)",
];

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  originalPrice: number | null;
  image: string | null;
  stock: number;
  sold: number;
  gradient: string;
  isNew: boolean;
}

function isWithin7Days(date: Date): boolean {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  return diff < 7 * 24 * 60 * 60 * 1000;
}

function NewArrivalCard({ product, priority = false }: { product: Product; priority?: boolean }) {
  const discount =
    product.originalPrice && product.originalPrice > product.price
      ? Math.round(
          ((product.originalPrice - product.price) / product.originalPrice) * 100
        )
      : 0;

  return (
    <Link
      href={`/products/${product.slug}`}
      className={cn(
        "group flex min-w-[220px] flex-col rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)]",
        "transition-all duration-300",
        "hover:-translate-y-1 hover:border-[var(--primary)]/50",
        "hover:shadow-[0_8px_30px_rgba(108,92,231,0.2)]"
      )}
    >
      <div
        className="relative h-36 w-full overflow-hidden rounded-t-[var(--radius-lg)]"
        style={product.image ? undefined : { background: product.gradient }}
      >
        {product.image && (
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            priority={priority}
            loading={priority ? "eager" : "lazy"}
          />
        )}
        <div className="absolute left-3 top-3 flex gap-1.5">
          {product.isNew && (
            <Badge className="bg-gradient-to-r from-orange-500 to-pink-500 text-white border-0">
              <Sparkles className="mr-1 h-3 w-3" />
              新品
            </Badge>
          )}
          {discount > 0 && (
            <Badge className="bg-[var(--destructive)] text-[var(--destructive-foreground)]">
              -{discount}%
            </Badge>
          )}
        </div>
        <div className="absolute right-2 top-2 flex flex-col items-end gap-1">
          <Badge
            variant={product.stock < 100 ? "destructive" : "success"}
          >
            {product.stock < 100 ? "库存紧张" : "有货"}
          </Badge>
          <FavoriteButton
            productId={product.id}
            size="sm"
            className="bg-[var(--background)]/70 backdrop-blur-sm hover:bg-[var(--background)]/90"
          />
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-sm font-semibold text-[var(--foreground)] line-clamp-1 group-hover:text-[var(--primary)] transition-colors">
          {product.name}
        </h3>

        <p className="mt-1 text-xs text-[var(--muted-foreground)]">
          已售 {product.sold.toLocaleString()}
        </p>

        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-lg font-bold text-[var(--primary)]">
            ¥{product.price.toFixed(2)}
          </span>
          {product.originalPrice && (
            <span className="text-xs text-[var(--muted-foreground)] line-through">
              ¥{product.originalPrice.toFixed(2)}
            </span>
          )}
        </div>

        <Button
          size="sm"
          className="mt-3 w-full gap-1.5 rounded-[var(--radius-md)]"
        >
          <ShoppingCart className="h-3.5 w-3.5" />
          购买
        </Button>
      </div>
    </Link>
  );
}

export default async function NewArrivals() {
  const dbProducts = await db.product.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
    take: 8,
  });

  if (dbProducts.length === 0) return null;

  const products: Product[] = dbProducts.map((p, i) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: Number(p.price),
    originalPrice: p.originalPrice ? Number(p.originalPrice) : null,
    image: p.image,
    stock: p.stockCount,
    sold: p.soldCount,
    gradient: GRADIENTS[i % GRADIENTS.length],
    isNew: isWithin7Days(p.createdAt),
  }));

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
      <div className="mb-10 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[var(--foreground)] sm:text-3xl">
            新品上架
          </h2>
          <p className="mt-2 text-[var(--muted-foreground)]">
            最新上架的数字商品
          </p>
        </div>
        <Link
          href="/products?sort=newest"
          className={cn(
            "hidden items-center gap-1 text-sm font-medium text-[var(--primary)] sm:flex",
            "hover:text-[var(--primary-hover)] transition-colors"
          )}
        >
          查看全部
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((product, idx) => (
          <NewArrivalCard key={product.id} product={product} priority={idx < 4} />
        ))}
      </div>

      <div className="mt-8 flex justify-center sm:hidden">
        <Button asChild variant="outline" className="rounded-full">
          <Link href="/products?sort=newest" className="gap-1.5">
            查看全部
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </section>
  );
}
