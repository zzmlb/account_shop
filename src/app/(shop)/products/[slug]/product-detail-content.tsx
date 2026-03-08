"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  ChevronRight,
  ShoppingCart,
  Zap,
  ShieldCheck,
  Lock,
  Clock,
  CheckCircle,
  BellRing,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PriceTag from "@/components/shared/price-tag";
import StockBadge from "@/components/shared/stock-badge";
import QuantitySelector from "@/components/product/quantity-selector";
import ProductCard from "@/components/product/product-card";
import FavoriteButton from "@/components/product/favorite-button";
import ShareButtons from "@/components/product/share-buttons";
import dynamic from "next/dynamic";

const ProductReviews = dynamic(() => import("@/components/product/product-reviews"), {
  loading: () => (
    <div className="mt-12 animate-pulse space-y-4">
      <div className="h-8 w-48 rounded bg-[var(--muted)]" />
      <div className="h-32 rounded-lg bg-[var(--muted)]" />
    </div>
  ),
});
import { useCartStore } from "@/stores/cart-store";
import { useRecentlyViewedStore } from "@/stores/recently-viewed-store";
import { BLUR_DATA_URL } from "@/lib/constants";

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  originalPrice?: number;
  image?: string;
  images?: string[];
  stockCount: number;
  soldCount: number;
  categoryName: string;
  categorySlug?: string;
  description: string;
  instructions: string;
  afterSales: string;
}

