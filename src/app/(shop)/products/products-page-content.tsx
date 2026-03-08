"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { SlidersHorizontal, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import ProductGrid, {
  type ProductItem,
} from "@/components/product/product-grid";
import ProductFilters from "@/components/product/product-filters";

interface ApiProduct {
  id: string;
  name: string;
  slug: string;
  category: string;
  price: number;
  originalPrice?: number;
  stock: number;
  salesCount: number;
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

export default function ProductsPageContent() {
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const perPage = 9;

  // Read filter params from URL (set by ProductFilters component)
  const category = searchParams?.get("category") ?? "";
  const sort = searchParams?.get("sort") ?? "";
  const search = searchParams?.get("q") ?? searchParams?.get("search") ?? "";
  const minPrice = searchParams?.get("minPrice") ?? "";
  const maxPrice = searchParams?.get("maxPrice") ?? "";
  const inStock = searchParams?.get("inStock") ?? "";

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [category, sort, search, minPrice, maxPrice, inStock]);

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
            name: p.name,
            slug: p.slug,
            price: p.price,
            originalPrice: p.originalPrice,
            stockCount: p.stock,
            soldCount: p.salesCount,
            categoryName: p.category,
          }))
        );
        setTotalPages(data.pagination.totalPages);
        setTotal(data.pagination.total);
      }
    } catch {
      // Silently fail, show empty state
    } finally {
      setLoading(false);
    }
  }, [page, category, sort, search, minPrice, maxPrice, inStock]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[var(--foreground)]">
            全部商品
          </h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            共 {total} 件商品
          </p>
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
          ) : (
            <ProductGrid products={products} />
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                上一页
              </Button>
              <span className="px-4 text-sm text-[var(--muted-foreground)]">
                第 {page} / {totalPages} 页
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                下一页
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
