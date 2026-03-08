"use client";

import Link from "next/link";
import { ShoppingBag, ArrowRight } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";
import { useCartStore } from "@/stores/cart-store";
import CartItem from "./cart-item";

export default function CartSheet() {
  const { items, isOpen, toggleCart, getTotal, getItemCount } = useCartStore();

  const total = getTotal();
  const itemCount = getItemCount();

  return (
    <Sheet open={isOpen} onOpenChange={toggleCart}>
      <SheetContent
        side="right"
        className="flex w-full flex-col p-0 sm:max-w-md"
      >
        {/* Header */}
        <SheetHeader className="border-b border-[var(--border)] px-6 py-4">
          <div className="flex items-center gap-3">
            <SheetTitle className="flex items-center gap-2 text-lg">
              <ShoppingBag className="h-5 w-5 text-[var(--primary)]" />
              购物车
            </SheetTitle>
            {itemCount > 0 && (
              <Badge variant="default" className="text-xs">
                {itemCount} 件
              </Badge>
            )}
          </div>
          <SheetDescription className="sr-only">
            查看和管理购物车中的商品
          </SheetDescription>
        </SheetHeader>

        {/* Content */}
        {items.length === 0 ? (
          /* Empty state */
          <div className="flex flex-1 flex-col items-center justify-center px-6">
            <div className="mb-4 rounded-full bg-[var(--muted)] p-6">
              <ShoppingBag className="h-12 w-12 text-[var(--muted-foreground)]" />
            </div>
            <h3 className="mb-1 text-lg font-semibold text-[var(--foreground)]">
              购物车是空的
            </h3>
            <p className="mb-6 text-sm text-[var(--muted-foreground)]">
              快去挑选心仪的数字商品吧
            </p>
            <Button asChild onClick={toggleCart}>
              <Link href="/products">
                去逛逛
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        ) : (
          <>
            {/* Scrollable items list */}
            <ScrollArea className="flex-1 px-6">
              <div className="space-y-3 py-4">
                {items.map((item) => (
                  <CartItem key={item.productId} item={item} compact />
                ))}
              </div>
            </ScrollArea>

            {/* Bottom sticky area */}
            <div className="border-t border-[var(--border)] bg-[var(--background)] px-6 py-4">
              {/* Subtotal */}
              <div className="mb-3 space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--muted-foreground)]">
                    小计 ({itemCount} 件)
                  </span>
                  <span className="text-[var(--foreground)]">
                    {formatPrice(total)}
                  </span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[var(--foreground)]">
                    合计
                  </span>
                  <span className="text-xl font-bold text-[var(--primary)]">
                    {formatPrice(total)}
                  </span>
                </div>
              </div>

              {/* Checkout button */}
              <Button
                asChild
                className="w-full text-base"
                size="lg"
                onClick={toggleCart}
              >
                <Link href="/checkout">
                  去结算
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
