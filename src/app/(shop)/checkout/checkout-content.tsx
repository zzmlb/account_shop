"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Wallet,
  CreditCard,
  Smartphone,
  Bitcoin,
  ArrowLeft,
  Mail,
  ShieldCheck,
  ShoppingBag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/stores/cart-store";
import CartSummary from "@/components/cart/cart-summary";

const PAYMENT_METHODS = [
  {
    id: "balance",
    label: "余额支付",
    description: "使用账户余额直接支付",
    icon: Wallet,
    color: "text-[var(--success)]",
    bgColor: "bg-[var(--success)]/10",
  },
  {
    id: "alipay",
    label: "支付宝",
    description: "支持花呗、余额宝",
    icon: CreditCard,
    color: "text-[#1677ff]",
    bgColor: "bg-[#1677ff]/10",
  },
  {
    id: "wechat",
    label: "微信支付",
    description: "微信扫码支付",
    icon: Smartphone,
    color: "text-[#07c160]",
    bgColor: "bg-[#07c160]/10",
  },
  {
    id: "usdt",
    label: "USDT",
    description: "TRC20 / ERC20 链上支付",
    icon: Bitcoin,
    color: "text-[#f7931a]",
    bgColor: "bg-[#f7931a]/10",
  },
] as const;

export default function CheckoutContent() {
  const router = useRouter();
  const { items, clearCart, getTotal, getItemCount } = useCartStore();
  const [email, setEmail] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("balance");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  const handleSubmit = async () => {
    if (!email.trim()) return;

    setIsSubmitting(true);

    try {
      // Create order via API
      const orderRes = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
          paymentMethod,
          email,
        }),
      });

      const orderData = await orderRes.json();
      if (!orderData.success) {
        setIsSubmitting(false);
        return;
      }

      // Auto-pay with balance if selected
      if (paymentMethod === "balance") {
        const payRes = await fetch(`/api/orders/${orderData.order.id}/pay`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentMethod: "balance" }),
        });
        const payData = await payRes.json();

        // Store order info for the detail page
        sessionStorage.setItem(
          `order-${orderData.order.orderNo}`,
          JSON.stringify({
            id: orderData.order.orderNo,
            status: payData.success ? "DELIVERED" : "PAID",
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
    } catch {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Back link */}
      <Link
        href="/products"
        className="mb-6 inline-flex items-center gap-1 text-sm text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
      >
        <ArrowLeft className="h-4 w-4" />
        继续购物
      </Link>

      {/* Page title */}
      <h1 className="mb-8 text-2xl font-bold text-[var(--foreground)] sm:text-3xl">
        确认订单
      </h1>

      {/* Two column layout */}
      <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
        {/* Left column: Payment method + Contact info */}
        <div className="space-y-8">
          {/* Contact info */}
          <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-6">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[var(--foreground)]">
              <Mail className="h-5 w-5 text-[var(--primary)]" />
              联系信息
            </h2>
            <p className="mb-3 text-sm text-[var(--muted-foreground)]">
              卡密将发送至此邮箱，请确保填写正确
            </p>
            <Input
              type="email"
              placeholder="请输入您的邮箱地址"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="max-w-md"
            />
            {email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && (
              <p className="mt-1 text-xs text-[var(--destructive)]">
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
            <div className="grid gap-3 sm:grid-cols-2">
              {PAYMENT_METHODS.map((method) => {
                const isSelected = paymentMethod === method.id;
                return (
                  <button
                    key={method.id}
                    onClick={() => setPaymentMethod(method.id)}
                    className={cn(
                      "flex items-center gap-3 rounded-[var(--radius-md)] border-2 p-4 text-left transition-all",
                      isSelected
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
        <div className="lg:sticky lg:top-24 lg:self-start">
          <CartSummary
            onSubmit={handleSubmit}
            submitLabel="提交订单"
            isSubmitting={isSubmitting}
          />
        </div>
      </div>
    </div>
  );
}
