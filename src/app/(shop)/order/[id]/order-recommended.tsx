"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Package, ShoppingCart, ChevronRight } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { formatPrice } from "@/lib/utils";
import { apiFetch } from "@/lib/api-fetch";

/* ---------- Types ---------- */

interface RecommendedProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  originalPrice?: number;
  image?: string;
  soldCount: number;
  stockCount: number;
}

/* ---------- Props ---------- */

interface OrderRecommendedProps {
  /** Slugs of products already in the order (to exclude from recommendations) */
  orderSlugs: string[];
}

/* ---------- Component ---------- */

export function OrderRecommended({ orderSlugs }: OrderRecommendedProps) {
  const [products, setProducts] = useState<RecommendedProduct[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    const slugSet = new Set(orderSlugs);

    apiFetch<{ products: RecommendedProduct[] }>(
      "/api/products?sort=popular&limit=8",
      { signal: controller.signal }
    )
      .then((data) => {
        const filtered = data.products
          .filter((p) => !slugSet.has(p.slug))
          .slice(0, 4);
        setProducts(filtered);
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
      });

    return () => controller.abort();
  }, [orderSlugs]);

  if (products.length === 0) return null;

  return (
    <div className="no-print mt-10">
      <Separator className="mb-8" />
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-[var(--primary)]" />
          猜你喜欢
        </h2>
        <Link
          href="/products"
          className="text-sm text-[var(--muted-foreground)] hover:text-[var(--primary)] flex items-center gap-1 transition-colors"
        >
          查看更多
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {products.map((product) => (
          <Link
            key={product.id}
            href={`/products/${product.slug}`}
            className="group rounded-lg border border-[var(--border)] bg-[var(--card)] p-3 transition-all hover:border-[var(--primary)]/40 hover:shadow-md"
          >
            <div className="relative mb-3 aspect-square overflow-hidden rounded-md bg-[var(--muted)]">
              {product.image ? (
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  className="object-cover transition-transform group-hover:scale-105"
                  sizes="(max-width: 640px) 45vw, 20vw"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <Package className="h-8 w-8 text-[var(--muted-foreground)]" />
                </div>
              )}
              {product.stockCount === 0 && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <span className="text-xs font-medium text-white">
                    已售罄
                  </span>
                </div>
              )}
            </div>
            <h3 className="mb-1.5 line-clamp-2 text-sm font-medium leading-snug group-hover:text-[var(--primary)] transition-colors">
              {product.name}
            </h3>
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm font-bold text-[var(--primary)]">
                {formatPrice(product.price)}
              </span>
              {product.originalPrice &&
                product.originalPrice > product.price && (
                  <span className="text-xs text-[var(--muted-foreground)] line-through">
                    {formatPrice(product.originalPrice)}
                  </span>
                )}
            </div>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              已售 {product.soldCount}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
