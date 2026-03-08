"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Heart,
  HeartOff,
  ShoppingCart,
  Star,
  Package,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import EmptyState from "@/components/shared/empty-state";

interface FavoriteProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  originalPrice?: number;
  rating: number;
  salesCount: number;
  category: string;
  inStock: boolean;
  image?: string;
  addedAt: string;
}

const MOCK_FAVORITES: FavoriteProduct[] = [
  {
    id: "1",
    name: "ChatGPT Plus 共享账号 1个月",
    slug: "chatgpt-plus-shared",
    price: 19.99,
    originalPrice: 29.99,
    rating: 4.8,
    salesCount: 2340,
    category: "AI工具",
    inStock: true,
    addedAt: "2026-03-05",
  },
  {
    id: "2",
    name: "Netflix 高级会员月卡",
    slug: "netflix-premium-monthly",
    price: 15.99,
    rating: 4.6,
    salesCount: 1850,
    category: "流媒体",
    inStock: true,
    addedAt: "2026-03-04",
  },
  {
    id: "3",
    name: "Spotify Premium 年卡",
    slug: "spotify-premium-yearly",
    price: 39.99,
    originalPrice: 59.99,
    rating: 4.9,
    salesCount: 3120,
    category: "流媒体",
    inStock: true,
    addedAt: "2026-03-03",
  },
  {
    id: "4",
    name: "NordVPN 2年套餐",
    slug: "nordvpn-2year",
    price: 59.99,
    originalPrice: 89.99,
    rating: 4.7,
    salesCount: 980,
    category: "VPN",
    inStock: false,
    addedAt: "2026-03-02",
  },
  {
    id: "5",
    name: "Steam 充值卡 100元",
    slug: "steam-100",
    price: 95.0,
    rating: 4.5,
    salesCount: 5600,
    category: "游戏",
    inStock: true,
    addedAt: "2026-03-01",
  },
  {
    id: "6",
    name: "Adobe Creative Cloud 年订阅",
    slug: "adobe-cc-yearly",
    price: 199.99,
    originalPrice: 399.99,
    rating: 4.4,
    salesCount: 720,
    category: "设计工具",
    inStock: true,
    addedAt: "2026-02-28",
  },
];


export default function FavoritesPageContent() {
  const [favorites, setFavorites] = useState<FavoriteProduct[]>(MOCK_FAVORITES);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const handleUnfavorite = (id: string) => {
    setRemovingId(id);
    // Simulate API delay then remove
    setTimeout(() => {
      setFavorites((prev) => prev.filter((item) => item.id !== id));
      setRemovingId(null);
    }, 300);
  };

  const formatPrice = (price: number) => `¥${price.toFixed(2)}`;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">
            我的收藏
          </h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            {favorites.length > 0
              ? `共 ${favorites.length} 件收藏商品`
              : "暂无收藏商品"}
          </p>
        </div>
        {favorites.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-[var(--destructive)]"
            onClick={() => setFavorites([])}
          >
            <Trash2 className="h-3.5 w-3.5" />
            清空收藏
          </Button>
        )}
      </div>

      {/* Favorites grid */}
      {favorites.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="收藏夹是空的"
          description="浏览商品并点击心形图标，将喜欢的商品加入收藏"
          actionLabel="去逛逛"
          onAction={() => (window.location.href = "/products")}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {favorites.map((product) => {
            const isRemoving = removingId === product.id;
            const discount =
              product.originalPrice && product.originalPrice > product.price
                ? Math.round(
                    ((product.originalPrice - product.price) /
                      product.originalPrice) *
                      100
                  )
                : null;

            return (
              <Card
                key={product.id}
                className={cn(
                  "group relative overflow-hidden transition-all duration-300",
                  isRemoving && "scale-95 opacity-0",
                  !product.inStock && "opacity-75"
                )}
              >
                {/* Product image placeholder */}
                <div className="relative flex h-40 items-center justify-center bg-[var(--muted)]">
                  <Package className="h-12 w-12 text-[var(--muted-foreground)]/50" />

                  {/* Badges overlay */}
                  <div className="absolute left-3 top-3 flex flex-col gap-1.5">
                    <Badge variant="secondary" className="text-xs">
                      {product.category}
                    </Badge>
                    {discount && (
                      <Badge variant="destructive" className="text-xs">
                        -{discount}%
                      </Badge>
                    )}
                    {!product.inStock && (
                      <Badge variant="outline" className="bg-[var(--card)] text-xs">
                        暂时缺货
                      </Badge>
                    )}
                  </div>

                  {/* Unfavorite button */}
                  <button
                    onClick={() => handleUnfavorite(product.id)}
                    className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-[var(--card)]/90 text-[var(--destructive)] shadow-sm backdrop-blur-sm transition-all hover:scale-110 hover:bg-[var(--card)]"
                    aria-label="取消收藏"
                  >
                    <Heart className="h-4.5 w-4.5 fill-current" />
                  </button>
                </div>

                <CardContent className="p-4">
                  {/* Product name */}
                  <Link
                    href={`/products/${product.slug}`}
                    className="line-clamp-2 text-sm font-medium text-[var(--foreground)] transition-colors hover:text-[var(--primary)]"
                  >
                    {product.name}
                  </Link>

                  {/* Rating and sales */}
                  <div className="mt-2 flex items-center gap-3 text-xs text-[var(--muted-foreground)]">
                    <span className="flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      {product.rating}
                    </span>
                    <span>已售 {product.salesCount}</span>
                  </div>

                  {/* Price */}
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-lg font-bold text-[var(--primary)]">
                      {formatPrice(product.price)}
                    </span>
                    {product.originalPrice &&
                      product.originalPrice > product.price && (
                        <span className="text-xs text-[var(--muted-foreground)] line-through">
                          {formatPrice(product.originalPrice)}
                        </span>
                      )}
                  </div>
                </CardContent>

                <CardFooter className="gap-2 px-4 pb-4">
                  <Button
                    className="flex-1 gap-1.5"
                    size="sm"
                    disabled={!product.inStock}
                  >
                    <ShoppingCart className="h-3.5 w-3.5" />
                    {product.inStock ? "立即购买" : "缺货中"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-[var(--muted-foreground)] hover:text-[var(--destructive)]"
                    onClick={() => handleUnfavorite(product.id)}
                  >
                    <HeartOff className="h-3.5 w-3.5" />
                    取消
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
