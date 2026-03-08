"use client";

import { useState, useEffect, useCallback, type ReactNode } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { SlidersHorizontal, Loader2, Search, X, LayoutGrid, List, ShoppingCart, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Pagination from "@/components/shared/pagination";
import PriceTag from "@/components/shared/price-tag";
import StockBadge from "@/components/shared/stock-badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import ProductGrid, {
  type ProductItem,
} from "@/components/product/product-grid";
import ProductFilters from "@/components/product/product-filters";
import FavoriteButton from "@/components/product/favorite-button";
import { useCartStore } from "@/stores/cart-store";
import { toast } from "sonner";

interface ApiProduct {
  id: string;
  name: string;
  slug: string;
  category: string;
  price: number;
  originalPrice?: number;
  image?: string | null;
  stock: number;
  salesCount: number;
  avgRating?: number;
  reviewCount?: number;
  description?: string;
}

interface ApiResponse {
  success: boolean;
  products: ApiProduct[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

function highlightText(text: string, query: string): ReactNode {
  if (!query) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));
  if (parts.length <= 1) return text;
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={i} className="bg-[var(--primary)]/20 text-[var(--primary)] rounded-sm px-0.5">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

export default function ProductsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [quickViewProduct, setQuickViewProduct] = useState<ProductItem | null>(null);
  const [qvImgError, setQvImgError] = useState(false);
  const addItem = useCartStore((s) => s.addItem);
  const perPage = 12;

