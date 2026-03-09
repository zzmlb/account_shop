"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TIMER_TICK_MS, ORDER_POLL_INTERVAL_MS, COPY_FEEDBACK_MS } from "@/lib/constants";
import {
  ArrowLeft,
  Clock,
  CreditCard,
  Loader2,
  AlertCircle,
  XCircle,
  RotateCcw,
  Printer,
  Mail,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn, formatPrice } from "@/lib/utils";
import CopyButton from "@/components/shared/copy-button";
import { useCartStore } from "@/stores/cart-store";
import { apiFetch, apiMutate } from "@/lib/api-fetch";
import { OrderCardKeys } from "./order-card-keys";
import { OrderRefundSection } from "./order-refund-section";
import { OrderRecommended } from "./order-recommended";
import { OrderStatusBanner } from "./order-status-banner";
import { OrderTimeline } from "./order-timeline";
import { OrderDetailSkeleton } from "./order-detail-skeleton";

interface OrderItem {
  name: string;
  slug: string;
  price: number;
  quantity: number;
}

interface OrderData {
  id: string;
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
    const timer = setInterval(calc, TIMER_TICK_MS);
    return () => clearInterval(timer);
  }, [expireAt, status]);

  return timeLeft;
}

export default function OrderDetailContent({ id }: { id: string }) {
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [paying, setPaying] = useState(false);
  const countdown = useCountdown(order?.expireAt, order?.status);
  const orderSlugs = useMemo(
    () => (order ? order.items.map((i) => i.slug) : []),
    [order]
  );

  useEffect(() => {
    async function fetchOrder() {
      try {
        const data = await apiFetch<{ order: OrderData }>(`/api/orders/${id}`);
        setOrder(data.order);
      } catch (err) {
        setError(err instanceof Error ? err.message : "加载订单失败，请稍后重试");
      } finally {
        setLoading(false);
      }
    }
    fetchOrder();
  }, [id]);

  // Poll for status updates when order is PENDING or PAID
  const isPolling = !!(order && (order.status === "PENDING" || order.status === "PAID"));
  useEffect(() => {
    if (!order || (order.status !== "PENDING" && order.status !== "PAID")) return;

    const interval = setInterval(async () => {
      try {
        const data = await apiFetch<{ order: OrderData }>(`/api/orders/${id}`);
        if (data.order.status !== order.status || data.order.cardKeys?.length !== order.cardKeys.length) {
          setOrder(data.order);
        }
      } catch {
        // Silently retry on next interval
      }
    }, ORDER_POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [id, order?.status, order]);

  const handleCancelOrder = async () => {
    if (!order || order.status !== "PENDING") return;
    setCancelDialogOpen(false);
    setCancelling(true);
    try {
      await apiMutate(`/api/orders/${id}`, "PATCH", { action: "cancel" });
      setOrder((prev) => prev ? { ...prev, status: "CANCELLED" } : prev);
      toast.success("订单已取消");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "网络错误，请稍后重试");
    } finally {
      setCancelling(false);
    }
  };

  const handlePayNow = async () => {
    if (!order || order.status !== "PENDING") return;
    setPaying(true);
    try {
      await apiMutate(`/api/orders/${order.id}/pay`, "POST", { paymentMethod: "balance" });
      toast.success("支付成功！卡密即将发送至您的邮箱");
      const refreshData = await apiFetch<{ order: OrderData }>(`/api/orders/${id}`);
      setOrder(refreshData.order);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "网络错误，请稍后重试");
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return <OrderDetailSkeleton />;
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
          {isPolling && (
            <span className="flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--primary)]" />
              自动刷新中
            </span>
          )}
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

      {/* Status banner (delivered/cancelled/refunded/expired) */}
      <OrderStatusBanner status={order.status} />

      {/* Status timeline */}
      <OrderTimeline status={order.status} createdAt={order.createdAt} paidAt={order.paidAt} />

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

      {/* Card keys (processing, edge case, normal display) */}
      <OrderCardKeys
        orderId={order.id}
        orderNo={order.orderNo}
        email={order.email}
        createdAt={order.createdAt}
        status={order.status}
        cardKeys={order.cardKeys}
      />

      {/* Refund section */}
      <OrderRefundSection
        orderId={order.id}
        orderNo={order.orderNo}
        status={order.status}
        payAmount={order.payAmount ?? order.totalAmount}
      />

      {/* Pending payment notice */}
      {order.status === "PENDING" && (
        <div className="mt-6 rounded-[var(--radius-lg)] border border-[var(--warning)]/30 bg-[var(--warning)]/5 p-6 text-center">
          <Clock className="mx-auto mb-2 h-8 w-8 text-[var(--warning)]" />
          <h3 className="mb-1 text-lg font-semibold text-[var(--foreground)]">
            等待支付
          </h3>
          <p className="mb-4 text-sm text-[var(--muted-foreground)]">
            请在 15 分钟内完成支付，超时订单将自动取消
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              onClick={handlePayNow}
              disabled={paying || countdown === "已过期"}
              className="gap-1.5"
            >
              {paying ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CreditCard className="h-4 w-4" />
              )}
              {paying ? "支付中..." : `余额支付 ¥${(order.payAmount ?? order.totalAmount).toFixed(2)}`}
            </Button>
            <Button asChild variant="outline" size="sm" className="gap-1.5">
              <Link href="/dashboard/balance">
                充值余额
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCancelDialogOpen(true)}
              disabled={cancelling}
              className="gap-1.5 text-[var(--destructive)] hover:text-[var(--destructive)]"
            >
              {cancelling ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <XCircle className="h-3.5 w-3.5" />
              )}
              取消订单
            </Button>
          </div>
        </div>
      )}

      {/* Cancel order confirmation dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-[var(--destructive)]" />
              确认取消订单
            </DialogTitle>
            <DialogDescription>
              取消后订单将无法恢复，库存将被释放。确定要取消此订单吗？
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
              返回
            </Button>
            <Button variant="destructive" onClick={handleCancelOrder}>
              确认取消
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Actions */}
      <div className="mt-8 flex flex-wrap gap-3">
        {(order.status === "EXPIRED" || order.status === "CANCELLED") && (
          <Button
            onClick={() => {
              for (const item of order.items) {
                addItem({
                  id: item.slug,
                  productId: item.slug,
                  name: item.name,
                  slug: item.slug,
                  price: item.price,
                  quantity: item.quantity,
                  maxStock: 999,
                });
              }
              toast.success("商品已加入购物车");
              router.push("/checkout");
            }}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            重新下单
          </Button>
        )}
        <Button asChild variant="outline">
          <Link href="/products">继续购物</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/order/search">查询卡密</Link>
        </Button>
        {(order.status === "DELIVERED" || order.status === "PAID") && (
          <Button
            variant="outline"
            onClick={() => window.print()}
            className="no-print gap-1.5"
          >
            <Printer className="h-4 w-4" />
            打印订单
          </Button>
        )}
      </div>

      {/* Recommended Products */}
      <OrderRecommended orderSlugs={orderSlugs} />
    </div>
  );
}
