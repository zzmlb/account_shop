"use client";

import { useCallback } from "react";
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

const CATEGORIES = [
  { id: "email", name: "邮箱账号" },
  { id: "social", name: "社交媒体" },
  { id: "streaming", name: "流媒体" },
  { id: "gaming", name: "游戏账号" },
  { id: "software", name: "软件工具" },
  { id: "vpn", name: "VPN 服务" },
];

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

  const updateFilter = (params: Record<string, string | null>) => {
    const qs = createQueryString(params);
    router.push(`/products${qs ? `?${qs}` : ""}`, { scroll: false });
  };

  const selectedCategories = searchParams?.get("category")?.split(",") ?? [];
  const minPrice = searchParams?.get("minPrice") ?? "";
  const maxPrice = searchParams?.get("maxPrice") ?? "";
  const inStock = searchParams?.get("inStock") === "true";
  const sort = searchParams?.get("sort") ?? "default";

  const toggleCategory = (categoryId: string) => {
    const updated = selectedCategories.includes(categoryId)
      ? selectedCategories.filter((c) => c !== categoryId)
      : [...selectedCategories, categoryId];
    updateFilter({
      category: updated.length > 0 ? updated.join(",") : null,
    });
  };

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
          {CATEGORIES.map((category) => {
            const isChecked = selectedCategories.includes(category.id);
            return (
              <label
                key={category.id}
                className="flex cursor-pointer items-center gap-2"
              >
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={isChecked}
                  onClick={() => toggleCategory(category.id)}
                  className={cn(
                    "flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] border border-[var(--input)] transition-colors",
                    isChecked &&
                      "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]"
                  )}
                >
                  {isChecked && (
                    <svg
                      className="h-3 w-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </button>
                <span className="text-sm text-[var(--foreground)]">
                  {category.name}
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
            placeholder="最低价"
            value={minPrice}
            onChange={(e) =>
              updateFilter({
                minPrice: e.target.value || null,
              })
            }
            className="h-9"
          />
          <span className="text-[var(--muted-foreground)]">-</span>
          <Input
            type="number"
            placeholder="最高价"
            value={maxPrice}
            onChange={(e) =>
              updateFilter({
                maxPrice: e.target.value || null,
              })
            }
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
