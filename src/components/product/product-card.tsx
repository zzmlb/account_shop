import Link from "next/link";
import Image from "next/image";
import { ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import PriceTag from "@/components/shared/price-tag";
import StockBadge from "@/components/shared/stock-badge";

interface ProductCardProps {
  name: string;
  slug: string;
  price: number;
  originalPrice?: number;
  image?: string;
  stockCount: number;
  soldCount: number;
  categoryName: string;
  className?: string;
}

export default function ProductCard({
  name,
  slug,
  price,
  originalPrice,
  image,
  stockCount,
  soldCount,
  categoryName,
  className,
}: ProductCardProps) {
  return (
    <Link href={`/products/${slug}`} className={cn("group block", className)}>
      <div className="relative overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] transition-all duration-300 hover:-translate-y-1 hover:border-[var(--primary)]/50 hover:shadow-[0_8px_30px_rgba(108,92,231,0.15)]">
        {/* Image area */}
        <div className="relative aspect-[4/3] overflow-hidden">
          {image ? (
            <Image
              src={image}
              alt={name}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[var(--primary)]/20 via-[var(--accent)]/10 to-[var(--primary)]/5">
              <div className="text-4xl font-bold text-[var(--primary)]/30">
                {name.charAt(0)}
              </div>
            </div>
          )}
          {/* Category badge overlay */}
          <div className="absolute left-3 top-3">
            <Badge
              variant="secondary"
              className="bg-[var(--background)]/80 backdrop-blur-sm"
            >
              {categoryName}
            </Badge>
          </div>
          {/* Discount badge */}
          {originalPrice && originalPrice > price && (
            <div className="absolute right-3 top-3">
              <Badge className="bg-[var(--destructive)] text-[var(--destructive-foreground)]">
                -{Math.round(((originalPrice - price) / originalPrice) * 100)}%
              </Badge>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Product name */}
          <h3 className="mb-2 line-clamp-2 text-sm font-medium leading-snug text-[var(--card-foreground)] transition-colors group-hover:text-[var(--primary)]">
            {name}
          </h3>

          {/* Price */}
          <PriceTag
            price={price}
            originalPrice={originalPrice}
            className="mb-3"
          />

          {/* Bottom row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <StockBadge stockCount={stockCount} />
              <span className="text-xs text-[var(--muted-foreground)]">
                已售 {soldCount}
              </span>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-[var(--muted-foreground)] hover:text-[var(--primary)]"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                // TODO: add to cart logic
              }}
            >
              <ShoppingCart className="h-4 w-4" />
              <span className="sr-only">加入购物车</span>
            </Button>
          </div>
        </div>
      </div>
    </Link>
  );
}
