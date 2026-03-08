import Link from "next/link";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingCart, ArrowRight } from "lucide-react";

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  originalPrice: number;
  stock: number;
  sold: number;
  gradient: string;
}

const MOCK_PRODUCTS: Product[] = [
  {
    id: "1",
    name: "Gmail 高质量邮箱",
    slug: "gmail-premium",
    price: 12.99,
    originalPrice: 19.99,
    stock: 386,
    sold: 2841,
    gradient: "linear-gradient(135deg, #6c5ce7 0%, #00d2ff 100%)",
  },
  {
    id: "2",
    name: "Outlook 全新账号",
    slug: "outlook-fresh",
    price: 8.99,
    originalPrice: 14.99,
    stock: 512,
    sold: 1923,
    gradient: "linear-gradient(135deg, #0078d4 0%, #00bcf2 100%)",
  },
  {
    id: "3",
    name: "Netflix 高级会员",
    slug: "netflix-premium",
    price: 29.99,
    originalPrice: 45.00,
    stock: 128,
    sold: 3412,
    gradient: "linear-gradient(135deg, #e50914 0%, #b20710 100%)",
  },
  {
    id: "4",
    name: "Spotify 年度订阅",
    slug: "spotify-yearly",
    price: 24.99,
    originalPrice: 39.99,
    stock: 256,
    sold: 2156,
    gradient: "linear-gradient(135deg, #1db954 0%, #191414 100%)",
  },
  {
    id: "5",
    name: "Discord Nitro",
    slug: "discord-nitro",
    price: 19.99,
    originalPrice: 29.99,
    stock: 89,
    sold: 1567,
    gradient: "linear-gradient(135deg, #5865f2 0%, #eb459e 100%)",
  },
  {
    id: "6",
    name: "ChatGPT Plus 账号",
    slug: "chatgpt-plus",
    price: 49.99,
    originalPrice: 69.99,
    stock: 42,
    sold: 4231,
    gradient: "linear-gradient(135deg, #10a37f 0%, #1a7f5a 100%)",
  },
  {
    id: "7",
    name: "Steam 充值卡",
    slug: "steam-gift-card",
    price: 88.00,
    originalPrice: 100.00,
    stock: 320,
    sold: 1890,
    gradient: "linear-gradient(135deg, #1b2838 0%, #2a475e 100%)",
  },
  {
    id: "8",
    name: "NordVPN 2年计划",
    slug: "nordvpn-2year",
    price: 59.99,
    originalPrice: 89.99,
    stock: 175,
    sold: 2678,
    gradient: "linear-gradient(135deg, #4687ff 0%, #2b6cb0 100%)",
  },
];

function ProductCard({ product }: { product: Product }) {
  const discount = Math.round(
    ((product.originalPrice - product.price) / product.originalPrice) * 100
  );

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
      {/* Image placeholder */}
      <div
        className="relative h-36 w-full overflow-hidden rounded-t-[var(--radius-lg)]"
        style={{ background: product.gradient }}
      >
        {/* Discount badge */}
        {discount > 0 && (
          <Badge className="absolute left-3 top-3 bg-[var(--destructive)] text-[var(--destructive-foreground)]">
            -{discount}%
          </Badge>
        )}
        {/* Stock indicator */}
        <Badge
          variant={product.stock < 100 ? "destructive" : "success"}
          className="absolute right-3 top-3"
        >
          {product.stock < 100 ? "库存紧张" : "有货"}
        </Badge>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-4">
        {/* Product name */}
        <h3 className="text-sm font-semibold text-[var(--foreground)] line-clamp-1 group-hover:text-[var(--primary)] transition-colors">
          {product.name}
        </h3>

        {/* Sold count */}
        <p className="mt-1 text-xs text-[var(--muted-foreground)]">
          已售 {product.sold.toLocaleString()}
        </p>

        {/* Price row */}
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-lg font-bold text-[var(--primary)]">
            ¥{product.price.toFixed(2)}
          </span>
          <span className="text-xs text-[var(--muted-foreground)] line-through">
            ¥{product.originalPrice.toFixed(2)}
          </span>
        </div>

        {/* Buy button */}
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

export default function FeaturedProducts() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
      {/* Section header */}
      <div className="mb-10 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[var(--foreground)] sm:text-3xl">
            热销商品
          </h2>
          <p className="mt-2 text-[var(--muted-foreground)]">
            精选最受欢迎的数字商品
          </p>
        </div>
        <Link
          href="/products"
          className={cn(
            "hidden items-center gap-1 text-sm font-medium text-[var(--primary)] sm:flex",
            "hover:text-[var(--primary-hover)] transition-colors"
          )}
        >
          查看全部
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Products grid - scrollable on mobile, grid on desktop */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {MOCK_PRODUCTS.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {/* Mobile "view all" link */}
      <div className="mt-8 flex justify-center sm:hidden">
        <Button asChild variant="outline" className="rounded-full">
          <Link href="/products" className="gap-1.5">
            查看全部
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </section>
  );
}
