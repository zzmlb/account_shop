"use client";

import { useState } from "react";
import { Tag, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { formatPrice } from "@/lib/utils";
import { useCartStore } from "@/stores/cart-store";

interface CouponState {
  code: string;
  couponId: string;
  discount: number;
}

interface CartSummaryProps {
  onSubmit?: () => void;
  submitLabel?: string;
  isSubmitting?: boolean;
  onCouponChange?: (coupon: CouponState | null) => void;
}

export default function CartSummary({
  onSubmit,
  submitLabel = "确认支付",
  isSubmitting = false,
  onCouponChange,
}: CartSummaryProps) {
  const { items, getTotal } = useCartStore();
  const [couponCode, setCouponCode] = useState("");
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponError, setCouponError] = useState("");
  const [discount, setDiscount] = useState(0);
  const [isValidating, setIsValidating] = useState(false);

  const subtotal = getTotal();
  const total = subtotal - discount;

  const handleApplyCoupon = async () => {
    setCouponError("");
    if (!couponCode.trim()) {
      setCouponError("请输入优惠码");
      return;
    }

    setIsValidating(true);
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode.trim(), amount: subtotal }),
      });
      const data = await res.json();

      if (data.success) {
        setCouponApplied(true);
        setDiscount(data.discount);
        
        setCouponError("");
        onCouponChange?.({ code: couponCode.trim().toUpperCase(), couponId: data.couponId, discount: data.discount });
      } else {
        setCouponApplied(false);
        setDiscount(0);

        setCouponError(data.message || "无效的优惠码");
        onCouponChange?.(null);
      }
    } catch {
      setCouponApplied(false);
      setDiscount(0);
      setCouponError("验证优惠码时出错，请重试");
      onCouponChange?.(null);
    } finally {
      setIsValidating(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCouponCode("");
    setCouponApplied(false);
    setCouponError("");
    setDiscount(0);
    onCouponChange?.(null);
  };

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-6">
      <h3 className="mb-4 text-lg font-semibold text-[var(--foreground)]">
        订单汇总
      </h3>

      {/* Items list */}
      <div className="mb-4 space-y-3">
        {items.map((item) => (
          <div key={item.productId} className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-[var(--foreground)]">
                {item.name}
              </p>
              <p className="text-xs text-[var(--muted-foreground)]">
                x{item.quantity}
              </p>
            </div>
            <span className="flex-shrink-0 text-sm font-medium text-[var(--foreground)]">
              {formatPrice(item.price * item.quantity)}
            </span>
          </div>
        ))}
      </div>

      <Separator className="my-4" />

      {/* Coupon code input */}
      <div className="mb-4">
        <label className="mb-2 flex items-center gap-1.5 text-sm font-medium text-[var(--foreground)]">
          <Tag className="h-4 w-4 text-[var(--primary)]" />
          优惠码
        </label>
        {couponApplied ? (
          <div className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--success)]/30 bg-[var(--success)]/5 px-3 py-2">
            <div>
              <span className="text-sm font-medium text-[var(--success)]">
                {couponCode.toUpperCase()}
              </span>
              <span className="ml-2 text-xs text-[var(--muted-foreground)]">
                已优惠 {formatPrice(discount)}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRemoveCoupon}
              className="h-auto px-2 py-1 text-xs text-[var(--muted-foreground)] hover:text-[var(--destructive)]"
            >
              移除
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Input
              placeholder="输入优惠码"
              value={couponCode}
              onChange={(e) => {
                setCouponCode(e.target.value);
                setCouponError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && couponCode.trim() && !isValidating) {
                  e.preventDefault();
                  handleApplyCoupon();
                }
              }}
              className="flex-1"
              aria-label="优惠码"
              aria-describedby={couponError ? "coupon-error" : undefined}
            />
            <Button
              variant="outline"
              size="default"
              onClick={handleApplyCoupon}
              disabled={!couponCode.trim() || isValidating}
            >
              {isValidating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "使用"
              )}
            </Button>
          </div>
        )}
        {couponError && (
          <p id="coupon-error" className="mt-1 text-xs text-[var(--destructive)]" role="alert">
            {couponError}
          </p>
        )}
      </div>

      <Separator className="my-4" />

      {/* Price breakdown */}
      <div className="space-y-2" aria-live="polite" aria-atomic="true">
        <div className="flex items-center justify-between text-sm">
          <span className="text-[var(--muted-foreground)]">商品小计</span>
          <span className="text-[var(--foreground)]">{formatPrice(subtotal)}</span>
        </div>
        {couponApplied && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--success)]">优惠折扣</span>
            <span className="text-[var(--success)]">-{formatPrice(discount)}</span>
          </div>
        )}
        <Separator />
        <div className="flex items-center justify-between pt-1">
          <span className="text-base font-semibold text-[var(--foreground)]">
            应付总额
          </span>
          <span className="text-2xl font-bold text-[var(--primary)]">
            {formatPrice(total)}
          </span>
        </div>
      </div>

      {/* Submit button */}
      {onSubmit && (
        <Button
          className="mt-6 w-full text-base"
          size="lg"
          onClick={onSubmit}
          disabled={isSubmitting || items.length === 0}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              处理中...
            </>
          ) : (
            submitLabel
          )}
        </Button>
      )}
    </div>
  );
}