  // Read filter params from URL (set by ProductFilters component)
  const category = searchParams?.get("category") ?? "";
  const sort = searchParams?.get("sort") ?? "";
  const search = searchParams?.get("q") ?? searchParams?.get("search") ?? "";
  const minPrice = searchParams?.get("minPrice") ?? "";
  const maxPrice = searchParams?.get("maxPrice") ?? "";
  const inStock = searchParams?.get("inStock") ?? "";
  const page = Math.max(1, parseInt(searchParams?.get("page") ?? "1", 10) || 1);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(perPage));
      if (category) params.set("category", category);
      if (sort) params.set("sort", sort);
      if (search) params.set("search", search);
      if (minPrice) params.set("minPrice", minPrice);
      if (maxPrice) params.set("maxPrice", maxPrice);
      if (inStock === "true") params.set("inStock", "true");

      const res = await fetch(`/api/products?${params.toString()}`);
      const data: ApiResponse = await res.json();
      if (data.success) {
        setProducts(
          data.products.map((p) => ({
            productId: p.id,
            name: p.name,
            slug: p.slug,
            price: p.price,
            originalPrice: p.originalPrice,
            image: p.image || undefined,
            stockCount: p.stock,
            soldCount: p.salesCount,
            categoryName: p.category,
            avgRating: p.avgRating,
            reviewCount: p.reviewCount,
            description: p.description,
          }))
        );
        setTotalPages(data.pagination.totalPages);
        setTotal(data.pagination.total);

        // If current page exceeds total pages, redirect to last valid page
        if (data.pagination.totalPages > 0 && page > data.pagination.totalPages) {
          const params = new URLSearchParams(searchParams?.toString() ?? "");
          if (data.pagination.totalPages <= 1) {
            params.delete("page");
          } else {
            params.set("page", String(data.pagination.totalPages));
          }
          router.replace(`/products${params.toString() ? `?${params.toString()}` : ""}`);
        }
      }
    } catch {
      toast.error("商品加载失败，请刷新重试");
    } finally {
      setLoading(false);
    }
  }, [page, category, sort, search, minPrice, maxPrice, inStock]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Navigate to a specific page via URL
  const goToPage = useCallback(
    (targetPage: number) => {
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      if (targetPage <= 1) {
        params.delete("page");
      } else {
        params.set("page", String(targetPage));
      }
      router.push(`/products${params.toString() ? `?${params.toString()}` : ""}`);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [searchParams, router]
  );

  const handleQuickView = useCallback((p: ProductItem) => {
    setQvImgError(false);
    setQuickViewProduct(p);
  }, []);

  const hasActiveFilters = !!(search || category || minPrice || maxPrice || inStock);

  const clearSearch = () => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.delete("q");
    params.delete("search");
    router.push(`/products${params.toString() ? `?${params.toString()}` : ""}`);
  };

  const clearAllFilters = () => {
    router.push("/products");
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[var(--foreground)]">
            {search ? `搜索: "${search}"` : "全部商品"}
          </h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            {search
              ? `找到 ${total} 件相关商品`
              : `共 ${total} 件商品`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="hidden sm:flex items-center rounded-[var(--radius-md)] border border-[var(--border)] p-0.5">
            <button
              onClick={() => setViewMode("grid")}
              className={`flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] transition-colors ${
                viewMode === "grid"
                  ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              }`}
              aria-label="网格视图"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] transition-colors ${
                viewMode === "list"
                  ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              }`}
              aria-label="列表视图"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
          {/* Mobile filter button */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="lg:hidden">
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                筛选
              </Button>
            </SheetTrigger>
          <SheetContent side="left" className="w-80 overflow-y-auto">
            <SheetHeader>
              <SheetTitle>筛选商品</SheetTitle>
            </SheetHeader>
            <div className="mt-6">
              <ProductFilters />
            </div>
          </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Active filter indicators */}
      {hasActiveFilters && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {search && (
            <Badge variant="secondary" className="gap-1.5 py-1 pl-2.5 pr-1.5">
              <Search className="h-3 w-3" />
              {search}
              <button
                onClick={clearSearch}
                className="ml-1 rounded-full p-0.5 hover:bg-[var(--muted)]"
                aria-label="清除搜索"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {category && (
            <Badge variant="secondary" className="py-1">
              分类: {category}
            </Badge>
          )}
          {(minPrice || maxPrice) && (
            <Badge variant="secondary" className="py-1">
              价格: {minPrice || "0"} - {maxPrice || "∞"}
            </Badge>
          )}
          {inStock === "true" && (
            <Badge variant="secondary" className="py-1">
              仅有货
            </Badge>
          )}
          <button
            onClick={clearAllFilters}
            className="text-xs text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors"
          >
            清除全部筛选
          </button>
        </div>
      )}

      {/* Main content */}
      <div className="flex gap-8">
        {/* Desktop sidebar */}
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="sticky top-24 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-5">
            <h3 className="mb-4 text-sm font-semibold text-[var(--foreground)]">
              筛选条件
            </h3>
            <ProductFilters />
          </div>
        </aside>

        {/* Product grid */}
        <div className="flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 rounded-full bg-[var(--muted)] p-4">
                <Search className="h-10 w-10 text-[var(--muted-foreground)]" />
              </div>
              <h3 className="mb-1 text-lg font-semibold text-[var(--foreground)]">
                {search ? `未找到与"${search}"相关的商品` : hasActiveFilters ? "暂无匹配商品" : "暂无商品"}
              </h3>
              <p className="mb-4 max-w-sm text-sm text-[var(--muted-foreground)]">
                {search
                  ? "请尝试更换关键词或调整筛选条件"
                  : hasActiveFilters
                    ? "当前筛选条件下没有找到商品，请尝试调整筛选条件"
                    : "商品正在上架中，请稍后再来"}
              </p>
              {hasActiveFilters && (
                <Button onClick={clearAllFilters} variant="outline">
                  清除全部筛选
                </Button>
              )}
            </div>
          ) : viewMode === "list" ? (
            <div className="space-y-3">
              {products.map((product) => (
                <Link
                  key={product.slug}
                  href={`/products/${product.slug}`}
                  className="group flex items-center gap-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-4 transition-colors hover:border-[var(--primary)]/50 hover:bg-[var(--card-hover)]"
                >
                  {product.image ? (
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-[var(--radius-md)] bg-[var(--muted)]">
                      <Image src={product.image} alt={product.name} fill className="object-cover" sizes="80px" />
                    </div>
                  ) : (
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-gradient-to-br from-[var(--primary)]/20 to-[var(--primary)]/5">
                      <span className="text-2xl font-bold text-[var(--primary)]/30">{product.name.charAt(0)}</span>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-medium text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors line-clamp-1">
                      {highlightText(product.name, search)}
                    </h3>
                    <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                      {product.categoryName} · 已售 {product.soldCount}
                    </p>
                    <div className="mt-1.5 flex items-center gap-3">
                      <PriceTag price={product.price} originalPrice={product.originalPrice} />
                      <StockBadge stockCount={product.stockCount} />
                    </div>
                  </div>
                  <ShoppingCart className="h-5 w-5 shrink-0 text-[var(--muted-foreground)] group-hover:text-[var(--primary)] transition-colors" aria-hidden="true" />
                </Link>
              ))}
            </div>
          ) : (
            <ProductGrid products={products} searchQuery={search} onQuickView={handleQuickView} />
          )}

          {/* Pagination */}
          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            onPageChange={goToPage}
            showPageNumbers
            totalLabel="件商品"
            className="mt-8"
          />
        </div>
      </div>

      {/* Quick-view Dialog */}
      <Dialog
        open={!!quickViewProduct}
        onOpenChange={(open) => !open && setQuickViewProduct(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="line-clamp-2 pr-6">
              {quickViewProduct?.name}
            </DialogTitle>
            <DialogDescription>
              {quickViewProduct?.categoryName}
            </DialogDescription>
          </DialogHeader>
          {quickViewProduct && (
            <div className="space-y-4">
              {/* Image */}
              {quickViewProduct.image && !qvImgError ? (
                <div className="relative aspect-[16/9] overflow-hidden rounded-[var(--radius-md)] bg-[var(--muted)]">
                  <Image
                    src={quickViewProduct.image}
                    alt={quickViewProduct.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 512px) 100vw, 512px"
                    onError={() => setQvImgError(true)}
                  />
                </div>
              ) : (
                <div className="flex aspect-[16/9] items-center justify-center overflow-hidden rounded-[var(--radius-md)] bg-gradient-to-br from-[var(--primary)]/20 to-[var(--accent)]/10">
                  <span className="text-4xl font-bold text-[var(--primary)]/30">
                    {quickViewProduct.name.charAt(0)}
                  </span>
                </div>
              )}

              {/* Price + Rating */}
              <div className="flex items-center justify-between">
                <PriceTag
                  price={quickViewProduct.price}
                  originalPrice={quickViewProduct.originalPrice}
                />
                <div className="flex items-center gap-3">
                  {quickViewProduct.avgRating != null && quickViewProduct.avgRating > 0 && (
                    <div className="flex items-center gap-1 text-sm text-[var(--muted-foreground)]">
                      <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                      <span>{quickViewProduct.avgRating}</span>
                      {quickViewProduct.reviewCount != null && quickViewProduct.reviewCount > 0 && (
                        <span>({quickViewProduct.reviewCount})</span>
                      )}
                    </div>
                  )}
                  <StockBadge stockCount={quickViewProduct.stockCount} />
                </div>
              </div>

              {/* Description */}
              {quickViewProduct.description && (
                <p className="text-sm leading-relaxed text-[var(--muted-foreground)] line-clamp-4">
                  {quickViewProduct.description}
                </p>
              )}

              {/* Stats */}
              <div className="flex items-center gap-4 text-xs text-[var(--muted-foreground)]">
                <span>已售 {quickViewProduct.soldCount}</span>
                <span>库存 {quickViewProduct.stockCount}</span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3">
                <Button
                  className="flex-1"
                  onClick={() => {
                    if (quickViewProduct.stockCount <= 0) {
                      toast.error("商品暂时缺货");
                      return;
                    }
                    addItem({
                      id: quickViewProduct.slug,
                      productId: quickViewProduct.productId || quickViewProduct.slug,
                      name: quickViewProduct.name,
                      slug: quickViewProduct.slug,
                      price: quickViewProduct.price,
                      originalPrice: quickViewProduct.originalPrice,
                      quantity: 1,
                      maxStock: quickViewProduct.stockCount,
                      image: quickViewProduct.image,
                    });
                    toast.success("已加入购物车", {
                      description: `${quickViewProduct.name} x1`,
                    });
                    setQuickViewProduct(null);
                    router.push("/checkout");
                  }}
                  disabled={quickViewProduct.stockCount <= 0}
                >
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  {quickViewProduct.stockCount <= 0 ? "缺货" : "立即购买"}
                </Button>
                <Button
                  variant="outline"
                  asChild
                >
                  <Link href={`/products/${quickViewProduct.slug}`}>
                    查看详情
                  </Link>
                </Button>
                {quickViewProduct.productId && (
                  <FavoriteButton productId={quickViewProduct.productId} />
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
