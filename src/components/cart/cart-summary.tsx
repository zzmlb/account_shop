"use client";

import { useState, useEffect, useCallback } from "react";
import { Tag, Loader2, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn, formatPrice } from "@/lib/utils";
import { useCartStore } from "@/stores/cart-store";
import { apiFetch, apiMutate } from "@/lib/api-fetch";

interface CouponState {
  code: string;
  couponId: string;
  discount: number;
}

interface AvailableCoupon {
  code: string;
  type: string;
  value: number;
  minAmount: number | null;
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
  const [availableCoupons, setAvailableCoupons] = useState<AvailableCoupon[]>([]);

  // Fetch user's available coupons for quick-apply
  useEffect(() => {
    const controller = new AbortController();
    async function fetchCoupons() {
      try {
        const data = await apiFetch<{ coupons: Array<{ isUsed: boolean; endDate: string; startDate: string; code: string; type: string; value: number; minAmount: number | null }> }>("/api/coupons", { signal: controller.signal });
        if (Array.isArray(data.coupons)) {
          const now = new Date();
          const usable = data.coupons
            .filter((c) =>
              !c.isUsed && new Date(c.endDate) > now && new Date(c.startDate) <= now
            )
            .map((c) => ({
              code: c.code,
              type: c.type,
              value: c.value,
              minAmount: c.minAmount,
            }));
          setAvailableCoupons(usable);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
    }
    fetchCoupons();
    return () => controller.abort();
  }, []);

  const subtotal = getTotal();
  const total = subtotal - discount;

  const handleApplyCoupon = useCallback(async () => {
    setCouponError("");
    if (!couponCode.trim()) {
      setCouponError("请输入优惠码");
      return;
    }

    setIsValidating(true);
    try {
      const data = await apiMutate<{ discount: number; couponId: string }>("/api/coupons/validate", "POST", { code: couponCode.trim(), amount: subtotal });
      setCouponApplied(true);
      setDiscount(data.discount);
      setCouponError("");
      onCouponChange?.({ code: couponCode.trim().toUpperCase(), couponId: data.couponId, discount: data.discount });
    } catch (err) {
      setCouponApplied(false);
      setDiscount(0);
      setCouponError(err instanceof Error ? err.message : "验证优惠码时出错，请重试");
      onCouponChange?.(null);
    } finally {
      setIsValidating(false);
    }
  }, [couponCode, subtotal, onCouponChange]);

  const handleRemoveCoupon = useCallback(() => {
    setCouponCode("");
    setCouponApplied(false);
    setCouponError("");
    setDiscount(0);
    onCouponChange?.(null);
  }, [onCouponChange]);

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
        <label htmlFor="coupon-code" className="mb-2 flex items-center gap-1.5 text-sm font-medium text-[var(--foreground)]">
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
              id="coupon-code"
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
              className={cn("flex-1", couponError && "border-[var(--destructive)] focus-visible:ring-[var(--destructive)]")}
              aria-invalid={!!couponError}
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
        {/* Quick-apply available coupons */}
        {!couponApplied && availableCoupons.length > 0 && (
          <div className="mt-2">
            <p className="mb-1.5 flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
              <Ticket className="h-3 w-3" />
              可用优惠券:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {availableCoupons.slice(0, 4).map((c) => {
                const meetsMin = !c.minAmount || subtotal >= c.minAmount;
                return (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => {
                      if (meetsMin) {
                        setCouponCode(c.code);
                        setCouponError("");
                      }
                    }}
                    disabled={!meetsMin || isValidating}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-xs transition-colors",
                      meetsMin
                        ? "border-[var(--primary)]/30 text-[var(--primary)] hover:border-[var(--primary)] hover:bg-[var(--primary)]/5"
                        : "border-[var(--border)] text-[var(--muted-foreground)] opacity-50"
                    )}
                    title={
                      c.minAmount && !meetsMin
                        ? `满¥${c.minAmount.toFixed(0)}可用`
                        : `点击使用: ${c.code}`
                    }
                  >
                    {c.type === "PERCENTAGE" ? `${c.value}%折` : `¥${c.value}`}
                    {c.minAmount ? ` (满${c.minAmount})` : ""}
                  </button>
                );
              })}
            </div>
          </div>
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
          aria-busy={isSubmitting}
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
