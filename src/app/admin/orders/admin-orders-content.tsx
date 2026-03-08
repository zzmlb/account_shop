"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Search,
  Download,
  MoreHorizontal,
  Eye,
  ExternalLink,
  RotateCcw,
  XCircle,
  CalendarDays,
  Package,
  Loader2,
  Truck,
  Copy,
  Mail,
  Clock,
  Key,
  User,
  CreditCard,
  CheckSquare,
  DollarSign,
  ShoppingCart,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import PaginationBar from "@/components/shared/pagination";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDateTime } from "@/lib/utils";

type OrderStatus =
  | "PENDING"
  | "PAID"
  | "DELIVERED"
  | "CANCELLED"
  | "REFUNDED"
  | "EXPIRED";

interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  quantity: number;
  unitPrice: number;
  cardKeys?: Array<{
    id: string;
    content: string;
    status: string;
    soldAt: string | null;
  }>;
}

interface Order {
  id: string;
  orderNo: string;
  userId: string | null;
  user: {
    id: string;
    username: string;
    email: string | null;
  } | null;
  email: string | null;
  totalAmount: number;
  payAmount: number;
  status: OrderStatus;
  paymentMethod: string | null;
  paymentId: string | null;
  paidAt: string | null;
  expireAt: string;
  couponId: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface OrderStats {
  todayOrders: number;
  todayRevenue: number;
  pendingCount: number;
  paidCount: number;
}

const statusConfig: Record<
  OrderStatus,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline" | "success";
    className?: string;
  }
> = {
  PENDING: {
    label: "待支付",
    variant: "outline",
    className: "border-[var(--warning)] text-[var(--warning)]",
  },
  PAID: { label: "已支付", variant: "default" },
  DELIVERED: { label: "已完成", variant: "success" },
  CANCELLED: { label: "已取消", variant: "secondary" },
  REFUNDED: { label: "已退款", variant: "destructive" },
  EXPIRED: { label: "已过期", variant: "secondary" },
};

const statusTabs = [
  { value: "ALL", label: "全部" },
  { value: "PENDING", label: "待支付" },
  { value: "PAID", label: "已支付" },
  { value: "DELIVERED", label: "已完成" },
  { value: "CANCELLED", label: "已取消" },
  { value: "REFUNDED", label: "已退款" },
  { value: "EXPIRED", label: "已过期" },
];

const paymentMethodMap: Record<string, string> = {
  balance: "余额",
  alipay: "支付宝",
  wechat: "微信",
  usdt: "USDT",
};

function formatPaymentMethod(method: string | null): string {
  if (!method) return "-";
  return paymentMethodMap[method] || method;
}

function getProductSummary(items: OrderItem[]): string {
  if (items.length === 0) return "-";
  const first = items[0].productName;
  if (items.length === 1) {
    return items[0].quantity > 1 ? `${first} x${items[0].quantity}` : first;
  }
  return `${first} 等${items.length}件商品`;
}

