"use client";

import { memo } from "react";
import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatPrice } from "@/lib/utils";
import { useCartStore, type CartItem as CartItemType } from "@/stores/cart-store";

interface CartItemProps {
  item: CartItemType;
  compact?: boolean;
}

function CartItemInner({ item, compact = false }: CartItemProps) {
  const { updateQuantity, removeItem } = useCartStore();

  const subtotal = item.price * item.quantity;

  return (
    <div
      className={cn(
        "group flex gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card)] p-3 transition-colors hover:bg-[var(--card-hover)]",
        compact && "p-2"
      )}
    >
      {/* Product image / placeholder */}
      <Link
        href={`/products/${item.slug}`}
        className={cn(
          "relative flex-shrink-0 overflow-hidden rounded-[var(--radius-sm)]",
          compact ? "h-14 w-14" : "h-20 w-20"
        )}
      >
        {item.image ? (
          <Image
            src={item.image}
            alt={item.name}
            fill
            className="object-cover"
            sizes={compact ? "56px" : "80px"}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[var(--primary)]/20 via-[var(--accent)]/10 to-[var(--primary)]/5">
            <span className="text-lg font-bold text-[var(--primary)]/40">
              {item.name.charAt(0)}
            </span>
          </div>
        )}
      </Link>

      {/* Info area */}
      <div className="flex min-w-0 flex-1 flex-col justify-between">
        {/* Top row: name + remove */}
        <div className="flex items-start justify-between gap-2">
          <Link
            href={`/products/${item.slug}`}
            className={cn(
              "truncate font-medium text-[var(--foreground)] transition-colors hover:text-[var(--primary)]",
              compact ? "text-xs" : "text-sm"
            )}
          >
            {item.name}
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => removeItem(item.productId)}
            className="h-6 w-6 flex-shrink-0 text-[var(--muted-foreground)] opacity-0 transition-all hover:text-[var(--destructive)] group-hover:opacity-100"
            aria-label="移除商品"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Low stock warning */}
        {item.maxStock <= 3 && item.maxStock > 0 && (
          <p className={cn("text-[var(--warning)]", compact ? "text-[10px]" : "text-xs")}>
            仅剩 {item.maxStock} 件
          </p>
        )}

        {/* Bottom row: quantity + price */}
        <div className="flex items-center justify-between gap-2">
          {/* Quantity selector */}
          <div className="flex items-center gap-0.5">
            <Button
              variant="outline"
              size="icon"
              onClick={() => updateQuantity(item.productId, item.quantity - 1)}
              disabled={item.quantity <= 1}
              className="h-7 w-7 rounded-[var(--radius-sm)]"
              aria-label="减少数量"
            >
              <Minus className="h-3 w-3" />
            </Button>
            <span
              className={cn(
                "min-w-[2rem] text-center font-medium text-[var(--foreground)]",
                compact ? "text-xs" : "text-sm"
              )}
            >
              {item.quantity}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => updateQuantity(item.productId, item.quantity + 1)}
              disabled={item.quantity >= item.maxStock}
              className="h-7 w-7 rounded-[var(--radius-sm)]"
              aria-label="增加数量"
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>

          {/* Subtotal */}
          <div className="flex flex-col items-end">
            <span
              className={cn(
                "font-semibold text-[var(--primary)]",
                compact ? "text-xs" : "text-sm"
              )}
            >
              {formatPrice(subtotal)}
            </span>
            {item.quantity > 1 && (
              <span className="text-[10px] text-[var(--muted-foreground)]">
                {formatPrice(item.price)}/件
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const CartItem = memo(CartItemInner);
export default CartItem;
