"use client";

import { ShieldCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatPrice } from "@/lib/utils";

interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

interface CouponState {
  code: string;
  couponId: string;
  discount: number;
}

interface CheckoutConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CartItem[];
  email: string;
  paymentMethodLabel: string;
  appliedCoupon: CouponState | null;
  total: number;
  isSubmitting: boolean;
  onConfirm: () => void;
}

export function CheckoutConfirmDialog({
  open,
  onOpenChange,
  items,
  email,
  paymentMethodLabel,
  appliedCoupon,
  total,
  isSubmitting,
  onConfirm,
}: CheckoutConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <ShieldCheck className="h-5 w-5 text-[var(--primary)]" />
            确认订单信息
          </DialogTitle>
          <DialogDescription>
            请核对以下信息，确认无误后提交订单
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Items summary */}
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.productId} className="flex items-center justify-between text-sm">
                <span className="text-[var(--foreground)] truncate max-w-[200px]">
                  {item.name} <span className="text-[var(--muted-foreground)]">x{item.quantity}</span>
                </span>
                <span className="font-medium text-[var(--foreground)] shrink-0 ml-2">
                  {formatPrice(item.price * item.quantity)}
                </span>
              </div>
            ))}
          </div>

          <Separator />

          {/* Order details */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--muted-foreground)]">邮箱</span>
              <span className="text-[var(--foreground)]">{email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--muted-foreground)]">支付方式</span>
              <span className="text-[var(--foreground)]">{paymentMethodLabel}</span>
            </div>
            {appliedCoupon && (
              <div className="flex justify-between">
                <span className="text-[var(--success)]">优惠折扣</span>
                <span className="text-[var(--success)]">-{formatPrice(appliedCoupon.discount)}</span>
              </div>
            )}
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <span className="text-base font-semibold text-[var(--foreground)]">应付总额</span>
            <span className="text-xl font-bold text-[var(--primary)]">
              {formatPrice(total - (appliedCoupon?.discount ?? 0))}
            </span>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            返回修改
          </Button>
          <Button onClick={onConfirm} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                处理中...
              </>
            ) : (
              "确认支付"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
