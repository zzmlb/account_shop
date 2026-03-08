"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
  slug: string;
  productCount: number;
}

const SORT_OPTIONS = [
  { value: "default", label: "默认排序" },
  { value: "price-asc", label: "价格从低到高" },
  { value: "price-desc", label: "价格从高到低" },
  { value: "newest", label: "最新上架" },
  { value: "best-selling", label: "销量最高" },
];

interface ProductFiltersProps {
  className?: string;
}

export default function ProductFilters({ className }: ProductFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setCategories(data.categories);
      })
      .catch(() => {});
  }, []);

  const createQueryString = useCallback(
    (params: Record<string, string | null>) => {
      const newParams = new URLSearchParams(searchParams?.toString() ?? "");
      Object.entries(params).forEach(([key, value]) => {
        if (value === null) {
          newParams.delete(key);
        } else {
          newParams.set(key, value);
        }
      });
      return newParams.toString();
    },
    [searchParams]
  );

  const updateFilter = useCallback(
    (params: Record<string, string | null>) => {
      const qs = createQueryString(params);
      router.push(`/products${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [createQueryString, router]
  );

  const selectedCategory = searchParams?.get("category") ?? "";
  const urlMinPrice = searchParams?.get("minPrice") ?? "";
  const urlMaxPrice = searchParams?.get("maxPrice") ?? "";
  const inStock = searchParams?.get("inStock") === "true";
  const sort = searchParams?.get("sort") ?? "default";

  // Local price state + debounce for smooth typing
  const [localMinPrice, setLocalMinPrice] = useState(urlMinPrice);
  const [localMaxPrice, setLocalMaxPrice] = useState(urlMaxPrice);
  const priceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync local state when URL changes externally
  useEffect(() => { setLocalMinPrice(urlMinPrice); }, [urlMinPrice]);
  useEffect(() => { setLocalMaxPrice(urlMaxPrice); }, [urlMaxPrice]);

  const debouncedPriceUpdate = useCallback(
    (key: "minPrice" | "maxPrice", value: string) => {
      if (priceTimerRef.current) clearTimeout(priceTimerRef.current);
      priceTimerRef.current = setTimeout(() => {
        updateFilter({ [key]: value || null });
      }, 500);
    },
    [updateFilter]
  );

  return (
    <div className={cn("space-y-6", className)}>
      {/* Sort */}
      <div>
        <h4 className="mb-3 text-sm font-semibold text-[var(--foreground)]">
          排序方式
        </h4>
        <Select
          value={sort}
          onValueChange={(value) =>
            updateFilter({ sort: value === "default" ? null : value })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="默认排序" />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Categories */}
      <div>
        <h4 className="mb-3 text-sm font-semibold text-[var(--foreground)]">
          商品分类
        </h4>
        <div className="space-y-2">
          {/* All categories option */}
          <label className="flex cursor-pointer items-center gap-2">
            <button
              type="button"
              role="radio"
              aria-checked={!selectedCategory}
              onClick={() => updateFilter({ category: null })}
              className={cn(
                "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-[var(--input)] transition-colors",
                !selectedCategory &&
                  "border-[var(--primary)] bg-[var(--primary)]"
              )}
            >
              {!selectedCategory && (
                <span className="block h-2 w-2 rounded-full bg-white" />
              )}
            </button>
            <span className="text-sm text-[var(--foreground)]">全部</span>
          </label>
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.name;
            return (
              <label
                key={cat.id}
                className="flex cursor-pointer items-center gap-2"
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() =>
                    updateFilter({
                      category: isSelected ? null : cat.name,
                    })
                  }
                  className={cn(
                    "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-[var(--input)] transition-colors",
                    isSelected &&
                      "border-[var(--primary)] bg-[var(--primary)]"
                  )}
                >
                  {isSelected && (
                    <span className="block h-2 w-2 rounded-full bg-white" />
                  )}
                </button>
                <span className="text-sm text-[var(--foreground)]">
                  {cat.name}
                </span>
                <span className="ml-auto text-xs text-[var(--muted-foreground)]">
                  {cat.productCount}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Price range */}
      <div>
        <h4 className="mb-3 text-sm font-semibold text-[var(--foreground)]">
          价格范围
        </h4>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min="0"
            step="0.01"
            placeholder="最低价"
            value={localMinPrice}
            onChange={(e) => {
              setLocalMinPrice(e.target.value);
              debouncedPriceUpdate("minPrice", e.target.value);
            }}
            className="h-9"
          />
          <span className="text-[var(--muted-foreground)]">-</span>
          <Input
            type="number"
            min="0"
            step="0.01"
            placeholder="最高价"
            value={localMaxPrice}
            onChange={(e) => {
              setLocalMaxPrice(e.target.value);
              debouncedPriceUpdate("maxPrice", e.target.value);
            }}
            className="h-9"
          />
        </div>
      </div>

      {/* In stock toggle */}
      <div>
        <label className="flex cursor-pointer items-center justify-between">
          <span className="text-sm font-semibold text-[var(--foreground)]">
            仅显示有货
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={inStock}
            onClick={() =>
              updateFilter({ inStock: inStock ? null : "true" })
            }
            className={cn(
              "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors",
              inStock ? "bg-[var(--primary)]" : "bg-[var(--input)]"
            )}
          >
            <span
              className={cn(
                "pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
                inStock ? "translate-x-4" : "translate-x-0"
              )}
            />
          </button>
        </label>
      </div>
    </div>
  );
}
