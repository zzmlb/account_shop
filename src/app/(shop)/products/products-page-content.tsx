"use client";

import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
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

const MOCK_PRODUCTS: ProductItem[] = [
  {
    name: "Gmail 全新账号",
    slug: "gmail-new-account",
    price: 5.99,
    originalPrice: 9.99,
    stockCount: 128,
    soldCount: 2341,
    categoryName: "邮箱账号",
  },
  {
    name: "Outlook 企业邮箱",
    slug: "outlook-enterprise",
    price: 12.99,
    originalPrice: 19.99,
    stockCount: 56,
    soldCount: 1892,
    categoryName: "邮箱账号",
  },
  {
    name: "Twitter / X 高质量账号",
    slug: "twitter-x-premium",
    price: 29.99,
    originalPrice: 49.99,
    stockCount: 3,
    soldCount: 876,
    categoryName: "社交媒体",
  },
  {
    name: "Instagram 老号带粉",
    slug: "instagram-aged-account",
    price: 45.00,
    stockCount: 12,
    soldCount: 654,
    categoryName: "社交媒体",
  },
  {
    name: "Netflix 高级会员 1 个月",
    slug: "netflix-premium-1m",
    price: 15.99,
    originalPrice: 25.00,
    stockCount: 200,
    soldCount: 5678,
    categoryName: "流媒体",
  },
  {
    name: "Spotify Premium 年卡",
    slug: "spotify-premium-yearly",
    price: 39.99,
    originalPrice: 68.00,
    stockCount: 89,
    soldCount: 3421,
    categoryName: "流媒体",
  },
  {
    name: "Steam 余额账号 $50",
    slug: "steam-balance-50",
    price: 199.00,
    originalPrice: 350.00,
    stockCount: 0,
    soldCount: 1243,
    categoryName: "游戏账号",
  },
  {
    name: "Epic Games 全游戏库账号",
    slug: "epic-games-full-library",
    price: 89.99,
    stockCount: 7,
    soldCount: 432,
    categoryName: "游戏账号",
  },
  {
    name: "ChatGPT Plus 共享账号",
    slug: "chatgpt-plus-shared",
    price: 19.99,
    originalPrice: 29.99,
    stockCount: 45,
    soldCount: 7890,
    categoryName: "软件工具",
  },
  {
    name: "Adobe Creative Cloud 年订阅",
    slug: "adobe-cc-yearly",
    price: 129.00,
    originalPrice: 199.00,
    stockCount: 18,
    soldCount: 2156,
    categoryName: "软件工具",
  },
  {
    name: "NordVPN 2 年套餐",
    slug: "nordvpn-2-years",
    price: 59.99,
    originalPrice: 99.00,
    stockCount: 67,
    soldCount: 4532,
    categoryName: "VPN 服务",
  },
  {
    name: "ExpressVPN 1 年订阅",
    slug: "expressvpn-1-year",
    price: 49.99,
    originalPrice: 79.99,
    stockCount: 34,
    soldCount: 3210,
    categoryName: "VPN 服务",
  },
];

export default function ProductsPageContent() {
  const [page, setPage] = useState(1);
  const perPage = 9;
  const totalPages = Math.ceil(MOCK_PRODUCTS.length / perPage);
  const paginatedProducts = MOCK_PRODUCTS.slice(
    (page - 1) * perPage,
    page * perPage
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[var(--foreground)]">
            全部商品
          </h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            共 {MOCK_PRODUCTS.length} 件商品
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
          <ProductGrid products={paginatedProducts} />

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