export default function AdminOrdersPageContent() {
  const [activeTab, setActiveTab] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 1,
  });
  const [orderStats, setOrderStats] = useState<OrderStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    orderId: string;
    orderNo: string;
    status: "DELIVERED" | "REFUNDED" | "CANCELLED";
  } | null>(null);
  const pageSize = 20;
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchOrders = useCallback(
    async (page: number, status: string, search: string, from?: string, to?: string, payment?: string) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("pageSize", String(pageSize));
        if (status && status !== "ALL") {
          params.set("status", status);
        }
        if (search) {
          params.set("search", search);
        }
        if (from) params.set("dateFrom", from);
        if (to) params.set("dateTo", to);
        if (payment) params.set("paymentMethod", payment);

        const res = await fetch(`/api/admin/orders?${params.toString()}`);
        const data = await res.json();

        if (!res.ok || !data.success) {
          toast.error(data.message || "获取订单列表失败");
          return;
        }

        setOrders(data.orders);
        setPagination(data.pagination);
        if (data.stats) setOrderStats(data.stats);
      } catch {
        toast.error("网络错误，无法获取订单列表");
      } finally {
        setLoading(false);
      }
    },
    [pageSize]
  );

  useEffect(() => {
    fetchOrders(currentPage, activeTab, searchQuery, dateFrom, dateTo, paymentFilter);
  }, [currentPage, activeTab, searchQuery, dateFrom, dateTo, paymentFilter, fetchOrders]);

  // Refresh data when tab becomes visible
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchOrders(currentPage, activeTab, searchQuery, dateFrom, dateTo, paymentFilter);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [fetchOrders, currentPage, activeTab, searchQuery, dateFrom, dateTo, paymentFilter]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setCurrentPage(1);
  };

  const handleSearchInputChange = (value: string) => {
    setSearchInput(value);
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }
    searchTimerRef.current = setTimeout(() => {
      setSearchQuery(value);
      setCurrentPage(1);
    }, 400);
  };

  const handleUpdateStatus = async (
    orderId: string,
    newStatus: "DELIVERED" | "REFUNDED" | "CANCELLED"
  ) => {
    const actionLabels: Record<string, string> = {
      DELIVERED: "发货",
      REFUNDED: "退款",
      CANCELLED: "取消",
    };
    const actionLabel = actionLabels[newStatus] || newStatus;
    setActionLoading(orderId);
    try {
      const res = await fetch(`/api/admin/orders?id=${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        toast.error(data.message || `${actionLabel}失败`);
        return;
      }

      toast.success(data.message || `${actionLabel}成功`);
      fetchOrders(currentPage, activeTab, searchQuery, dateFrom, dateTo, paymentFilter);
    } catch {
      toast.error(`网络错误，${actionLabel}操作失败`);
    } finally {
      setActionLoading(null);
    }
  };

  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [exporting, setExporting] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [batchCancelling, setBatchCancelling] = useState(false);
  const [batchDelivering, setBatchDelivering] = useState(false);

  // Clear selection when filters/page change
  useEffect(() => {
    setSelectedOrders(new Set());
  }, [currentPage, activeTab, searchQuery, dateFrom, dateTo, paymentFilter]);

  const allSelected =
    orders.length > 0 && orders.every((o) => selectedOrders.has(o.id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(orders.map((o) => o.id)));
    }
  };

  const toggleSelectOrder = (id: string) => {
    setSelectedOrders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleBatchCancel = async () => {
    const ids = Array.from(selectedOrders);
    const cancellable = orders.filter(
      (o) => ids.includes(o.id) && (o.status === "PENDING" || o.status === "PAID")
    );
    if (cancellable.length === 0) {
      toast.error("所选订单中没有可取消的订单（仅待支付/已支付可取消）");
      return;
    }
    setBatchCancelling(true);
    try {
      const res = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, status: "CANCELLED" }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        setSelectedOrders(new Set());
        fetchOrders(currentPage, activeTab, searchQuery, dateFrom, dateTo, paymentFilter);
      } else {
        toast.error(data.message || "批量取消失败");
      }
    } catch {
      toast.error("网络错误，批量取消失败");
    } finally {
      setBatchCancelling(false);
    }
  };

  const handleBatchDeliver = async () => {
    const ids = Array.from(selectedOrders);
    const deliverable = orders.filter(
      (o) => ids.includes(o.id) && o.status === "PAID"
    );
    if (deliverable.length === 0) {
      toast.error("所选订单中没有可发货的订单（仅已支付订单可发货）");
      return;
    }
    setBatchDelivering(true);
    try {
      const res = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, status: "DELIVERED" }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        setSelectedOrders(new Set());
        fetchOrders(currentPage, activeTab, searchQuery, dateFrom, dateTo, paymentFilter);
      } else {
        toast.error(data.message || "批量发货失败");
      }
    } catch {
      toast.error("网络错误，批量发货失败");
    } finally {
      setBatchDelivering(false);
    }
  };

  const handleExportSelected = () => {
    const selected = orders.filter((o) => selectedOrders.has(o.id));
    if (selected.length === 0) {
      toast.error("请先选择要导出的订单");
      return;
    }
    const header = "订单号,用户,邮箱,商品,数量,原价,实付,支付方式,状态,创建时间,支付时间\n";
    const rows = selected
      .map((o) => {
        const user = o.user?.username || "-";
        const email = o.user?.email || o.email || "-";
        const products = o.items.map((i) => i.productName).join("; ");
        const qty = o.items.reduce((s, i) => s + i.quantity, 0);
        const status = statusConfig[o.status]?.label || o.status;
        const payment = formatPaymentMethod(o.paymentMethod);
        const paidAt = o.paidAt ? formatDateTime(o.paidAt) : "-";
        return [
          o.orderNo,
          user,
          email,
          `"${products}"`,
          qty,
          o.totalAmount.toFixed(2),
          o.payAmount.toFixed(2),
          payment,
          status,
          formatDateTime(o.createdAt),
          paidAt,
        ].join(",");
      })
      .join("\n");
    const bom = "\uFEFF";
    const blob = new Blob([bom + header + rows], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders_selected_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`已导出 ${selected.length} 条订单`);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      // Fetch all orders matching current filters (up to 1000)
      const params = new URLSearchParams();
      params.set("page", "1");
      params.set("pageSize", "1000");
      if (activeTab && activeTab !== "ALL") {
        params.set("status", activeTab);
      }
      if (searchQuery) {
        params.set("search", searchQuery);
      }
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);

      const res = await fetch(`/api/admin/orders?${params.toString()}`);
      const data = await res.json();

      if (!data.success || !data.orders?.length) {
        toast.error("没有可导出的订单数据");
        return;
      }

      // Build CSV
      const header = "订单号,用户,邮箱,商品,数量,原价,实付,支付方式,状态,创建时间,支付时间\n";
      const rows = (data.orders as Order[])
        .map((o) => {
          const user = o.user?.username || "-";
          const email = o.user?.email || o.email || "-";
          const products = o.items.map((i) => i.productName).join("; ");
          const qty = o.items.reduce((s, i) => s + i.quantity, 0);
          const status = statusConfig[o.status]?.label || o.status;
          const payment = formatPaymentMethod(o.paymentMethod);
          const paidAt = o.paidAt ? formatDateTime(o.paidAt) : "-";
          return [
            o.orderNo,
            user,
            email,
            `"${products}"`,
            qty,
            o.totalAmount.toFixed(2),
            o.payAmount.toFixed(2),
            payment,
            status,
            formatDateTime(o.createdAt),
            paidAt,
          ].join(",");
        })
        .join("\n");

      const bom = "\uFEFF"; // UTF-8 BOM for Excel compatibility
      const blob = new Blob([bom + header + rows], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `orders_${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`已导出 ${data.orders.length} 条订单`);
    } catch {
      toast.error("导出失败，请稍后重试");
    } finally {
      setExporting(false);
    }
  };

  const { total, totalPages } = pagination;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
            订单管理
          </h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            管理和追踪所有平台订单
          </p>
        </div>
        <Button
          variant="outline"
          className="gap-2"
          onClick={handleExport}
          disabled={exporting}
        >
          {exporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          导出
        </Button>
      </div>

      {/* Stats Cards */}
      {orderStats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] px-4 py-3">
            <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
              <ShoppingCart className="h-3.5 w-3.5" />
              今日订单
            </div>
            <p className="mt-1 text-xl font-bold text-[var(--foreground)]">{orderStats.todayOrders}</p>
          </div>
          <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] px-4 py-3">
            <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
              <DollarSign className="h-3.5 w-3.5" />
              今日收入
            </div>
            <p className="mt-1 text-xl font-bold text-[var(--primary)]">
              ¥{orderStats.todayRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] px-4 py-3">
            <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
              <Clock className="h-3.5 w-3.5" />
              待支付
            </div>
            <p className="mt-1 text-xl font-bold text-[var(--warning)]">{orderStats.pendingCount}</p>
          </div>
          <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] px-4 py-3">
            <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
              <AlertCircle className="h-3.5 w-3.5" />
              待发货
            </div>
            <p className="mt-1 text-xl font-bold text-[var(--accent)]">{orderStats.paidCount}</p>
          </div>
        </div>
      )}

      {/* Status Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="h-auto flex-wrap">
          {statusTabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="gap-1.5">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Search & Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
          <Input
            placeholder="搜索订单号或邮箱..."
            value={searchInput}
            onChange={(e) => handleSearchInputChange(e.target.value)}
            className="pl-9"
            aria-label="搜索订单"
          />
        </div>
        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            className={`gap-2 ${dateFrom || dateTo ? "text-[var(--primary)] border-[var(--primary)]/50" : "text-[var(--muted-foreground)]"}`}
            onClick={() => setShowDateFilter(!showDateFilter)}
            aria-expanded={showDateFilter}
            aria-label="日期范围筛选"
          >
            <CalendarDays className="h-4 w-4" />
            {dateFrom || dateTo ? `${dateFrom || "..."}~${dateTo || "..."}` : "日期范围"}
          </Button>
          {showDateFilter && (
            <div className="absolute right-0 top-full z-20 mt-2 w-72 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-4 shadow-lg">
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--muted-foreground)]">
                    开始日期
                  </label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => {
                      setDateFrom(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--muted-foreground)]">
                    结束日期
                  </label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => {
                      setDateTo(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setDateFrom("");
                      setDateTo("");
                      setCurrentPage(1);
                      setShowDateFilter(false);
                    }}
                  >
                    清除
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => setShowDateFilter(false)}
                  >
                    确认
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
        {/* Payment method filter */}
        <select
          value={paymentFilter}
          onChange={(e) => {
            setPaymentFilter(e.target.value);
            setCurrentPage(1);
          }}
          className={`h-9 rounded-[var(--radius-md)] border px-3 text-sm transition-colors bg-transparent ${
            paymentFilter
              ? "border-[var(--primary)]/50 text-[var(--primary)]"
              : "border-[var(--border)] text-[var(--muted-foreground)]"
          }`}
          aria-label="支付方式筛选"
        >
          <option value="">全部支付方式</option>
          <option value="balance">余额</option>
          <option value="alipay">支付宝</option>
          <option value="wechat">微信</option>
          <option value="usdt">USDT</option>
        </select>
      </div>

      {/* Bulk action bar */}
      {selectedOrders.size > 0 && (
        <div className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--primary)]/30 bg-[var(--primary)]/5 px-4 py-2.5">
          <CheckSquare className="h-4 w-4 text-[var(--primary)]" />
          <span className="text-sm">
            已选择 <strong>{selectedOrders.size}</strong> 个订单
          </span>
          <div className="ml-auto flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={handleExportSelected}
            >
              <Download className="h-3.5 w-3.5" />
              导出所选
            </Button>
            <Button
              size="sm"
              variant="default"
              className="gap-1.5"
              onClick={handleBatchDeliver}
              disabled={batchDelivering}
            >
              {batchDelivering ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Truck className="h-3.5 w-3.5" />
              )}
              批量发货
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="gap-1.5"
              onClick={handleBatchCancel}
              disabled={batchCancelling}
            >
              {batchCancelling ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <XCircle className="h-3.5 w-3.5" />
              )}
              批量取消
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedOrders(new Set())}
            >
              取消选择
            </Button>
          </div>
        </div>
      )}

      {/* Orders Table - Desktop */}
      <Card className="hidden md:block">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full" aria-label="订单管理列表">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="w-10 px-3 py-3">
                    <input
                      type="checkbox"
                      checked={allSelected && orders.length > 0}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-[var(--input)] accent-[var(--primary)] cursor-pointer"
                      aria-label="全选"
                    />
                  </th>
                  <th className="text-left text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider px-4 py-3">
                    订单号
                  </th>
                  <th className="text-left text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider px-4 py-3">
                    用户
                  </th>
                  <th className="text-left text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider px-4 py-3">
                    商品
                  </th>
                  <th className="text-right text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider px-4 py-3">
                    金额
                  </th>
                  <th className="text-left text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider px-4 py-3">
                    支付方式
                  </th>
                  <th className="text-left text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider px-4 py-3">
                    状态
                  </th>
                  <th className="text-left text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider px-4 py-3">
                    时间
                  </th>
                  <th className="text-right text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider px-4 py-3">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse border-b border-[var(--border)]">
                      <td className="px-3 py-3"><div className="h-4 w-4 rounded bg-[var(--muted)]" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-20 rounded bg-[var(--muted)]" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-24 rounded bg-[var(--muted)]" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-28 rounded bg-[var(--muted)]" /></td>
                      <td className="px-4 py-3"><div className="h-5 w-14 rounded-full bg-[var(--muted)]" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-14 rounded bg-[var(--muted)]" /></td>
                      <td className="px-4 py-3"><div className="h-5 w-12 rounded-full bg-[var(--muted)]" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-24 rounded bg-[var(--muted)]" /></td>
                      <td className="px-4 py-3 text-right"><div className="ml-auto h-8 w-8 rounded bg-[var(--muted)]" /></td>
                    </tr>
                  ))
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12">
                      <Package className="h-10 w-10 mx-auto text-[var(--muted-foreground)] mb-3" />
                      <p className="text-sm text-[var(--muted-foreground)]">
                        暂无订单数据
                      </p>
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => {
                    const status = statusConfig[order.status] ?? {
                      label: order.status,
                      variant: "outline" as const,
                    };
                    const displayEmail =
                      order.user?.email || order.email || "-";
                    const displayName =
                      order.user?.username || displayEmail;
                    const isSelected = selectedOrders.has(order.id);

                    return (
                      <tr
                        key={order.id}
                        className={`border-b border-[var(--border)] last:border-0 hover:bg-[var(--muted)]/50 transition-colors cursor-pointer ${isSelected ? "bg-[var(--primary)]/5" : ""}`}
                        onClick={() => setDetailOrder(order)}
                      >
                        <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectOrder(order.id)}
                            className="h-4 w-4 rounded border-[var(--input)] accent-[var(--primary)] cursor-pointer"
                            aria-label={`选择订单 ${order.orderNo}`}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm font-mono font-medium text-[var(--foreground)]">
                            {order.orderNo}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-sm font-medium text-[var(--foreground)]">
                              {displayName}
                            </p>
                            <p className="text-xs text-[var(--muted-foreground)]">
                              {displayEmail}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className="text-sm text-[var(--foreground)] max-w-[200px] truncate block"
                            title={order.items
                              .map((i) => `${i.productName} x${i.quantity}`)
                              .join(", ")}
                          >
                            {getProductSummary(order.items)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm font-semibold text-[var(--foreground)]">
                            ¥{order.payAmount.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-[var(--muted-foreground)]">
                            {formatPaymentMethod(order.paymentMethod)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={status.variant}
                            className={status.className}
                          >
                            {status.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-[var(--muted-foreground)] whitespace-nowrap">
                            {formatDateTime(order.createdAt)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 sm:h-8 sm:w-8"
                                disabled={actionLoading === order.id}
                                aria-label="订单操作"
                              >
                                {actionLoading === order.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <MoreHorizontal className="h-4 w-4" />
                                )}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                className="gap-2 cursor-pointer"
                                onClick={() => setDetailOrder(order)}
                              >
                                <Eye className="h-4 w-4" />
                                快速查看
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild className="gap-2 cursor-pointer">
                                <Link href={`/admin/orders/${order.id}`}>
                                  <ExternalLink className="h-4 w-4" />
                                  订单详情页
                                </Link>
                              </DropdownMenuItem>
                              {order.status === "PAID" && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="gap-2 cursor-pointer"
                                    onClick={() =>
                                      setConfirmAction({ orderId: order.id, orderNo: order.orderNo, status: "DELIVERED" })
                                    }
                                  >
                                    <Truck className="h-4 w-4" />
                                    手动发货
                                  </DropdownMenuItem>
                                </>
                              )}
                              {(order.status === "PAID" ||
                                order.status === "DELIVERED") && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="gap-2 cursor-pointer text-[var(--destructive)]"
                                    onClick={() =>
                                      setConfirmAction({ orderId: order.id, orderNo: order.orderNo, status: "REFUNDED" })
                                    }
                                  >
                                    <RotateCcw className="h-4 w-4" />
                                    退款
                                  </DropdownMenuItem>
                                </>
                              )}
                              {(order.status === "PENDING" ||
                                order.status === "PAID") && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="gap-2 cursor-pointer text-[var(--destructive)]"
                                    onClick={() =>
                                      setConfirmAction({ orderId: order.id, orderNo: order.orderNo, status: "CANCELLED" })
                                    }
                                  >
                                    <XCircle className="h-4 w-4" />
                                    取消订单
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && total > 0 && (
            <>
              <Separator />
              <PaginationBar
                page={currentPage}
                totalPages={totalPages}
                total={total}
                onPageChange={setCurrentPage}
                showPageNumbers
                totalLabel="条订单"
                className="px-4 py-3"
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Orders Cards - Mobile */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="animate-pulse space-y-3 p-4">
                  <div className="flex items-center justify-between">
                    <div className="h-4 w-24 rounded bg-[var(--muted)]" />
                    <div className="h-5 w-14 rounded-full bg-[var(--muted)]" />
                  </div>
                  <div className="h-3 w-2/3 rounded bg-[var(--muted)]" />
                  <div className="flex items-center justify-between">
                    <div className="h-4 w-16 rounded bg-[var(--muted)]" />
                    <div className="h-8 w-8 rounded bg-[var(--muted)]" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : orders.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="h-10 w-10 text-[var(--muted-foreground)] mb-3" />
              <p className="text-sm text-[var(--muted-foreground)]">暂无订单数据</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {orders.map((order) => {
              const status = statusConfig[order.status] ?? {
                label: order.status,
                variant: "outline" as const,
              };
              const displayEmail = order.user?.email || order.email || "-";
              const displayName = order.user?.username || displayEmail;
              const isSelected = selectedOrders.has(order.id);

              return (
                <Card
                  key={order.id}
                  className={`cursor-pointer hover:bg-[var(--muted)]/50 transition-colors ${isSelected ? "ring-1 ring-[var(--primary)]" : ""}`}
                  onClick={() => setDetailOrder(order)}
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectOrder(order.id)}
                            className="h-4 w-4 rounded border-[var(--input)] accent-[var(--primary)] cursor-pointer"
                            aria-label={`选择订单 ${order.orderNo}`}
                          />
                        </div>
                        <span className="text-sm font-mono font-medium text-[var(--foreground)]">
                          {order.orderNo}
                        </span>
                      </div>
                      <Badge variant={status.variant} className={status.className}>
                        {status.label}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-1.5 text-[var(--muted-foreground)]">
                        <User className="h-3.5 w-3.5" />
                        <span className="truncate max-w-[140px]">{displayName}</span>
                      </div>
                      <span className="font-semibold text-[var(--foreground)]">
                        ¥{order.payAmount.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-[var(--muted-foreground)]">
                      <span className="truncate max-w-[180px]">{getProductSummary(order.items)}</span>
                      <span className="whitespace-nowrap flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDateTime(order.createdAt)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-[var(--border)]">
                      <span className="text-xs text-[var(--muted-foreground)] flex items-center gap-1">
                        <CreditCard className="h-3 w-3" />
                        {formatPaymentMethod(order.paymentMethod)}
                      </span>
                      <div onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              disabled={actionLoading === order.id}
                              aria-label="订单操作"
                            >
                              {actionLoading === order.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <MoreHorizontal className="h-4 w-4" />
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              className="gap-2 cursor-pointer"
                              onClick={() => setDetailOrder(order)}
                            >
                              <Eye className="h-4 w-4" />
                              快速查看
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild className="gap-2 cursor-pointer">
                              <Link href={`/admin/orders/${order.id}`}>
                                <ExternalLink className="h-4 w-4" />
                                订单详情页
                              </Link>
                            </DropdownMenuItem>
                            {order.status === "PAID" && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="gap-2 cursor-pointer"
                                  onClick={() =>
                                    setConfirmAction({ orderId: order.id, orderNo: order.orderNo, status: "DELIVERED" })
                                  }
                                >
                                  <Truck className="h-4 w-4" />
                                  手动发货
                                </DropdownMenuItem>
                              </>
                            )}
                            {(order.status === "PAID" || order.status === "DELIVERED") && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="gap-2 cursor-pointer text-[var(--destructive)]"
                                  onClick={() =>
                                    setConfirmAction({ orderId: order.id, orderNo: order.orderNo, status: "REFUNDED" })
                                  }
                                >
                                  <RotateCcw className="h-4 w-4" />
                                  退款
                                </DropdownMenuItem>
                              </>
                            )}
                            {(order.status === "PENDING" || order.status === "PAID") && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="gap-2 cursor-pointer text-[var(--destructive)]"
                                  onClick={() =>
                                    setConfirmAction({ orderId: order.id, orderNo: order.orderNo, status: "CANCELLED" })
                                  }
                                >
                                  <XCircle className="h-4 w-4" />
                                  取消订单
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {total > 0 && (
              <PaginationBar
                page={currentPage}
                totalPages={totalPages}
                total={total}
                onPageChange={setCurrentPage}
                totalLabel="条订单"
              />
            )}
          </>
        )}
      </div>
      {/* Order Detail Dialog */}
      <Dialog open={!!detailOrder} onOpenChange={(open) => !open && setDetailOrder(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {detailOrder && (() => {
            const status = statusConfig[detailOrder.status] ?? {
              label: detailOrder.status,
              variant: "outline" as const,
            };
            const displayEmail = detailOrder.user?.email || detailOrder.email || "-";
            const displayName = detailOrder.user?.username || "游客";
            const totalQty = detailOrder.items.reduce((s, i) => s + i.quantity, 0);

            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-3">
                    <span>订单详情</span>
                    <Badge variant={status.variant} className={status.className}>
                      {status.label}
                    </Badge>
                  </DialogTitle>
                </DialogHeader>

                {/* Order info grid */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-[var(--muted-foreground)]" />
                    <div>
                      <p className="text-[var(--muted-foreground)]">订单号</p>
                      <p className="font-mono font-medium flex items-center gap-1">
                        {detailOrder.orderNo}
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(detailOrder.orderNo);
                            toast.success("已复制订单号");
                          }}
                          className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-[var(--muted-foreground)]" />
                    <div>
                      <p className="text-[var(--muted-foreground)]">用户</p>
                      <p className="font-medium">{displayName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-[var(--muted-foreground)]" />
                    <div>
                      <p className="text-[var(--muted-foreground)]">邮箱</p>
                      <p className="font-medium">{displayEmail}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-[var(--muted-foreground)]" />
                    <div>
                      <p className="text-[var(--muted-foreground)]">支付方式</p>
                      <p className="font-medium">{formatPaymentMethod(detailOrder.paymentMethod)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-[var(--muted-foreground)]" />
                    <div>
                      <p className="text-[var(--muted-foreground)]">创建时间</p>
                      <p className="font-medium">{formatDateTime(detailOrder.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-[var(--muted-foreground)]" />
                    <div>
                      <p className="text-[var(--muted-foreground)]">支付时间</p>
                      <p className="font-medium">{detailOrder.paidAt ? formatDateTime(detailOrder.paidAt) : "-"}</p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Order items */}
                <div>
                  <h4 className="mb-3 text-sm font-semibold text-[var(--foreground)]">
                    商品明细（{totalQty} 件）
                  </h4>
                  <div className="space-y-3">
                    {detailOrder.items.map((item) => (
                      <div key={item.id} className="rounded-[var(--radius-md)] border border-[var(--border)] p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">{item.productName}</span>
                          <span className="text-sm">
                            ¥{item.unitPrice.toFixed(2)} x {item.quantity} ={" "}
                            <span className="font-semibold">
                              ¥{(item.unitPrice * item.quantity).toFixed(2)}
                            </span>
                          </span>
                        </div>

                        {/* Card keys for delivered orders */}
                        {item.cardKeys && item.cardKeys.length > 0 && (
                          <div className="mt-2 space-y-1">
                            <div className="flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
                              <Key className="h-3 w-3" />
                              <span>卡密信息</span>
                              <button
                                onClick={() => {
                                  const keys = item.cardKeys ?? [];
                                  const text = keys.map((ck) => ck.content).join("\n");
                                  navigator.clipboard.writeText(text);
                                  toast.success(`已复制 ${keys.length} 个卡密`);
                                }}
                                className="ml-auto text-[var(--primary)] hover:underline"
                              >
                                复制全部
                              </button>
                            </div>
                            {item.cardKeys.map((ck, idx) => (
                              <div
                                key={ck.id}
                                className="flex items-center justify-between rounded bg-[var(--muted)]/50 px-2 py-1 font-mono text-xs"
                              >
                                <span>
                                  {idx + 1}. {ck.content}
                                </span>
                                <Badge variant="outline" className="text-[10px] px-1 py-0">
                                  {ck.status === "SOLD" ? "已售" : ck.status}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Price summary */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[var(--muted-foreground)]">商品总额</span>
                    <span>¥{detailOrder.totalAmount.toFixed(2)}</span>
                  </div>
                  {detailOrder.couponId && detailOrder.totalAmount !== detailOrder.payAmount && (
                    <div className="flex justify-between text-[var(--success)]">
                      <span>优惠折扣</span>
                      <span>-¥{(detailOrder.totalAmount - detailOrder.payAmount).toFixed(2)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between font-semibold text-base">
                    <span>实付金额</span>
                    <span className="text-[var(--primary)]">¥{detailOrder.payAmount.toFixed(2)}</span>
                  </div>
                </div>

                {/* Quick actions */}
                <div className="flex gap-2 pt-2">
                  {detailOrder.status === "PAID" && (
                    <Button
                      size="sm"
                      className="gap-1.5"
                      onClick={() => {
                        setConfirmAction({ orderId: detailOrder.id, orderNo: detailOrder.orderNo, status: "DELIVERED" });
                        setDetailOrder(null);
                      }}
                    >
                      <Truck className="h-4 w-4" />
                      手动发货
                    </Button>
                  )}
                  {(detailOrder.status === "PAID" || detailOrder.status === "DELIVERED") && (
                    <Button
                      size="sm"
                      variant="destructive"
                      className="gap-1.5"
                      onClick={() => {
                        setConfirmAction({ orderId: detailOrder.id, orderNo: detailOrder.orderNo, status: "REFUNDED" });
                        setDetailOrder(null);
                      }}
                    >
                      <RotateCcw className="h-4 w-4" />
                      退款
                    </Button>
                  )}
                  {(detailOrder.status === "PENDING" || detailOrder.status === "PAID") && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-[var(--destructive)]"
                      onClick={() => {
                        setConfirmAction({ orderId: detailOrder.id, orderNo: detailOrder.orderNo, status: "CANCELLED" });
                        setDetailOrder(null);
                      }}
                    >
                      <XCircle className="h-4 w-4" />
                      取消订单
                    </Button>
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Confirmation dialog for order status changes */}
      <Dialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {confirmAction?.status === "DELIVERED" && "确认发货"}
              {confirmAction?.status === "REFUNDED" && "确认退款"}
              {confirmAction?.status === "CANCELLED" && "确认取消"}
            </DialogTitle>
            <DialogDescription>
              {confirmAction?.status === "DELIVERED" &&
                `确定要将订单 ${confirmAction.orderNo} 标记为已发货吗？系统将自动分配卡密。`}
              {confirmAction?.status === "REFUNDED" &&
                `确定要对订单 ${confirmAction.orderNo} 进行退款吗？退款后余额将返还给用户。`}
              {confirmAction?.status === "CANCELLED" &&
                `确定要取消订单 ${confirmAction.orderNo} 吗？取消后库存将被释放。`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmAction(null)}>
              返回
            </Button>
            <Button
              variant={confirmAction?.status === "DELIVERED" ? "default" : "destructive"}
              onClick={() => {
                if (confirmAction) {
                  handleUpdateStatus(confirmAction.orderId, confirmAction.status);
                  setConfirmAction(null);
                }
              }}
            >
              {confirmAction?.status === "DELIVERED" && "确认发货"}
              {confirmAction?.status === "REFUNDED" && "确认退款"}
              {confirmAction?.status === "CANCELLED" && "确认取消"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
