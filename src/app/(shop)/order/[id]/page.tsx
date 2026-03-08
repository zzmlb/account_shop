"use client";

import { useState, useEffect, use } from "react";
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
  image?: string;
}

interface OrderData {
  id: string;
  status: "PENDING" | "PAID" | "DELIVERED" | "CANCELLED";
  email: string;
  paymentMethod: string;
  items: OrderItem[];
  total: number;
  itemCount: number;
  createdAt: string;
}

// Mock card keys for delivered orders
function generateMockCardKeys(itemCount: number): string[] {
  const keys: string[] = [];
  for (let i = 0; i < itemCount; i++) {
    const segments = Array.from({ length: 4 }, () =>
      Math.random().toString(36).substring(2, 6).toUpperCase()
    );
    keys.push(segments.join("-"));
  }
  return keys;
}

function maskCardKey(key: string): string {
  const parts = key.split("-");
  if (parts.length <= 1) return "****-****-****-****";
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

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [order, setOrder] = useState<OrderData | null>(null);
  const [cardKeys, setCardKeys] = useState<string[]>([]);
  const [revealedKeys, setRevealedKeys] = useState<Set<number>>(new Set());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Try to load order from sessionStorage
    const stored = sessionStorage.getItem(`order-${id}`);
    if (stored) {
      const parsed = JSON.parse(stored) as OrderData;
      // Simulate: mark as DELIVERED after loading
      parsed.status = "DELIVERED";
      setOrder(parsed);
      setCardKeys(generateMockCardKeys(parsed.itemCount));
    } else {
      // Generate mock order if none found
      const mockOrder: OrderData = {
        id,
        status: "DELIVERED",
        email: "user@example.com",
        paymentMethod: "alipay",
        items: [
          {
            name: "Steam 充值卡 100元",
            slug: "steam-100",
            price: 95.0,
            quantity: 1,
          },
          {
            name: "Netflix 高级会员月卡",
            slug: "netflix-premium",
            price: 45.0,
            quantity: 2,
          },
        ],
        total: 185.0,
        itemCount: 3,
        createdAt: new Date().toISOString(),
      };
      setOrder(mockOrder);
      setCardKeys(generateMockCardKeys(mockOrder.itemCount));
    }
  }, [id]);

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

  if (!mounted || !order) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center py-32">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" />
        </div>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[order.status];
  const activeStepIndex =
    order.status === "DELIVERED" ? 2 : order.status === "PAID" ? 1 : 0;

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
            <span className="font-mono">{order.id}</span>
            <CopyButton text={order.id} variant="ghost" size="sm" />
          </div>
        </div>
        <Badge variant={statusConfig.variant} className="w-fit text-sm px-3 py-1">
          {statusConfig.label}
        </Badge>
      </div>

      {/* Status timeline */}
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
                {order.email}
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
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-[var(--foreground)]">
                订单总额
              </span>
              <span className="text-xl font-bold text-[var(--primary)]">
                {formatPrice(order.total)}
              </span>
            </div>
          </div>
        </div>

        {/* Order items */}
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-6">
          <h2 className="mb-4 text-lg font-semibold text-[var(--foreground)]">
            商品列表
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

      {/* Card keys section - only show when DELIVERED */}
      {order.status === "DELIVERED" && cardKeys.length > 0 && (
        <div className="mt-6 rounded-[var(--radius-lg)] border border-[var(--primary)]/30 bg-[var(--primary)]/5 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-[var(--foreground)]">
              <Package className="h-5 w-5 text-[var(--primary)]" />
              卡密信息
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (revealedKeys.size === cardKeys.length) {
                  setRevealedKeys(new Set());
                } else {
                  setRevealedKeys(
                    new Set(cardKeys.map((_, i) => i))
                  );
                }
              }}
              className="gap-1.5"
            >
              {revealedKeys.size === cardKeys.length ? (
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
            {cardKeys.map((key, index) => {
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
