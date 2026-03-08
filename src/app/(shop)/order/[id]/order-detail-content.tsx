"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Package,
  CheckCircle2,
  Clock,
  Truck,
  Eye,
  EyeOff,
  Mail,
  CreditCard,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn, formatPrice } from "@/lib/utils";
import CopyButton from "@/components/shared/copy-button";

interface OrderItem {
  name: string;
  slug: string;
  price: number;
  quantity: number;
}

interface OrderData {
  orderNo: string;
  status: "PENDING" | "PAID" | "DELIVERED" | "CANCELLED" | "REFUNDED" | "EXPIRED";
  email: string;
  paymentMethod: string;
  totalAmount: number;
  payAmount?: number;
  discount?: number;
  createdAt: string;
  expireAt?: string;
  paidAt?: string | null;
  items: OrderItem[];
  cardKeys: string[];
}

function maskCardKey(key: string): string {
  const parts = key.split("-");
  if (parts.length <= 1) {
    // No dashes — mask all but first 4 chars
    if (key.length <= 4) return "****";
    return key.substring(0, 4) + "*".repeat(key.length - 4);
  }
  return (
    parts[0] + "-" + parts.slice(1).map(() => "****").join("-")
  );
}

const STATUS_CONFIG = {
  PENDING: {
    label: "待支付",
    variant: "outline" as const,
    color: "text-[var(--warning)]",
  },
  PAID: {
    label: "已支付",
    variant: "default" as const,
    color: "text-[var(--primary)]",
  },
  DELIVERED: {
    label: "已发货",
    variant: "success" as const,
    color: "text-[var(--success)]",
  },
  CANCELLED: {
    label: "已取消",
    variant: "destructive" as const,
    color: "text-[var(--destructive)]",
  },
  REFUNDED: {
    label: "已退款",
    variant: "secondary" as const,
    color: "text-[var(--muted-foreground)]",
  },
  EXPIRED: {
    label: "已过期",
    variant: "secondary" as const,
    color: "text-[var(--muted-foreground)]",
  },
};

const PAYMENT_LABELS: Record<string, string> = {
  balance: "余额支付",
  alipay: "支付宝",
  wechat: "微信支付",
  usdt: "USDT",
};

const TIMELINE_STEPS = [
  { key: "created", label: "创建订单", icon: Package },
  { key: "paid", label: "支付完成", icon: CreditCard },
  { key: "delivered", label: "发货完成", icon: Truck },
];

