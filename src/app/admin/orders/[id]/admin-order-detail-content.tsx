"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Copy,
  User,
  Mail,
  Package,
  CreditCard,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Truck,
  RefreshCw,
  Key,
  Ticket,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { decryptCardKey } from "@/lib/crypto";

interface OrderDetail {
  id: string;
  orderNo: string;
  userId: string | null;
  user: {
    id: string;
    username: string;
    email: string | null;
    role: string;
    balance: number;
    createdAt: string;
  } | null;
  email: string | null;
  totalAmount: number;
  payAmount: number;
  status: string;
  paymentMethod: string | null;
  paymentId: string | null;
  paidAt: string | null;
  expireAt: string;
  createdAt: string;
  updatedAt: string;
  coupon: {
    id: string;
    code: string;
    type: string;
    value: number;
  } | null;
  items: Array<{
    id: string;
    productId: string;
    productName: string;
    productSlug: string;
    productImage: string | null;
    productPrice: number;
    quantity: number;
    unitPrice: number;
    cardKeys: Array<{
      id: string;
      content: string;
      status: string;
      soldAt: string | null;
    }>;
  }>;
  refundRequests: Array<{
    id: string;
    reason: string;
    status: string;
    adminNote: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
}

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof Clock }> = {
  PENDING: { label: "待支付", variant: "secondary", icon: Clock },
  PAID: { label: "已支付", variant: "default", icon: CreditCard },
  DELIVERED: { label: "已发货", variant: "default", icon: CheckCircle2 },
  CANCELLED: { label: "已取消", variant: "destructive", icon: XCircle },
  REFUNDED: { label: "已退款", variant: "destructive", icon: RefreshCw },
  EXPIRED: { label: "已过期", variant: "outline", icon: AlertTriangle },
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).then(
    () => toast.success("已复制到剪贴板"),
    () => toast.error("复制失败")
  );
}

