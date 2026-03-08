"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Clock, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import ProductCard from "@/components/product/product-card";
import { useRecentlyViewedStore } from "@/stores/recently-viewed-store";

export default function RecentlyViewed() {
  const items = useRecentlyViewedStore((s) => s.items);
  const clearAll = useRecentlyViewedStore((s) => s.clearAll);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render during SSR or if no items
  if (!mounted || items.length === 0) return null;

  // Show up to 4 items
  const displayed = items.slice(0, 4);

  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-[var(--primary)]" />
          <h2 className="text-xl font-bold text-[var(--foreground)] sm:text-2xl">
            最近浏览
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="gap-1 text-xs text-[var(--muted-foreground)] hover:text-[var(--destructive)]"
          >
            <X className="h-3 w-3" />
            清除记录
          </Button>
          <Link
            href="/products"
            className="flex items-center gap-1 text-sm text-[var(--muted-foreground)] transition-colors hover:text-[var(--primary)]"
          >
            查看全部
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {displayed.map((item) => (
          <ProductCard
            key={item.slug}
            productId={item.productId}
            name={item.name}
            slug={item.slug}
            price={item.price}
            originalPrice={item.originalPrice}
            image={item.image}
            stockCount={1}
            soldCount={0}
            categoryName={item.categoryName}
          />
        ))}
      </div>
    </section>
  );
}