function useCountdown(expireAt: string | undefined, status: string | undefined) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    if (!expireAt || status !== "PENDING") {
      setTimeLeft("");
      return;
    }

    const target = expireAt;
    function calc() {
      const diff = new Date(target).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft("已过期");
        return;
      }
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${mins}:${secs.toString().padStart(2, "0")}`);
    }

    calc();
    const timer = setInterval(calc, 1000);
    return () => clearInterval(timer);
  }, [expireAt, status]);

  return timeLeft;
}

export default function OrderDetailContent({ id }: { id: string }) {
  const [order, setOrder] = useState<OrderData | null>(null);
  const [revealedKeys, setRevealedKeys] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const countdown = useCountdown(order?.expireAt, order?.status);

  useEffect(() => {
    async function fetchOrder() {
      try {
        const res = await fetch(`/api/orders/${id}`);
        const data = await res.json();
        if (data.success && data.order) {
          setOrder(data.order);
        } else {
          setError(data.message || "订单不存在");
        }
      } catch {
        setError("加载订单失败，请稍后重试");
      } finally {
        setLoading(false);
      }
    }
    fetchOrder();
  }, [id]);

  // Poll for status updates when order is PENDING or PAID
  useEffect(() => {
    if (!order || (order.status !== "PENDING" && order.status !== "PAID")) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/orders/${id}`);
        const data = await res.json();
        if (data.success && data.order && data.order.status !== order.status) {
          setOrder(data.order);
        }
      } catch {
        // Silently retry on next interval
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [id, order?.status, order]);

  const toggleKeyReveal = (index: number) => {
    setRevealedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="mb-4 rounded-full bg-[var(--destructive)]/10 p-6">
            <AlertCircle className="h-12 w-12 text-[var(--destructive)]" />
          </div>
          <h2 className="mb-2 text-xl font-semibold text-[var(--foreground)]">
            {error || "订单不存在"}
          </h2>
          <p className="mb-6 text-[var(--muted-foreground)]">
            请检查订单号是否正确，或联系客服获取帮助
          </p>
          <div className="flex gap-3">
            <Button asChild variant="outline">
              <Link href="/products">浏览商品</Link>
            </Button>
            <Button asChild>
              <Link href="/order/search">查询订单</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.PENDING;
  const activeStepIndex =
    order.status === "DELIVERED"
      ? 2
      : order.status === "PAID"
        ? 1
        : order.status === "CANCELLED" || order.status === "REFUNDED"
          ? -1
          : 0;

  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Back link */}
      <Link
        href="/products"
        className="mb-6 inline-flex items-center gap-1 text-sm text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
      >
        <ArrowLeft className="h-4 w-4" />
        返回商品列表
      </Link>

      {/* Order header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)] sm:text-3xl">
            订单详情
          </h1>
          <div className="mt-1 flex items-center gap-3 text-sm text-[var(--muted-foreground)]">
            <span className="font-mono">{order.orderNo}</span>
            <CopyButton text={order.orderNo} variant="ghost" size="sm" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={statusConfig.variant} className="w-fit text-sm px-3 py-1">
            {statusConfig.label}
          </Badge>
          {countdown && order.status === "PENDING" && (
            <span className={cn(
              "text-sm font-mono font-medium",
              countdown === "已过期" ? "text-[var(--destructive)]" : "text-[var(--warning)]"
            )}>
              {countdown === "已过期" ? "⏰ 已过期" : `⏱ 剩余 ${countdown}`}
            </span>
          )}
        </div>
      </div>

      {/* Status timeline */}
      {activeStepIndex >= 0 && (
        <div className="mb-8 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-6">
          <div className="flex items-center justify-between">
            {TIMELINE_STEPS.map((step, index) => {
              const isCompleted = index <= activeStepIndex;
              const isCurrent = index === activeStepIndex;
              return (
                <div key={step.key} className="flex flex-1 items-center">
                  <div className="flex flex-col items-center gap-2">
                    <div
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all",
                        isCompleted
                          ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]"
                          : "border-[var(--border)] text-[var(--muted-foreground)]",
                        isCurrent && "animate-glow"
                      )}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <step.icon className="h-5 w-5" />
                      )}
                    </div>
                    <span
                      className={cn(
                        "text-xs font-medium",
                        isCompleted
                          ? "text-[var(--foreground)]"
                          : "text-[var(--muted-foreground)]"
                      )}
                    >
                      {step.label}
                    </span>
                  </div>
                  {index < TIMELINE_STEPS.length - 1 && (
                    <div
                      className={cn(
                        "mx-2 h-0.5 flex-1 rounded-full",
                        index < activeStepIndex
                          ? "bg-[var(--primary)]"
                          : "bg-[var(--border)]"
                      )}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Order info */}
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-6">
          <h2 className="mb-4 text-lg font-semibold text-[var(--foreground)]">
            订单信息
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                <Clock className="h-4 w-4" />
                创建时间
              </span>
              <span className="text-sm text-[var(--foreground)]">
                {new Date(order.createdAt).toLocaleString("zh-CN")}
              </span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                <Mail className="h-4 w-4" />
                收货邮箱
              </span>
              <span className="text-sm text-[var(--foreground)]">
                {order.email || "未提供"}
              </span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                <CreditCard className="h-4 w-4" />
                支付方式
              </span>
              <span className="text-sm text-[var(--foreground)]">
                {PAYMENT_LABELS[order.paymentMethod] || order.paymentMethod}
              </span>
            </div>
            <Separator />
            {order.discount && order.discount > 0 ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[var(--muted-foreground)]">
                    商品小计
                  </span>
                  <span className="text-sm text-[var(--foreground)]">
                    {formatPrice(order.totalAmount)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[var(--success)]">
                    优惠折扣
                  </span>
                  <span className="text-sm text-[var(--success)]">
                    -{formatPrice(order.discount)}
                  </span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[var(--foreground)]">
                    实付金额
                  </span>
                  <span className="text-xl font-bold text-[var(--primary)]">
                    {formatPrice(order.payAmount ?? order.totalAmount)}
                  </span>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-[var(--foreground)]">
                  订单总额
                </span>
                <span className="text-xl font-bold text-[var(--primary)]">
                  {formatPrice(order.totalAmount)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Order items */}
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-6">
          <h2 className="mb-4 text-lg font-semibold text-[var(--foreground)]">
            商品列表 ({itemCount} 件)
          </h2>
          <div className="space-y-3">
            {order.items.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/products/${item.slug}`}
                    className="text-sm font-medium text-[var(--foreground)] transition-colors hover:text-[var(--primary)]"
                  >
                    {item.name}
                  </Link>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    x{item.quantity} @ {formatPrice(item.price)}
                  </p>
                </div>
                <span className="text-sm font-semibold text-[var(--foreground)]">
                  {formatPrice(item.price * item.quantity)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Card keys section - only show when we have card keys */}
      {order.cardKeys.length > 0 && (
        <div className="mt-6 rounded-[var(--radius-lg)] border border-[var(--primary)]/30 bg-[var(--primary)]/5 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-[var(--foreground)]">
              <Package className="h-5 w-5 text-[var(--primary)]" />
              卡密信息 ({order.cardKeys.length} 个)
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (revealedKeys.size === order.cardKeys.length) {
                  setRevealedKeys(new Set());
                } else {
                  setRevealedKeys(
                    new Set(order.cardKeys.map((_, i) => i))
                  );
                }
              }}
              className="gap-1.5"
            >
              {revealedKeys.size === order.cardKeys.length ? (
                <>
                  <EyeOff className="h-3.5 w-3.5" />
                  全部隐藏
                </>
              ) : (
                <>
                  <Eye className="h-3.5 w-3.5" />
                  全部显示
                </>
              )}
            </Button>
          </div>

          <div className="space-y-2">
            {order.cardKeys.map((key, index) => {
              const isRevealed = revealedKeys.has(index);
              return (
                <div
                  key={index}
                  className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card)] px-4 py-3"
                >
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[var(--primary)]/10 text-xs font-bold text-[var(--primary)]">
                    {index + 1}
                  </span>
                  <code className="flex-1 font-mono text-sm tracking-wider text-[var(--foreground)]">
                    {isRevealed ? key : maskCardKey(key)}
                  </code>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleKeyReveal(index)}
                      className="h-8 w-8 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                      aria-label={isRevealed ? "隐藏" : "显示"}
                    >
                      {isRevealed ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                    <CopyButton text={key} variant="ghost" size="sm" />
                  </div>
                </div>
              );
            })}
          </div>

          <p className="mt-4 text-xs text-[var(--muted-foreground)]">
            卡密信息已同步发送至您的邮箱。请妥善保管卡密，避免泄露。
          </p>
        </div>
      )}

      {/* Pending payment notice */}
      {order.status === "PENDING" && (
        <div className="mt-6 rounded-[var(--radius-lg)] border border-[var(--warning)]/30 bg-[var(--warning)]/5 p-6 text-center">
          <Clock className="mx-auto mb-2 h-8 w-8 text-[var(--warning)]" />
          <h3 className="mb-1 text-lg font-semibold text-[var(--foreground)]">
            等待支付
          </h3>
          <p className="text-sm text-[var(--muted-foreground)]">
            请在 15 分钟内完成支付，超时订单将自动取消
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild variant="outline">
          <Link href="/products">继续购物</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/order/search">查询卡密</Link>
        </Button>
      </div>
    </div>
  );
}
