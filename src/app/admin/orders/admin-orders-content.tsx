"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Download,
  XCircle,
  Loader2,
  Truck,
  CheckSquare,
} from "lucide-react";
import { toast } from "sonner";
import { apiFetch, apiMutate } from "@/lib/api-fetch";

import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDateTime } from "@/lib/utils";

import { AdminOrderStats } from "./admin-order-stats";
import { AdminOrdersSearchFilters } from "./admin-orders-search-filters";
import { OrderDetailDialog } from "./order-detail-dialog";
import { OrdersDesktopTable, OrdersMobileCards } from "./orders-table";

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

export default function AdminOrdersPageContent() {
  const [activeTab, setActiveTab] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
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

        const data = await apiFetch<{ orders: Order[]; pagination: { page: number; pageSize: number; total: number; totalPages: number }; stats?: typeof orderStats }>(`/api/admin/orders?${params.toString()}`);
        setOrders(data.orders);
        setPagination(data.pagination);
        if (data.stats) setOrderStats(data.stats);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "获取订单列表失败");
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
      const data = await apiMutate<{ message: string }>(`/api/admin/orders?id=${orderId}`, "PUT", { status: newStatus });
      toast.success(data.message || `${actionLabel}成功`);
      fetchOrders(currentPage, activeTab, searchQuery, dateFrom, dateTo, paymentFilter);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `${actionLabel}失败`);
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
      const data = await apiMutate<{ message: string }>("/api/admin/orders", "PATCH", { ids, status: "CANCELLED" });
      toast.success(data.message);
      setSelectedOrders(new Set());
      fetchOrders(currentPage, activeTab, searchQuery, dateFrom, dateTo, paymentFilter);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "批量取消失败");
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
      const data = await apiMutate<{ message: string }>("/api/admin/orders", "PATCH", { ids, status: "DELIVERED" });
      toast.success(data.message);
      setSelectedOrders(new Set());
      fetchOrders(currentPage, activeTab, searchQuery, dateFrom, dateTo, paymentFilter);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "批量发货失败");
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

      const data = await apiFetch<{ orders: Order[] }>(`/api/admin/orders?${params.toString()}`);

      if (!data.orders?.length) {
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
      {orderStats && <AdminOrderStats stats={orderStats} />}

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
      <AdminOrdersSearchFilters
        onSearchChange={(q) => { setSearchQuery(q); setCurrentPage(1); }}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={(v) => { setDateFrom(v); setCurrentPage(1); }}
        onDateToChange={(v) => { setDateTo(v); setCurrentPage(1); }}
        paymentFilter={paymentFilter}
        onPaymentFilterChange={(v) => { setPaymentFilter(v); setCurrentPage(1); }}
      />

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
      <OrdersDesktopTable
        orders={orders}
        loading={loading}
        selectedOrders={selectedOrders}
        allSelected={allSelected}
        actionLoading={actionLoading}
        currentPage={currentPage}
        totalPages={totalPages}
        total={total}
        onToggleSelectAll={toggleSelectAll}
        onToggleSelectOrder={toggleSelectOrder}
        onViewDetail={setDetailOrder}
        onConfirmAction={setConfirmAction}
        onPageChange={setCurrentPage}
      />

      {/* Orders Cards - Mobile */}
      <OrdersMobileCards
        orders={orders}
        loading={loading}
        selectedOrders={selectedOrders}
        actionLoading={actionLoading}
        currentPage={currentPage}
        totalPages={totalPages}
        total={total}
        onToggleSelectOrder={toggleSelectOrder}
        onViewDetail={setDetailOrder}
        onConfirmAction={setConfirmAction}
        onPageChange={setCurrentPage}
      />

      {/* Order Detail & Confirmation Dialogs */}
      <OrderDetailDialog
        detailOrder={detailOrder}
        onClose={() => setDetailOrder(null)}
        confirmAction={confirmAction}
        onConfirmAction={setConfirmAction}
        onUpdateStatus={handleUpdateStatus}
      />
    </div>
  );
}