interface RelatedProduct {
  productId?: string;
  name: string;
  slug: string;
  price: number;
  originalPrice?: number;
  image?: string;
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
  // Build gallery: combine primary image + additional images, deduped
  const allImages = (() => {
    const imgs: string[] = [];
    if (product.image) imgs.push(product.image);
    if (product.images) {
      for (const img of product.images) {
        if (!imgs.includes(img)) imgs.push(img);
      }
    }
    return imgs;
  })();

  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [mainImgError, setMainImgError] = useState(false);
  const [thumbErrors, setThumbErrors] = useState<Set<number>>(new Set());
  const [quantity, setQuantity] = useState(1);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const currentImage = (!mainImgError && allImages[selectedImageIdx]) || null;
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);
  const cartItems = useCartStore((s) => s.items);
  const addRecentlyViewed = useRecentlyViewedStore((s) => s.addItem);
  const recentlyViewedItems = useRecentlyViewedStore((s) => s.items);
  const inCartItem = cartItems.find((i) => i.productId === product.id);
  const inCartQty = inCartItem?.quantity ?? 0;
  const [stockNotifyDone, setStockNotifyDone] = useState(false);

  const handleImageMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomPos({ x, y });
  }, []);

  // Track recently viewed
  useEffect(() => {
    addRecentlyViewed({
      slug: product.slug,
      name: product.name,
      price: product.price,
      originalPrice: product.originalPrice,
      image: product.image,
      categoryName: product.categoryName,
      productId: product.id,
      stockCount: product.stockCount,
      soldCount: product.soldCount,
    });
  }, [product.slug]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAddToCart = () => {
    addItem({
      id: product.slug,
      productId: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      originalPrice: product.originalPrice,
      quantity,
      maxStock: product.stockCount,
    });
    toast.success("已加入购物车", {
      description: `${product.name} x${quantity}`,
    });
  };

  const handleBuyNow = () => {
    addItem({
      id: product.slug,
      productId: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      originalPrice: product.originalPrice,
      quantity,
      maxStock: product.stockCount,
    });
    router.push("/checkout");
  };

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
        <Link
          href={`/products?category=${encodeURIComponent(product.categoryName)}`}
          className="transition-colors hover:text-[var(--foreground)]"
        >
          {product.categoryName}
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="truncate text-[var(--foreground)]">
          {product.name}
        </span>
      </nav>

      {/* Product main section */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Left: Product image gallery */}
        <div className="space-y-3">
          {/* Main image */}
          <div
            ref={imageContainerRef}
            className="relative aspect-square overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] cursor-zoom-in touch-pan-y"
            onMouseEnter={() => currentImage && setIsZoomed(true)}
            onMouseLeave={() => setIsZoomed(false)}
            onMouseMove={handleImageMouseMove}
            onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
            onTouchEnd={(e) => {
              if (allImages.length <= 1) return;
              const diff = touchStartX.current - e.changedTouches[0].clientX;
              if (Math.abs(diff) > 50) {
                setMainImgError(false);
                if (diff > 0) {
                  setSelectedImageIdx((prev) => (prev < allImages.length - 1 ? prev + 1 : 0));
                } else {
                  setSelectedImageIdx((prev) => (prev > 0 ? prev - 1 : allImages.length - 1));
                }
              }
            }}
          >
            {currentImage ? (
              <Image
                src={currentImage}
                alt={`${product.name} - ${selectedImageIdx + 1}`}
                fill
                className={`object-cover transition-transform duration-200 ${
                  isZoomed ? "scale-[2]" : ""
                }`}
                style={
                  isZoomed
                    ? { transformOrigin: `${zoomPos.x}% ${zoomPos.y}%` }
                    : undefined
                }
                sizes="(max-width: 768px) 100vw, 50vw"
                priority
                placeholder="blur"
                blurDataURL={BLUR_DATA_URL}
                onError={() => setMainImgError(true)}
              />
            ) : (
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
            )}
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
            {/* Image counter */}
            {allImages.length > 1 && (
              <div className="absolute bottom-3 left-3 rounded-[var(--radius-sm)] bg-black/60 px-2 py-1 text-xs font-medium text-white">
                {selectedImageIdx + 1} / {allImages.length}
              </div>
            )}
          </div>

          {/* Thumbnail strip */}
          {allImages.length > 1 && (
            <div
              className="flex gap-2 overflow-x-auto pb-1"
              role="listbox"
              aria-label="商品图片选择"
              onKeyDown={(e) => {
                if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                  e.preventDefault();
                  setMainImgError(false);
                  setSelectedImageIdx((prev) => (prev > 0 ? prev - 1 : allImages.length - 1));
                } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                  e.preventDefault();
                  setMainImgError(false);
                  setSelectedImageIdx((prev) => (prev < allImages.length - 1 ? prev + 1 : 0));
                }
              }}
            >
              {allImages.map((img, idx) => (
                <button
                  key={idx}
                  role="option"
                  aria-selected={idx === selectedImageIdx}
                  aria-label={`查看第 ${idx + 1} 张图片`}
                  onClick={() => { setSelectedImageIdx(idx); setMainImgError(false); }}
                  className={`relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-[var(--radius-md)] border-2 transition-all ${
                    idx === selectedImageIdx
                      ? "border-[var(--primary)] ring-1 ring-[var(--primary)]/30"
                      : "border-[var(--border)] hover:border-[var(--primary)]/50"
                  }`}
                >
                  {thumbErrors.has(idx) ? (
                    <div className="flex h-full w-full items-center justify-center bg-[var(--muted)] text-xs text-[var(--muted-foreground)]">
                      {idx + 1}
                    </div>
                  ) : (
                    <Image
                      src={img}
                      alt={`${product.name} 缩略图 ${idx + 1}`}
                      fill
                      className="object-cover"
                      sizes="64px"
                      placeholder="blur"
                      blurDataURL={BLUR_DATA_URL}
                      onError={() => setThumbErrors((prev) => new Set(prev).add(idx))}
                    />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Product info */}
        <div className="flex flex-col">
          {/* Category + Actions */}
          <div className="mb-2 flex items-center justify-between">
            <span className="inline-block rounded-full bg-[var(--primary)]/10 px-3 py-1 text-xs font-medium text-[var(--primary)]">
              {product.categoryName}
            </span>
            <div className="flex items-center gap-1">
              <FavoriteButton productId={product.id} size="md" />
              <ShareButtons title={product.name} />
            </div>
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
          <div className="mb-6 space-y-2">
            <div className="flex items-center gap-4">
              <StockBadge stockCount={product.stockCount} />
              <span className="text-sm text-[var(--muted-foreground)]">
                累计销量 {product.soldCount.toLocaleString()} 件
              </span>
            </div>
            {product.stockCount > 0 && product.stockCount <= 20 && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className={product.stockCount <= 5 ? "text-[var(--destructive)] font-medium" : "text-[var(--warning)]"}>
                    仅剩 {product.stockCount} 件库存
                  </span>
                  <span className="text-[var(--muted-foreground)]">
                    {Math.round((product.stockCount / (product.stockCount + product.soldCount)) * 100)}% 剩余
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--muted)]">
                  <div
                    className={`h-full rounded-full transition-all ${
                      product.stockCount <= 5
                        ? "bg-[var(--destructive)]"
                        : product.stockCount <= 10
                          ? "bg-[var(--warning)]"
                          : "bg-[var(--primary)]"
                    }`}
                    style={{
                      width: `${Math.max(5, Math.round((product.stockCount / (product.stockCount + product.soldCount)) * 100))}%`,
                    }}
                  />
                </div>
              </div>
            )}
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
              onClick={handleBuyNow}
              aria-label={product.stockCount <= 0 ? "暂时缺货" : `立即购买 ${product.name}`}
            >
              <Zap className="mr-2 h-5 w-5" />
              {product.stockCount <= 0 ? "暂时缺货" : "立即购买"}
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="flex-1 text-base"
              disabled={product.stockCount <= 0}
              onClick={handleAddToCart}
              aria-label={`将 ${product.name} 加入购物车`}
            >
              <ShoppingCart className="mr-2 h-5 w-5" />
              加入购物车
            </Button>
          </div>

          {/* Out of stock notification */}
          {product.stockCount <= 0 && (
            <div className="mb-4 rounded-[var(--radius-md)] border border-[var(--warning)]/30 bg-[var(--warning)]/5 px-4 py-3">
              {stockNotifyDone ? (
                <div className="flex items-center gap-2 text-sm text-[var(--success)]">
                  <CheckCircle className="h-4 w-4" />
                  已记录，补货后将优先通知您
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-[var(--foreground)]">
                    <BellRing className="h-4 w-4 text-[var(--warning)]" />
                    该商品暂时缺货
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-xs"
                    onClick={() => {
                      const stored = JSON.parse(localStorage.getItem("stock-notify") || "[]");
                      if (!stored.includes(product.slug)) {
                        stored.push(product.slug);
                        localStorage.setItem("stock-notify", JSON.stringify(stored));
                      }
                      setStockNotifyDone(true);
                      toast.success("已订阅补货通知");
                    }}
                  >
                    <BellRing className="h-3.5 w-3.5" />
                    到货提醒
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Already in cart indicator */}
          {inCartQty > 0 && (
            <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--primary)]/30 bg-[var(--primary)]/5 px-4 py-2">
              <CheckCircle className="h-4 w-4 text-[var(--primary)]" />
              <span className="text-sm text-[var(--foreground)]">
                已在购物车中 ({inCartQty} 件)
              </span>
              <Link
                href="/checkout"
                className="ml-auto text-sm font-medium text-[var(--primary)] hover:underline"
              >
                去结算
              </Link>
            </div>
          )}

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

          {/* Delivery estimate */}
          <div className="mt-4 rounded-[var(--radius-md)] border border-green-500/20 bg-green-500/5 px-4 py-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-[var(--foreground)]">
                预计交付时间
              </span>
            </div>
            <div className="mt-1 flex items-center gap-1.5 pl-6">
              <CheckCircle className="h-3 w-3 text-green-500" />
              <span className="text-xs text-[var(--muted-foreground)]">
                {product.stockCount > 0
                  ? "付款后即时自动发货，秒级到账"
                  : "补货后将尽快处理发货"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs section */}
      <div className="mt-12">
        <Tabs defaultValue="description">
          <TabsList className="w-full justify-start" aria-label="商品详情">
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

      {/* Reviews */}
      <ProductReviews productId={product.id} />

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

      {/* Recently viewed (exclude current product) */}
      {(() => {
        const recent = recentlyViewedItems.filter((i) => i.slug !== product.slug).slice(0, 4);
        if (recent.length === 0) return null;
        return (
          <div className="mt-12">
            <div className="mb-6 flex items-center gap-2">
              <Clock className="h-5 w-5 text-[var(--primary)]" />
              <h2 className="text-xl font-bold text-[var(--foreground)]">
                最近浏览
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {recent.map((item) => (
                <ProductCard
                  key={item.slug}
                  productId={item.productId}
                  name={item.name}
                  slug={item.slug}
                  price={item.price}
                  originalPrice={item.originalPrice}
                  image={item.image}
                  stockCount={item.stockCount ?? 1}
                  soldCount={item.soldCount ?? 0}
                  categoryName={item.categoryName}
                />
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
