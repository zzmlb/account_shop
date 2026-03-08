"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ShoppingBag,
  Eye,
  Download,
  Search,
  Calendar,
  AlertCircle,
  Key,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Pagination from "@/components/shared/pagination";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";

/* ---------- types ---------- */

type TabFilter = "all" | "PENDING" | "PAID" | "DELIVERED" | "CANCELLED" | "REFUNDED";

interface OrderItem {
  productName: string;
  productSlug: string;
  quantity: number;
  unitPrice: number;
  cardKeys: string[];
}

interface ApiOrder {
  id: string;
  orderNo: string;
  status: string;
  totalAmount: number;
  payAmount: number;
  paymentMethod: string | null;
  createdAt: string;
  paidAt?: string | null;
  email: string | null;
  items: OrderItem[];
}

/* ---------- mappings ---------- */

const STATUS_MAP: Record<string, string> = {
  PENDING: "待支付",
  PAID: "已支付",
  DELIVERED: "已完成",
  CANCELLED: "已取消",
  REFUNDED: "已退款",
  EXPIRED: "已过期",
};

const STATUS_VARIANT: Record<string, "default" | "success" | "secondary" | "destructive"> = {
  PENDING: "default",
  PAID: "secondary",
  DELIVERED: "success",
  CANCELLED: "destructive",
  REFUNDED: "destructive",
  EXPIRED: "secondary",
};

const PAYMENT_MAP: Record<string, string> = {
  balance: "余额",
  alipay: "支付宝",
  wechat: "微信",
  usdt: "USDT",
};

const statusTabs: { value: TabFilter; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "PENDING", label: "待支付" },
  { value: "PAID", label: "已支付" },
  { value: "DELIVERED", label: "已完成" },
  { value: "CANCELLED", label: "已取消" },
  { value: "REFUNDED", label: "已退款" },
];

const PAGE_SIZE = 5;

/* ---------- helpers ---------- */

function buildProductSummary(items: OrderItem[]): string {
  return items.map((i) => `${i.productName} x${i.quantity}`).join(", ");
}

function totalQuantity(items: OrderItem[]): number {
  return items.reduce((sum, i) => sum + i.quantity, 0);
}

