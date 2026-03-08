"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ShoppingCart,
  Trash2,
  Minus,
  Plus,
  ArrowRight,
  ShoppingBag,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useCartStore, type CartItem } from "@/stores/cart-store";
import { formatPrice } from "@/lib/utils";

export default function CartPageContent() {
  const { items, removeItem, updateQuantity, clearCart, getTotal, getItemCount } =
    useCartStore();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-12">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 rounded bg-[var(--muted)]" />
          <div className="h-24 rounded-[var(--radius-lg)] bg-[var(--muted)]" />
          <div className="h-24 rounded-[var(--radius-lg)] bg-[var(--muted)]" />
        </div>
      </div>
    );
  }

  const total = getTotal();
  const itemCount = getItemCount();

  if (items.length === 0) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-16">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-[var(--muted)]">
            <ShoppingCart className="h-10 w-10 text-[var(--muted-foreground)]" />
          </div>
          <h1 className="mb-2 text-2xl font-bold text-[var(--foreground)]">
            购物车是空的
          </h1>
          <p className="mb-8 max-w-sm text-[var(--muted-foreground)]">
            还没有添加商品到购物车，去浏览我们的商品吧
          </p>
          <Button asChild size="lg" className="gap-2">
            <Link href="/products">
              <ShoppingBag className="h-4 w-4" />
              浏览商品
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">
            购物车
          </h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            共 {itemCount} 件商品
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearCart}
          className="text-[var(--muted-foreground)] hover:text-[var(--destructive)]"
        >
          <Trash2 className="mr-1.5 h-4 w-4" />
          清空购物车
        </Button>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Cart items list */}
        <div className="space-y-4 lg:col-span-2">
          {items.map((item) => (
            <CartItemRow
              key={item.productId}
              item={item}
              onUpdateQuantity={updateQuantity}
              onRemove={removeItem}
            />
          ))}
        </div>

        {/* Order summary sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-20 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-6">
            <h2 className="mb-4 text-lg font-semibold text-[var(--foreground)]">
              订单汇总
            </h2>

            <div className="space-y-3 text-sm">
              {items.map((item) => (
                <div
                  key={item.productId}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="truncate text-[var(--muted-foreground)]">
                    {item.name} x{item.quantity}
                  </span>
                  <span className="flex-shrink-0 text-[var(--foreground)]">
                    {formatPrice(item.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            <Separator className="my-4" />

            <div className="flex items-center justify-between">
              <span className="text-base font-semibold text-[var(--foreground)]">
                合计
              </span>
              <span className="text-2xl font-bold text-[var(--primary)]">
                {formatPrice(total)}
              </span>
            </div>

            <Button
              className="mt-6 w-full gap-2"
              size="lg"
              onClick={() => router.push("/checkout")}
            >
              去结算
              <ArrowRight className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              className="mt-2 w-full gap-2 text-[var(--muted-foreground)]"
              asChild
            >
              <Link href="/products">
                <ArrowLeft className="h-4 w-4" />
                继续购物
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CartItemRow({
  item,
  onUpdateQuantity,
  onRemove,
}: {
  item: CartItem;
  onUpdateQuantity: (productId: string, qty: number) => void;
  onRemove: (productId: string) => void;
}) {
  const subtotal = item.price * item.quantity;

  return (
    <div className="group flex gap-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-4 transition-colors hover:bg-[var(--card-hover)]">
      {/* Image */}
      <Link
        href={`/products/${item.slug}`}
        className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-[var(--radius-md)]"
      >
        {item.image ? (
          <Image
            src={item.image}
            alt={item.name}
            fill
            className="object-cover"
            sizes="96px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[var(--primary)]/20 via-[var(--accent)]/10 to-[var(--primary)]/5">
            <span className="text-2xl font-bold text-[var(--primary)]/40">
              {item.name.charAt(0)}
            </span>
          </div>
        )}
      </Link>

      {/* Info */}
      <div className="flex min-w-0 flex-1 flex-col justify-between">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              href={`/products/${item.slug}`}
              className="text-base font-medium text-[var(--foreground)] transition-colors hover:text-[var(--primary)]"
            >
              {item.name}
            </Link>
            <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">
              单价: {formatPrice(item.price)}
            </p>
            {item.maxStock <= 5 && item.maxStock > 0 && (
              <p className="mt-0.5 text-xs text-[var(--warning)]">
                仅剩 {item.maxStock} 件
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onRemove(item.productId)}
            className="h-8 w-8 flex-shrink-0 text-[var(--muted-foreground)] opacity-0 transition-all hover:text-[var(--destructive)] group-hover:opacity-100"
            aria-label={`移除 ${item.name}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center justify-between">
          {/* Quantity controls */}
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={() => onUpdateQuantity(item.productId, item.quantity - 1)}
              disabled={item.quantity <= 1}
              className="h-8 w-8"
              aria-label="减少数量"
            >
              <Minus className="h-3.5 w-3.5" />
            </Button>
            <span className="min-w-[2.5rem] text-center text-sm font-medium text-[var(--foreground)]">
              {item.quantity}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => onUpdateQuantity(item.productId, item.quantity + 1)}
              disabled={item.quantity >= item.maxStock}
              className="h-8 w-8"
              aria-label="增加数量"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Subtotal */}
          <span className="text-lg font-semibold text-[var(--primary)]">
            {formatPrice(subtotal)}
          </span>
        </div>
      </div>
    </div>
  );
}
