"use client";

import { memo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ShoppingCart, Flame } from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import PriceTag from "@/components/shared/price-tag";
import StockBadge from "@/components/shared/stock-badge";
import FavoriteButton from "@/components/product/favorite-button";
import { useCartStore } from "@/stores/cart-store";

interface ProductCardProps {
  productId?: string;
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

function ProductCard({
  productId,
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
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);

  const handleQuickBuy = () => {
    if (stockCount <= 0) {
      toast.error("商品暂时缺货");
      return;
    }
    addItem({
      id: slug,
      productId: productId || slug,
      name,
      slug,
      price,
      originalPrice,
      quantity: 1,
      maxStock: stockCount,
      image,
    });
    toast.success("已加入购物车", {
      description: `${name} x1`,
    });
    router.push("/checkout");
  };

  return (
    <Link href={`/products/${slug}`} className={cn("group block", className)}>
      <motion.div
        whileHover={{ y: -4 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className="relative overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] transition-colors duration-300 hover:border-[var(--primary)]/50 hover:shadow-[0_8px_30px_rgba(108,92,231,0.15)]"
      >
        {/* Image area */}
        <div className="relative aspect-[4/3] overflow-hidden">
          {image ? (
            <Image
              src={image}
              alt={name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
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
          {/* Top-right: badges + favorite */}
          <div className="absolute right-2 top-2 flex flex-col items-end gap-1">
            {originalPrice && originalPrice > price && (
              <Badge className="bg-[var(--destructive)] text-[var(--destructive-foreground)]">
                -{Math.round(((originalPrice - price) / originalPrice) * 100)}%
              </Badge>
            )}
            {soldCount >= 50 && !originalPrice && (
              <Badge className="bg-[var(--warning)] text-white gap-0.5">
                <Flame className="h-3 w-3" />
                热销
              </Badge>
            )}
            {productId && (
              <FavoriteButton
                productId={productId}
                size="sm"
                className="bg-[var(--background)]/70 backdrop-blur-sm hover:bg-[var(--background)]/90"
              />
            )}
          </div>
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
                handleQuickBuy();
              }}
            >
              <ShoppingCart className="h-4 w-4" />
              <span className="sr-only">加入购物车</span>
            </Button>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

export default memo(ProductCard);