function formatPayment(method: string | null): string {
  if (!method) return "-";
  return PAYMENT_MAP[method] ?? method;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function exportCSV(orders: ApiOrder[]) {
  const header = "订单号,商品,数量,金额,状态,支付方式,日期\n";
  const rows = orders
    .map((o) =>
      [
        o.orderNo,
        `"${buildProductSummary(o.items)}"`,
        totalQuantity(o.items),
        `¥${o.payAmount.toFixed(2)}`,
        STATUS_MAP[o.status] ?? o.status,
        formatPayment(o.paymentMethod),
        formatDate(o.createdAt),
      ].join(",")
    )
    .join("\n");

  const blob = new Blob(["\uFEFF" + header + rows], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `orders_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ---------- component ---------- */

export default function OrdersPageContent() {
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<TabFilter>("all");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  /* Fetch orders on mount */
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/orders?pageSize=50");
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || "获取订单失败");
        setOrders([]);
      } else {
        setOrders(data.orders ?? []);
      }
    } catch {
      setError("网络错误，请稍后重试");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  /* Filter + search */
  const filtered = useMemo(() => {
    const fromTs = dateFrom ? new Date(dateFrom).getTime() : 0;
    const toTs = dateTo ? new Date(dateTo + "T23:59:59").getTime() : Infinity;
    return orders.filter((order) => {
      if (activeTab !== "all" && order.status !== activeTab) return false;
      if (search) {
        const q = search.toLowerCase();
        const matchOrderNo = order.orderNo.toLowerCase().includes(q);
        const matchProduct = order.items.some((i) =>
          i.productName.toLowerCase().includes(q)
        );
        if (!matchOrderNo && !matchProduct) return false;
      }
      if (fromTs || toTs < Infinity) {
        const orderTs = new Date(order.createdAt).getTime();
        if (orderTs < fromTs || orderTs > toTs) return false;
      }
      return true;
    });
  }, [orders, activeTab, search, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice(
    (safeCurrentPage - 1) * PAGE_SIZE,
    safeCurrentPage * PAGE_SIZE
  );

  /* Reset page when filters change */
  const handleTabChange = (val: string) => {
    setActiveTab(val as TabFilter);
    setCurrentPage(1);
  };
  const handleSearch = (val: string) => {
    setSearch(val);
    setCurrentPage(1);
  };
  const handleDateChange = (from: string, to: string) => {
    setDateFrom(from);
    setDateTo(to);
    setCurrentPage(1);
  };

  const toggleOrderExpand = (orderId: string) => {
    setExpandedOrders((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  };

  const handleCopyKey = async (key: string) => {
    try {
      await navigator.clipboard.writeText(key);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      // Fallback for older browsers
      const ta = document.createElement("textarea");
      ta.value = key;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  /* Status counts for tab badges */
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: orders.length };
    for (const o of orders) {
      counts[o.status] = (counts[o.status] || 0) + 1;
    }
    return counts;
  }, [orders]);


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">我的订单</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            管理和查看您的所有订单
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={orders.length === 0}
          onClick={() => exportCSV(filtered)}
        >
          <Download className="mr-2 h-4 w-4" />
          导出 CSV
        </Button>
      </div>

      {/* Filters row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList>
            {statusTabs.map((tab) => {
              const count = statusCounts[tab.value] || 0;
              return (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label}
                  {count > 0 && (
                    <span className="ml-1 text-xs text-[var(--muted-foreground)]">
                      {count}
                    </span>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>

        <div className="flex flex-wrap items-center gap-3">
          {/* Date range filter */}
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 shrink-0 text-[var(--muted-foreground)]" />
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => handleDateChange(e.target.value, dateTo)}
              className="h-8 w-full sm:w-[130px] text-xs"
              placeholder="开始日期"
              aria-label="开始日期"
            />
            <span className="text-xs text-[var(--muted-foreground)]">~</span>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => handleDateChange(dateFrom, e.target.value)}
              className="h-8 w-full sm:w-[130px] text-xs"
              placeholder="结束日期"
              aria-label="结束日期"
            />
            {(dateFrom || dateTo) && (
              <button
                onClick={() => handleDateChange("", "")}
                className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              >
                清除
              </button>
            )}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
            <Input
              placeholder="搜索订单号或商品名..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-9 sm:w-64"
            />
          </div>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="animate-pulse space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="h-4 w-32 rounded bg-[var(--muted)]" />
                <div className="h-5 w-16 rounded-full bg-[var(--muted)]" />
              </div>
              <div className="h-3 w-2/3 rounded bg-[var(--muted)]" />
              <div className="flex items-center justify-between">
                <div className="h-4 w-20 rounded bg-[var(--muted)]" />
                <div className="h-3 w-24 rounded bg-[var(--muted)]" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="flex flex-col items-center py-16 text-center">
          <div className="mb-4 rounded-full bg-red-50 p-4 dark:bg-red-950/30">
            <AlertCircle className="h-10 w-10 text-red-500" />
          </div>
          <p className="text-sm text-[var(--muted-foreground)]">{error}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={fetchOrders}>
            重试
          </Button>
        </div>
      )}

      {/* Screen reader announcement for filter results */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {!loading && !error && `显示 ${filtered.length} 个订单`}
      </div>

      {/* Order list */}
      {!loading && !error && (
        <div className="space-y-3">
          {paginated.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center">
              <div className="mb-4 rounded-full bg-[var(--muted)] p-4">
                <ShoppingBag className="h-10 w-10 text-[var(--muted-foreground)]" />
              </div>
              {orders.length === 0 ? (
                <>
                  <p className="font-medium text-[var(--foreground)]">还没有任何订单</p>
                  <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                    浏览商品并下单，订单记录将在这里显示
                  </p>
                  <Button asChild className="mt-4" size="sm">
                    <Link href="/products">浏览商品</Link>
                  </Button>
                </>
              ) : (
                <>
                  <p className="font-medium text-[var(--foreground)]">没有匹配的订单</p>
                  <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                    尝试调整筛选条件或搜索关键词
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => {
                      setActiveTab("all");
                      setSearch("");
                      setDateFrom("");
                      setDateTo("");
                      setCurrentPage(1);
                    }}
                  >
                    清除筛选
                  </Button>
                </>
              )}
            </div>
          ) : (
            paginated.map((order) => {
              const productSummary = buildProductSummary(order.items);
              const qty = totalQuantity(order.items);
              const statusLabel = STATUS_MAP[order.status] ?? order.status;
              const variant = STATUS_VARIANT[order.status] ?? "default";
              const payment = formatPayment(order.paymentMethod);
              const date = formatDate(order.createdAt);
              const hasCardKeys = order.status === "DELIVERED" && order.items.some((i) => i.cardKeys.length > 0);
              const isExpanded = expandedOrders.has(order.id);

              return (
                <div
                  key={order.id}
                  className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] transition-colors"
                >
                  {/* Header row */}
                  <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3">
                    <div className="flex items-center gap-3 text-sm">
                      <span className="font-mono text-[var(--muted-foreground)]">
                        {order.orderNo}
                      </span>
                      <span className="hidden text-[var(--muted-foreground)] sm:inline">
                        {date}
                      </span>
                    </div>
                    <Badge variant={variant}>{statusLabel}</Badge>
                  </div>

                  {/* Body row */}
                  <div className="flex items-center justify-between px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--primary)]/10">
                        <ShoppingBag className="h-5 w-5 text-[var(--primary)]" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{productSummary}</p>
                        <p className="text-xs text-[var(--muted-foreground)]">
                          x{qty} &middot; {payment}
                          <span className="ml-2 sm:hidden">{date}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                      <span className="text-base font-bold sm:text-lg">
                        ¥{order.payAmount.toFixed(2)}
                      </span>
                      {hasCardKeys && (
                        <button
                          onClick={() => toggleOrderExpand(order.id)}
                          aria-expanded={isExpanded}
                          aria-label={isExpanded ? "收起卡密信息" : "展开卡密信息"}
                          className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--primary)]/30 bg-[var(--primary)]/5 px-3 py-1.5 text-sm font-medium text-[var(--primary)] transition-colors hover:bg-[var(--primary)]/10"
                        >
                          <Key className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">卡密</span>
                          {isExpanded ? (
                            <ChevronUp className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5" />
                          )}
                        </button>
                      )}
                      {order.status === "DELIVERED" && order.items.length > 0 && (
                        <Link
                          href={`/products/${order.items[0].productSlug}`}
                          className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--primary)]/30 bg-[var(--primary)]/5 px-3 py-1.5 text-sm font-medium text-[var(--primary)] transition-colors hover:bg-[var(--primary)]/10"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">再次购买</span>
                        </Link>
                      )}
                      <Link
                        href={`/order/${order.orderNo}`}
                        className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--border)] px-3 py-1.5 text-sm font-medium transition-colors hover:bg-[var(--muted)]"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">详情</span>
                      </Link>
                    </div>
                  </div>

                  {/* Card keys expandable section */}
                  {hasCardKeys && isExpanded && (
                    <div className="border-t border-[var(--border)] bg-[var(--muted)]/30 px-5 py-4">
                      <div className="mb-2 flex items-center gap-2 text-xs font-medium text-[var(--muted-foreground)]">
                        <Key className="h-3.5 w-3.5" />
                        卡密信息
                      </div>
                      <div className="space-y-3">
                        {order.items
                          .filter((item) => item.cardKeys.length > 0)
                          .map((item, idx) => (
                            <div key={idx}>
                              <p className="mb-1.5 text-xs font-medium text-[var(--foreground)]">
                                {item.productName} x{item.quantity}
                              </p>
                              <div className="space-y-1.5">
                                {item.cardKeys.map((key, ki) => (
                                  <div
                                    key={ki}
                                    className="flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card)] px-3 py-2"
                                  >
                                    <code className="min-w-0 flex-1 truncate text-xs">
                                      {key}
                                    </code>
                                    <button
                                      onClick={() => handleCopyKey(key)}
                                      aria-label={copiedKey === key ? "已复制" : "复制卡密"}
                                      className="shrink-0 rounded-[var(--radius-sm)] p-1 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
                                      title="复制"
                                    >
                                      {copiedKey === key ? (
                                        <Check className="h-3.5 w-3.5 text-green-500" />
                                      ) : (
                                        <Copy className="h-3.5 w-3.5" />
                                      )}
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Pagination */}
      {!loading && !error && filtered.length > PAGE_SIZE && (
        <Pagination
          page={safeCurrentPage}
          totalPages={totalPages}
          total={filtered.length}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
}