export default function AdminOrderDetailContent({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const fetchOrder = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`);
      const data = await res.json();
      if (data.success) {
        setOrder(data.order);
      } else {
        toast.error(data.message || "加载失败");
      }
    } catch {
      toast.error("网络错误");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const updateStatus = async (newStatus: string) => {
    if (!order) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/admin/orders?id=${order.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || "状态已更新");
        fetchOrder();
      } else {
        toast.error(data.message || "更新失败");
      }
    } catch {
      toast.error("网络错误");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <XCircle className="mb-4 h-12 w-12 text-[var(--muted-foreground)]" />
        <h2 className="text-lg font-semibold text-[var(--foreground)]">订单不存在</h2>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          该订单可能已被删除或ID不正确
        </p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/admin/orders">返回订单列表</Link>
        </Button>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.PENDING;
  const StatusIcon = statusConfig.icon;
  const discount = order.totalAmount - order.payAmount;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon">
            <Link href="/admin/orders">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-[var(--foreground)]">
                订单详情
              </h1>
              <Badge variant={statusConfig.variant} className="gap-1">
                <StatusIcon className="h-3 w-3" />
                {statusConfig.label}
              </Badge>
            </div>
            <button
              onClick={() => copyToClipboard(order.orderNo)}
              className="mt-0.5 flex items-center gap-1 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
            >
              {order.orderNo}
              <Copy className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          {order.status === "PAID" && (
            <Button
              size="sm"
              onClick={() => updateStatus("DELIVERED")}
              disabled={updating}
              className="gap-1.5"
            >
              {updating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Truck className="h-3.5 w-3.5" />}
              手动发货
            </Button>
          )}
          {order.status === "PENDING" && (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => updateStatus("CANCELLED")}
              disabled={updating}
              className="gap-1.5"
            >
              {updating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
              取消订单
            </Button>
          )}
          {(order.status === "PAID" || order.status === "DELIVERED") && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => updateStatus("REFUNDED")}
              disabled={updating}
              className="gap-1.5 text-[var(--destructive)] hover:text-[var(--destructive)]"
            >
              {updating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              退款
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Order items */}
          <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)]">
            <div className="border-b border-[var(--border)] px-5 py-4">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
                <Package className="h-4 w-4 text-[var(--primary)]" />
                商品明细
              </h2>
            </div>
            <div className="divide-y divide-[var(--border)]">
              {order.items.map((item) => (
                <div key={item.id} className="px-5 py-4">
                  <div className="flex items-start gap-4">
                    {item.productImage ? (
                      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-[var(--radius-md)] bg-[var(--muted)]">
                        <img
                          src={item.productImage}
                          alt={item.productName}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-gradient-to-br from-[var(--primary)]/20 to-[var(--primary)]/5">
                        <Package className="h-6 w-6 text-[var(--primary)]/40" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/admin/products`}
                        className="text-sm font-medium text-[var(--foreground)] hover:text-[var(--primary)] transition-colors"
                      >
                        {item.productName}
                      </Link>
                      <div className="mt-1 flex items-center gap-4 text-xs text-[var(--muted-foreground)]">
                        <span>数量: {item.quantity}</span>
                        <span>单价: ¥{item.unitPrice.toFixed(2)}</span>
                        <span className="font-medium text-[var(--foreground)]">
                          小计: ¥{(item.unitPrice * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card keys for this item */}
                  {item.cardKeys.length > 0 && (
                    <div className="mt-3 rounded-[var(--radius-md)] bg-[var(--muted)]/50 p-3">
                      <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-[var(--muted-foreground)]">
                        <Key className="h-3.5 w-3.5" />
                        卡密 ({item.cardKeys.length})
                      </div>
                      <div className="space-y-1.5">
                        {item.cardKeys.map((ck) => (
                          <div
                            key={ck.id}
                            className="flex items-center justify-between rounded bg-[var(--background)] px-3 py-1.5"
                          >
                            <code className="text-xs text-[var(--foreground)] font-mono break-all">
                              {ck.content}
                            </code>
                            <button
                              onClick={() => copyToClipboard(ck.content)}
                              className="ml-2 shrink-0 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Refund requests */}
          {order.refundRequests.length > 0 && (
            <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)]">
              <div className="border-b border-[var(--border)] px-5 py-4">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
                  <RefreshCw className="h-4 w-4 text-[var(--destructive)]" />
                  退款记录 ({order.refundRequests.length})
                </h2>
              </div>
              <div className="divide-y divide-[var(--border)]">
                {order.refundRequests.map((r) => (
                  <div key={r.id} className="px-5 py-4">
                    <div className="flex items-center justify-between">
                      <Badge
                        variant={
                          r.status === "APPROVED"
                            ? "default"
                            : r.status === "REJECTED"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {r.status === "APPROVED"
                          ? "已批准"
                          : r.status === "REJECTED"
                          ? "已拒绝"
                          : "待处理"}
                      </Badge>
                      <span className="text-xs text-[var(--muted-foreground)]">
                        {formatDate(r.createdAt)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-[var(--foreground)]">
                      {r.reason}
                    </p>
                    {r.adminNote && (
                      <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                        管理员备注: {r.adminNote}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column - sidebar info */}
        <div className="space-y-6">
          {/* Order summary */}
          <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)]">
            <div className="border-b border-[var(--border)] px-5 py-4">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
                <CreditCard className="h-4 w-4 text-[var(--primary)]" />
                订单摘要
              </h2>
            </div>
            <div className="space-y-3 px-5 py-4 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--muted-foreground)]">商品总额</span>
                <span className="text-[var(--foreground)]">¥{order.totalAmount.toFixed(2)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between">
                  <span className="text-[var(--muted-foreground)]">优惠减免</span>
                  <span className="text-[var(--success)]">-¥{discount.toFixed(2)}</span>
                </div>
              )}
              {order.coupon && (
                <div className="flex justify-between">
                  <span className="flex items-center gap-1 text-[var(--muted-foreground)]">
                    <Ticket className="h-3.5 w-3.5" />
                    优惠券
                  </span>
                  <span className="font-mono text-xs text-[var(--primary)]">
                    {order.coupon.code}
                  </span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-semibold">
                <span className="text-[var(--foreground)]">实付金额</span>
                <span className="text-lg text-[var(--primary)]">¥{order.payAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)]">
            <div className="border-b border-[var(--border)] px-5 py-4">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
                <Clock className="h-4 w-4 text-[var(--primary)]" />
                时间线
              </h2>
            </div>
            <div className="space-y-3 px-5 py-4 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--muted-foreground)]">创建时间</span>
                <span className="text-[var(--foreground)]">{formatDate(order.createdAt)}</span>
              </div>
              {order.paidAt && (
                <div className="flex justify-between">
                  <span className="text-[var(--muted-foreground)]">支付时间</span>
                  <span className="text-[var(--foreground)]">{formatDate(order.paidAt)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-[var(--muted-foreground)]">过期时间</span>
                <span className="text-[var(--foreground)]">{formatDate(order.expireAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--muted-foreground)]">更新时间</span>
                <span className="text-[var(--foreground)]">{formatDate(order.updatedAt)}</span>
              </div>
              {order.paymentMethod && (
                <div className="flex justify-between">
                  <span className="text-[var(--muted-foreground)]">支付方式</span>
                  <span className="text-[var(--foreground)]">{order.paymentMethod}</span>
                </div>
              )}
            </div>
          </div>

          {/* Customer info */}
          <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)]">
            <div className="border-b border-[var(--border)] px-5 py-4">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
                <User className="h-4 w-4 text-[var(--primary)]" />
                客户信息
              </h2>
            </div>
            <div className="space-y-3 px-5 py-4 text-sm">
              {order.user ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-[var(--muted-foreground)]">用户名</span>
                    <Link
                      href="/admin/users"
                      className="font-medium text-[var(--primary)] hover:underline"
                    >
                      {order.user.username}
                    </Link>
                  </div>
                  {order.user.email && (
                    <div className="flex justify-between">
                      <span className="text-[var(--muted-foreground)]">邮箱</span>
                      <span className="text-[var(--foreground)]">{order.user.email}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-[var(--muted-foreground)]">余额</span>
                    <span className="text-[var(--foreground)]">¥{order.user.balance.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--muted-foreground)]">注册时间</span>
                    <span className="text-[var(--foreground)]">{formatDate(order.user.createdAt)}</span>
                  </div>
                </>
              ) : (
                <div className="text-center">
                  <Badge variant="outline" className="gap-1">
                    <User className="h-3 w-3" />
                    游客订单
                  </Badge>
                </div>
              )}
              {order.email && (
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-[var(--muted-foreground)]">
                    <Mail className="h-3.5 w-3.5" />
                    通知邮箱
                  </span>
                  <button
                    onClick={() => copyToClipboard(order.email!)}
                    className="flex items-center gap-1 text-[var(--foreground)] hover:text-[var(--primary)] transition-colors"
                  >
                    {order.email}
                    <Copy className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
