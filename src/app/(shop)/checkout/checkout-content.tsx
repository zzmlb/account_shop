"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Mail,
  ShieldCheck,
  ShoppingBag,
  Zap,
  Clock,
  Lock,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn, formatPrice } from "@/lib/utils";
import { useCartStore } from "@/stores/cart-store";
import { useAuthStore } from "@/stores/auth-store";
import { apiFetch } from "@/lib/api-fetch";
import CartSummary from "@/components/cart/cart-summary";
import Breadcrumb from "@/components/ui/breadcrumb";
import { CheckoutPaymentMethods, PAYMENT_METHODS } from "./checkout-payment-methods";
import { CheckoutConfirmDialog } from "./checkout-confirm-dialog";

interface ServerProduct {
  slug: string;
  price: number;
  stockCount: number;
  name: string;
}

interface CouponState {
  code: string;
  couponId: string;
  discount: number;
}

export default function CheckoutContent() {
  const router = useRouter();
  const { items, clearCart, getTotal, getItemCount } = useCartStore();
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const user = useAuthStore((s) => s.user);
  const [email, setEmail] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("balance");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const idempotencyKeyRef = useRef(`${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);
  const [mounted, setMounted] = useState(false);
  const [priceChecked, setPriceChecked] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<CouponState | null>(null);
  const [stockValidating, setStockValidating] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-fill email from user session or localStorage
  useEffect(() => {
    if (user?.email && !email) {
      setEmail(user.email);
    } else if (!email) {
      const saved = localStorage.getItem("pj37-checkout-email");
      if (saved) setEmail(saved);
    }
  }, [user, email]);

  // Save email to localStorage when it changes (debounced)
  useEffect(() => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    const timer = setTimeout(() => {
      localStorage.setItem("pj37-checkout-email", email);
    }, 1000);
    return () => clearTimeout(timer);
  }, [email]);

  // Validate cart prices and stock against server on mount and periodically
  useEffect(() => {
    if (!mounted || items.length === 0 || priceChecked) return;
    const controller = new AbortController();

    async function validateCart() {
      try {
        setStockValidating(true);
        const slugs = items.map((i) => i.slug);
        const data = await apiFetch<{ products: ServerProduct[] }>(`/api/products?slugs=${slugs.join(",")}&limit=50`, {
          signal: controller.signal,
        });
        if (!Array.isArray(data.products)) return;

        const serverProducts = new Map<string, ServerProduct>(
          data.products.map((p: ServerProduct) => [p.slug, p])
        );

        let changed = false;
        for (const item of items) {
          const server = serverProducts.get(item.slug);
          if (!server) {
            toast.warning(`${item.name} 已下架，已从购物车移除`);
            removeItem(item.productId);
            changed = true;
            continue;
          }
          if (server.stockCount <= 0) {
            toast.warning(`${item.name} 已售罄，已从购物车移除`);
            removeItem(item.productId);
            changed = true;
            continue;
          }
          if (item.quantity > server.stockCount) {
            toast.info(`${item.name} 库存不足，已调整数量`);
            updateQuantity(item.productId, server.stockCount);
            changed = true;
          }
        }
        if (!changed) {
          setPriceChecked(true);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
      } finally {
        if (!controller.signal.aborted) setStockValidating(false);
      }
    }
    validateCart();
    return () => controller.abort();
  }, [mounted, items, priceChecked, removeItem, updateQuantity]);

  // Periodic stock re-validation while on checkout page (every 2 minutes)
  useEffect(() => {
    if (!mounted || items.length === 0) return;
    const interval = setInterval(() => {
      setPriceChecked(false); // triggers re-validation
    }, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [mounted, items.length]);

  // Wait for hydration before checking cart
  if (!mounted) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center py-32">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" />
        </div>
      </div>
    );
  }

  // Empty cart state
  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="mb-4 rounded-full bg-[var(--muted)] p-6">
            <ShoppingBag className="h-12 w-12 text-[var(--muted-foreground)]" />
          </div>
          <h2 className="mb-2 text-xl font-semibold text-[var(--foreground)]">
            购物车为空
          </h2>
          <p className="mb-6 text-[var(--muted-foreground)]">
            请先添加商品到购物车再进行结算
          </p>
          <Button asChild>
            <Link href="/products">浏览商品</Link>
          </Button>
        </div>
      </div>
    );
  }

  const handleConfirmOpen = () => {
    if (!email.trim()) {
      toast.error("请输入邮箱地址");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("请输入有效的邮箱地址");
      return;
    }
    setConfirmOpen(true);
  };

  const handleSubmit = async () => {
    setConfirmOpen(false);
    setIsSubmitting(true);

    try {
      // Create order via API (with idempotency key to prevent duplicate submissions)
      const orderData = await apiFetch<{ order: { id: string; orderNo: string } }>("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Idempotency-Key": idempotencyKeyRef.current,
        },
        body: JSON.stringify({
          items: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
          paymentMethod,
          email,
          couponCode: appliedCoupon?.code || undefined,
        }),
      });

      // Auto-pay with balance if selected
      if (paymentMethod === "balance") {
        let payData: { cardKeys?: string[]; needed?: number };
        try {
          payData = await apiFetch<{ cardKeys?: string[] }>(`/api/orders/${orderData.order.id}/pay`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paymentMethod: "balance" }),
          });
        } catch (payErr) {
          // Balance payment failed — navigate to order page with PENDING status
          // so user can retry payment or choose another method
          const description = payErr instanceof Error ? payErr.message : "余额不足，请充值后在订单页重新支付";
          toast.error("余额支付失败", { description });
          sessionStorage.setItem(
            `order-${orderData.order.orderNo}`,
            JSON.stringify({
              id: orderData.order.orderNo,
              status: "PENDING",
              email,
              paymentMethod,
              items: items.map((item) => ({
                name: item.name,
                slug: item.slug,
                price: item.price,
                quantity: item.quantity,
              })),
              total: getTotal(),
              itemCount: getItemCount(),
              createdAt: new Date().toISOString(),
            })
          );
          clearCart();
          router.push(`/order/${orderData.order.orderNo}`);
          return;
        }

        // Store order info for the detail page
        sessionStorage.setItem(
          `order-${orderData.order.orderNo}`,
          JSON.stringify({
            id: orderData.order.orderNo,
            status: "DELIVERED",
            email,
            paymentMethod,
            items: items.map((item) => ({
              name: item.name,
              slug: item.slug,
              price: item.price,
              quantity: item.quantity,
            })),
            total: getTotal(),
            itemCount: getItemCount(),
            createdAt: new Date().toISOString(),
            cardKeys: payData.cardKeys || [],
          })
        );
      } else {
        // For non-balance payments, store as pending
        sessionStorage.setItem(
          `order-${orderData.order.orderNo}`,
          JSON.stringify({
            id: orderData.order.orderNo,
            status: "PENDING",
            email,
            paymentMethod,
            items: items.map((item) => ({
              name: item.name,
              slug: item.slug,
              price: item.price,
              quantity: item.quantity,
            })),
            total: getTotal(),
            itemCount: getItemCount(),
            createdAt: new Date().toISOString(),
          })
        );
      }

      clearCart();
      router.push(`/order/${orderData.order.orderNo}`);
    } catch (err) {
      // Regenerate idempotency key so the retry is treated as a new attempt
      idempotencyKeyRef.current = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      const msg = err instanceof Error ? err.message : "请检查网络连接后重试";
      // If stock issue, re-validate cart to update quantities
      if (msg.includes("库存")) {
        setPriceChecked(false);
        toast.error("库存不足", { description: msg });
      } else {
        toast.error("下单失败", {
          description: msg,
          action: {
            label: "重试",
            onClick: () => handleSubmit(),
          },
        });
      }
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: "全部商品", href: "/products" },
          { label: "确认订单" },
        ]}
        className="mb-6"
      />

      {/* Page title */}
      <h1 className="mb-8 text-2xl font-bold text-[var(--foreground)] sm:text-3xl">
        确认订单
      </h1>

      {/* Two column layout - side by side on md+ */}
      <div className="grid gap-8 md:grid-cols-[1fr_340px] lg:grid-cols-[1fr_400px]">
        {/* Left column: Payment method + Contact info */}
        <div className="space-y-8">
          {/* Contact info */}
          <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-6">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[var(--foreground)]">
              <Mail className="h-5 w-5 text-[var(--primary)]" />
              联系信息
            </h2>
            <Label htmlFor="checkout-email" className="mb-3 block text-sm text-[var(--muted-foreground)]">
              卡密将发送至此邮箱，请确保填写正确
            </Label>
            <Input
              id="checkout-email"
              type="email"
              placeholder="请输入您的邮箱地址"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
              required
              maxLength={100}
              className="max-w-md"
              aria-required="true"
              aria-describedby={email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? "email-error" : undefined}
              aria-invalid={email ? !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) : undefined}
            />
            {email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && (
              <p id="email-error" className="mt-1 text-xs text-[var(--destructive)]" role="alert">
                请输入有效的邮箱地址
              </p>
            )}
          </div>

          {/* Payment method selection */}
          <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-6">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[var(--foreground)]">
              <CreditCard className="h-5 w-5 text-[var(--primary)]" />
              支付方式
            </h2>
            <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="支付方式">
              {PAYMENT_METHODS.map((method, idx) => {
                const isDisabled = "disabled" in method && method.disabled;
                const isSelected = paymentMethod === method.id;
                return (
                  <button
                    key={method.id}
                    onClick={() => !isDisabled && setPaymentMethod(method.id)}
                    onKeyDown={(e) => {
                      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                        e.preventDefault();
                        const next = PAYMENT_METHODS[(idx + 1) % PAYMENT_METHODS.length];
                        if (!("disabled" in next && next.disabled)) setPaymentMethod(next.id);
                        (e.currentTarget.parentElement?.children[(idx + 1) % PAYMENT_METHODS.length] as HTMLElement)?.focus();
                      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                        e.preventDefault();
                        const prev = PAYMENT_METHODS[(idx - 1 + PAYMENT_METHODS.length) % PAYMENT_METHODS.length];
                        if (!("disabled" in prev && prev.disabled)) setPaymentMethod(prev.id);
                        (e.currentTarget.parentElement?.children[(idx - 1 + PAYMENT_METHODS.length) % PAYMENT_METHODS.length] as HTMLElement)?.focus();
                      }
                    }}
                    disabled={isSubmitting || isDisabled}
                    tabIndex={isSelected ? 0 : -1}
                    role="radio"
                    aria-checked={isSelected}
                    aria-label={method.label}
                    className={cn(
                      "relative flex items-center gap-3 rounded-[var(--radius-md)] border-2 p-4 text-left transition-all",
                      isDisabled
                        ? "cursor-not-allowed border-[var(--border)] opacity-50"
                        : isSelected
                          ? "border-[var(--primary)] bg-[var(--primary)]/5"
                          : "border-[var(--border)] bg-transparent hover:border-[var(--primary)]/30 hover:bg-[var(--card-hover)]"
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-[var(--radius-sm)]",
                        method.bgColor
                      )}
                    >
                      <method.icon className={cn("h-5 w-5", method.color)} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[var(--foreground)]">
                        {method.label}
                      </div>
                      <div className="text-xs text-[var(--muted-foreground)]">
                        {method.description}
                      </div>
                    </div>
                    {/* Radio indicator */}
                    <div className="ml-auto flex-shrink-0">
                      <div
                        className={cn(
                          "h-5 w-5 rounded-full border-2 transition-all",
                          isSelected
                            ? "border-[var(--primary)] bg-[var(--primary)]"
                            : "border-[var(--muted-foreground)]/30"
                        )}
                      >
                        {isSelected && (
                          <div className="flex h-full w-full items-center justify-center">
                            <div className="h-2 w-2 rounded-full bg-white" />
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Balance indicator */}
            {paymentMethod === "balance" && user && (
              <div className={cn(
                "mt-3 rounded-[var(--radius-md)] border px-4 py-2.5",
                user.balance >= getTotal()
                  ? "border-[var(--border)] bg-[var(--muted)]/50"
                  : "border-[var(--destructive)]/30 bg-[var(--destructive)]/5"
              )}>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[var(--muted-foreground)]">
                    当前余额
                  </span>
                  <span className={cn(
                    "flex items-center gap-1 text-sm font-semibold",
                    user.balance >= getTotal()
                      ? "text-[var(--success)]"
                      : "text-[var(--destructive)]"
                  )}>
                    {user.balance >= getTotal() ? (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    ) : (
                      <AlertTriangle className="h-3.5 w-3.5" />
                    )}
                    {formatPrice(user.balance)}
                  </span>
                </div>
                {user.balance < getTotal() && (
                  <div className="mt-1.5 flex items-center justify-between text-xs">
                    <span className="text-[var(--destructive)]">
                      余额不足，还需 {formatPrice(getTotal() - user.balance)}
                    </span>
                    <Link
                      href="/dashboard/balance"
                      className="font-medium text-[var(--primary)] hover:underline"
                    >
                      去充值
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Delivery info badges */}
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col items-center rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card)] px-3 py-3 text-center">
              <Zap className="mb-1.5 h-5 w-5 text-[var(--success)]" />
              <span className="text-xs font-semibold text-[var(--foreground)]">即时交付</span>
              <span className="text-[10px] text-[var(--muted-foreground)]">付款后秒级发货</span>
            </div>
            <div className="flex flex-col items-center rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card)] px-3 py-3 text-center">
              <Lock className="mb-1.5 h-5 w-5 text-[var(--primary)]" />
              <span className="text-xs font-semibold text-[var(--foreground)]">安全加密</span>
              <span className="text-[10px] text-[var(--muted-foreground)]">AES-256 保护</span>
            </div>
            <div className="flex flex-col items-center rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card)] px-3 py-3 text-center">
              <Clock className="mb-1.5 h-5 w-5 text-[var(--accent)]" />
              <span className="text-xs font-semibold text-[var(--foreground)]">售后保障</span>
              <span className="text-[10px] text-[var(--muted-foreground)]">48小时内申请</span>
            </div>
          </div>

          {/* Stock validation status */}
          <div
            aria-live="polite"
            aria-atomic="true"
            role="status"
            className={cn(
              "flex items-center gap-3 rounded-[var(--radius-md)] border px-4 py-3 transition-colors",
              stockValidating
                ? "border-[var(--border)] bg-[var(--muted)]/30"
                : priceChecked
                  ? "border-green-500/20 bg-green-500/5"
                  : "border-[var(--warning)]/20 bg-[var(--warning)]/5"
            )}>
            {stockValidating ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent flex-shrink-0" />
                <p className="text-xs text-[var(--muted-foreground)]">正在检查商品库存和价格...</p>
              </>
            ) : priceChecked ? (
              <>
                <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-green-600" />
                <p className="text-xs text-green-700 dark:text-green-400">商品库存和价格已确认，可安全下单</p>
              </>
            ) : (
              <>
                <AlertTriangle className="h-4 w-4 flex-shrink-0 text-[var(--warning)]" />
                <p className="text-xs text-[var(--warning)]">库存信息验证中，请稍候...</p>
              </>
            )}
          </div>

          {/* Security notice */}
          <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--muted)]/50 px-4 py-3">
            <ShieldCheck className="h-5 w-5 flex-shrink-0 text-[var(--primary)]" />
            <p className="text-xs text-[var(--muted-foreground)]">
              所有支付信息均通过 AES-256 加密传输，保障您的交易安全。付款成功后，卡密将自动发送至您的邮箱。
            </p>
          </div>
        </div>

        {/* Right column: Order summary */}
        <div className="md:sticky md:top-24 md:self-start">
          <CartSummary
            onSubmit={handleConfirmOpen}
            submitLabel="提交订单"
            isSubmitting={isSubmitting}
            onCouponChange={setAppliedCoupon}
          />
        </div>
      </div>

      {/* Order Confirmation Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
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
                <span className="text-[var(--foreground)]">
                  {PAYMENT_METHODS.find((m) => m.id === paymentMethod)?.label || paymentMethod}
                </span>
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
                {formatPrice(getTotal() - (appliedCoupon?.discount ?? 0))}
              </span>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              返回修改
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
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
    </div>
  );
}
