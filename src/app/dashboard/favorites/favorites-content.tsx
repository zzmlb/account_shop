"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Heart,
  HeartOff,
  ShoppingCart,
  Package,
  Trash2,
  Loader2,
  ArrowUpDown,
} from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import EmptyState from "@/components/shared/empty-state";
import { useCartStore } from "@/stores/cart-store";
import { toast } from "sonner";

type SortOption = "newest" | "oldest" | "price-asc" | "price-desc" | "name";

interface FavoriteProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  originalPrice?: number;
  salesCount: number;
  category: string;
  inStock: boolean;
  stockCount: number;
  image?: string;
  addedAt: string;
  productId: string;
}

interface ApiFavorite {
  id: string;
  createdAt: string;
  product: {
    id: string;
    name: string;
    slug: string;
    price: number;
    originalPrice: number | null;
    stockCount: number;
    soldCount: number;
    image: string | null;
    categoryName: string;
  };
}

function mapApiToFavorite(fav: ApiFavorite): FavoriteProduct {
  return {
    id: fav.id,
    productId: fav.product.id,
    name: fav.product.name,
    slug: fav.product.slug,
    price: fav.product.price,
    originalPrice: fav.product.originalPrice ?? undefined,
    salesCount: fav.product.soldCount,
    category: fav.product.categoryName,
    inStock: fav.product.stockCount > 0,
    stockCount: fav.product.stockCount,
    image: fav.product.image ?? undefined,
    addedAt: fav.createdAt,
  };
}

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "newest", label: "最近收藏" },
  { value: "oldest", label: "最早收藏" },
  { value: "price-desc", label: "价格从高到低" },
  { value: "price-asc", label: "价格从低到高" },
  { value: "name", label: "名称排序" },
];

function sortFavorites(items: FavoriteProduct[], sort: SortOption): FavoriteProduct[] {
  const sorted = [...items];
  switch (sort) {
    case "newest":
      return sorted.sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime());
    case "oldest":
      return sorted.sort((a, b) => new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime());
    case "price-asc":
      return sorted.sort((a, b) => a.price - b.price);
    case "price-desc":
      return sorted.sort((a, b) => b.price - a.price);
    case "name":
      return sorted.sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
    default:
      return sorted;
  }
}

export default function FavoritesPageContent() {
  const [favorites, setFavorites] = useState<FavoriteProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [clearingAll, setClearingAll] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const addItem = useCartStore((s) => s.addItem);

  const fetchFavorites = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/favorites");
      const data = await res.json();
      if (data.success) {
        setFavorites(data.favorites.map(mapApiToFavorite));
      } else {
        toast.error(data.message || "获取收藏列表失败");
      }
    } catch {
      toast.error("网络错误，获取收藏列表失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  const handleUnfavorite = async (product: FavoriteProduct) => {
    setRemovingId(product.id);
    try {
      const res = await fetch(
        `/api/favorites?productId=${encodeURIComponent(product.productId)}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (data.success) {
        // Small delay for the fade-out animation
        setTimeout(() => {
          setFavorites((prev) => prev.filter((item) => item.id !== product.id));
          setRemovingId(null);
        }, 300);
        toast.success("已取消收藏");
      } else {
        toast.error(data.message || "取消收藏失败");
        setRemovingId(null);
      }
    } catch {
      toast.error("网络错误，取消收藏失败");
      setRemovingId(null);
    }
  };

  const handleClearAll = async () => {
    if (favorites.length === 0) return;
    if (!window.confirm(`确定要清空全部 ${favorites.length} 个收藏吗？此操作不可撤销。`)) return;
    setClearingAll(true);
    try {
      const results = await Promise.allSettled(
        favorites.map((fav) =>
          fetch(
            `/api/favorites?productId=${encodeURIComponent(fav.productId)}`,
            { method: "DELETE" }
          ).then((res) => res.json())
        )
      );
      const failedCount = results.filter(
        (r) => r.status === "rejected" || (r.status === "fulfilled" && !r.value.success)
      ).length;
      if (failedCount === 0) {
        setFavorites([]);
        toast.success("已清空收藏");
      } else if (failedCount < favorites.length) {
        toast.warning(`部分商品取消收藏失败（${failedCount}/${favorites.length}）`);
        await fetchFavorites();
      } else {
        toast.error("清空收藏失败，请稍后重试");
      }
    } catch {
      toast.error("网络错误，清空收藏失败");
    } finally {
      setClearingAll(false);
    }
  };

  const handleAddToCart = (product: FavoriteProduct) => {
    if (!product.inStock) return;
    addItem({
      id: product.slug,
      productId: product.productId,
      name: product.name,
      slug: product.slug,
      price: product.price,
      originalPrice: product.originalPrice,
      quantity: 1,
      maxStock: product.stockCount,
      image: product.image,
    });
    toast.success("已加入购物车");
  };

  const sortedFavorites = sortFavorites(favorites, sortBy);
  const formatPrice = (price: number) => `¥${price.toFixed(2)}`;

  if (loading) {
    return (
      <div className="space-y-6" aria-busy="true">
        <div className="flex items-center justify-between">
          <div className="h-7 w-32 animate-pulse rounded bg-[var(--muted)]" />
          <div className="h-8 w-20 animate-pulse rounded bg-[var(--muted)]" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] overflow-hidden">
              <div className="aspect-[4/3] bg-[var(--muted)]" />
              <div className="p-4 space-y-2">
                <div className="h-4 w-3/4 rounded bg-[var(--muted)]" />
                <div className="h-3 w-1/2 rounded bg-[var(--muted)]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

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
          <div className="flex items-center gap-2">
            <div className="relative">
              <ArrowUpDown className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted-foreground)]" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="h-8 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card)] py-0 pl-8 pr-8 text-xs text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-[var(--destructive)]"
              onClick={handleClearAll}
              disabled={clearingAll}
            >
              {clearingAll ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
              清空收藏
            </Button>
          </div>
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
          {sortedFavorites.map((product) => {
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
                {/* Product image */}
                <div className="relative h-40 overflow-hidden bg-[var(--muted)]">
                  {product.image ? (
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Package className="h-12 w-12 text-[var(--muted-foreground)]/50" />
                    </div>
                  )}

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
                    onClick={() => handleUnfavorite(product)}
                    disabled={removingId !== null}
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

                  {/* Sales info */}
                  <div className="mt-2 text-xs text-[var(--muted-foreground)]">
                    已售 {product.salesCount}
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
                    onClick={() => handleAddToCart(product)}
                  >
                    <ShoppingCart className="h-3.5 w-3.5" />
                    {product.inStock ? "加入购物车" : "缺货中"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-[var(--muted-foreground)] hover:text-[var(--destructive)]"
                    onClick={() => handleUnfavorite(product)}
                    disabled={removingId !== null}
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
