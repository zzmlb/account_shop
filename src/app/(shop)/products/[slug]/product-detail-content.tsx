"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ChevronRight,
  ShoppingCart,
  Zap,
  ShieldCheck,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PriceTag from "@/components/shared/price-tag";
import StockBadge from "@/components/shared/stock-badge";
import QuantitySelector from "@/components/product/quantity-selector";
import ProductCard from "@/components/product/product-card";

interface Product {
  name: string;
  slug: string;
  price: number;
  originalPrice?: number;
  stockCount: number;
  soldCount: number;
  categoryName: string;
  description: string;
  instructions: string;
  afterSales: string;
}

interface RelatedProduct {
  name: string;
  slug: string;
  price: number;
  originalPrice?: number;
  stockCount: number;
  soldCount: number;
  categoryName: string;
}

interface ProductDetailContentProps {
  product: Product;
  relatedProducts: RelatedProduct[];
}

export default function ProductDetailContent({
  product,
  relatedProducts,
}: ProductDetailContentProps) {
  const [quantity, setQuantity] = useState(1);

  const trustBadges = [
    { icon: Zap, label: "即时交付", desc: "付款后自动发货" },
    { icon: ShieldCheck, label: "质保保障", desc: "售后无忧保障" },
    { icon: Lock, label: "安全支付", desc: "加密安全交易" },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-1 text-sm text-[var(--muted-foreground)]">
        <Link
          href="/products"
          className="transition-colors hover:text-[var(--foreground)]"
        >
          全部商品
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-[var(--foreground)]">{product.categoryName}</span>
        <ChevronRight className="h-4 w-4" />
        <span className="truncate text-[var(--foreground)]">
          {product.name}
        </span>
      </nav>

      {/* Product main section */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Left: Image placeholder */}
        <div className="relative aspect-square overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)]">
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[var(--primary)]/20 via-[var(--accent)]/10 to-[var(--primary)]/5">
            <div className="text-center">
              <div className="text-7xl font-bold text-[var(--primary)]/20">
                {product.name.charAt(0)}
              </div>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                {product.categoryName}
              </p>
            </div>
          </div>
          {product.originalPrice && product.originalPrice > product.price && (
            <div className="absolute right-4 top-4 rounded-[var(--radius-sm)] bg-[var(--destructive)] px-2 py-1 text-sm font-bold text-[var(--destructive-foreground)]">
              -
              {Math.round(
                ((product.originalPrice - product.price) /
                  product.originalPrice) *
                  100
              )}
              %
            </div>
          )}
        </div>

        {/* Right: Product info */}
        <div className="flex flex-col">
          {/* Category */}
          <div className="mb-2">
            <span className="inline-block rounded-full bg-[var(--primary)]/10 px-3 py-1 text-xs font-medium text-[var(--primary)]">
              {product.categoryName}
            </span>
          </div>

          {/* Name */}
          <h1 className="mb-4 text-2xl font-bold text-[var(--foreground)] sm:text-3xl">
            {product.name}
          </h1>

          {/* Price */}
          <div className="mb-4">
            <PriceTag
              price={product.price}
              originalPrice={product.originalPrice}
              className="text-3xl"
            />
          </div>

          {/* Stock & Sold */}
          <div className="mb-6 flex items-center gap-4">
            <StockBadge stockCount={product.stockCount} />
            <span className="text-sm text-[var(--muted-foreground)]">
              累计销量 {product.soldCount.toLocaleString()} 件
            </span>
          </div>

          {/* Divider */}
          <div className="mb-6 h-px bg-[var(--border)]" />

          {/* Quantity */}
          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium text-[var(--foreground)]">
              购买数量
            </label>
            <QuantitySelector
              value={quantity}
              onChange={setQuantity}
              max={product.stockCount > 0 ? product.stockCount : 1}
            />
            {product.stockCount > 0 && product.stockCount <= 10 && (
              <p className="mt-1 text-xs text-[var(--warning)]">
                仅剩 {product.stockCount} 件，欲购从速
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div className="mb-6 flex gap-3">
            <Button
              size="lg"
              className="flex-1 text-base"
              disabled={product.stockCount <= 0}
            >
              <Zap className="mr-2 h-5 w-5" />
              {product.stockCount <= 0 ? "暂时缺货" : "立即购买"}
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="flex-1 text-base"
              disabled={product.stockCount <= 0}
            >
              <ShoppingCart className="mr-2 h-5 w-5" />
              加入购物车
            </Button>
          </div>

          {/* Trust badges */}
          <div className="grid grid-cols-3 gap-3">
            {trustBadges.map((badge) => (
              <div
                key={badge.label}
                className="flex flex-col items-center rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card)] px-3 py-3 text-center"
              >
                <badge.icon className="mb-1.5 h-5 w-5 text-[var(--primary)]" />
                <span className="text-xs font-semibold text-[var(--foreground)]">
                  {badge.label}
                </span>
                <span className="text-[10px] text-[var(--muted-foreground)]">
                  {badge.desc}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs section */}
      <div className="mt-12">
        <Tabs defaultValue="description">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="description" className="flex-1 sm:flex-none">
              商品描述
            </TabsTrigger>
            <TabsTrigger value="instructions" className="flex-1 sm:flex-none">
              使用说明
            </TabsTrigger>
            <TabsTrigger value="after-sales" className="flex-1 sm:flex-none">
              售后规则
            </TabsTrigger>
          </TabsList>
          <TabsContent
            value="description"
            className="mt-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-6"
          >
            <p className="whitespace-pre-line leading-relaxed text-[var(--card-foreground)]">
              {product.description}
            </p>
          </TabsContent>
          <TabsContent
            value="instructions"
            className="mt-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-6"
          >
            <div className="space-y-2">
              {product.instructions.split("\n").map((line, i) => (
                <p
                  key={i}
                  className="leading-relaxed text-[var(--card-foreground)]"
                >
                  {line}
                </p>
              ))}
            </div>
          </TabsContent>
          <TabsContent
            value="after-sales"
            className="mt-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-6"
          >
            <div className="space-y-2">
              {product.afterSales.split("\n").map((line, i) => (
                <p
                  key={i}
                  className="leading-relaxed text-[var(--card-foreground)]"
                >
                  {line}
                </p>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Related products */}
      {relatedProducts.length > 0 && (
        <div className="mt-12">
          <h2 className="mb-6 text-xl font-bold text-[var(--foreground)]">
            相关商品
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {relatedProducts.map((rp) => (
              <ProductCard key={rp.slug} {...rp} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
