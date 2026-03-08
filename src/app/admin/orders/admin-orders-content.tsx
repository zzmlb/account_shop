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
  ChevronLeft,
  ChevronRight,
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
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 1,
  });
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
    async (page: number, status: string, search: string, from?: string, to?: string) => {
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

        const res = await fetch(`/api/admin/orders?${params.toString()}`);
        const data = await res.json();

        if (!res.ok || !data.success) {
          toast.error(data.message || "获取订单列表失败");
          return;
        }

        setOrders(data.orders);
        setPagination(data.pagination);
      } catch {
        toast.error("网络错误，无法获取订单列表");
      } finally {
        setLoading(false);
      }
    },
    [pageSize]
  );

  useEffect(() => {
    fetchOrders(currentPage, activeTab, searchQuery, dateFrom, dateTo);
  }, [currentPage, activeTab, searchQuery, dateFrom, dateTo, fetchOrders]);

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
      fetchOrders(currentPage, activeTab, searchQuery);
    } catch {
      toast.error(`网络错误，${actionLabel}操作失败`);
    } finally {
      setActionLoading(null);
    }
  };

  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [exporting, setExporting] = useState(false);

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
      </div>

      {/* Orders Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)]">
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
                  <tr>
                    <td colSpan={8} className="text-center py-12">
                      <Loader2 className="h-8 w-8 mx-auto text-[var(--muted-foreground)] mb-3 animate-spin" />
                      <p className="text-sm text-[var(--muted-foreground)]">
                        加载中...
                      </p>
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12">
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

                    return (
                      <tr
                        key={order.id}
                        className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--muted)]/50 transition-colors cursor-pointer"
                        onClick={() => setDetailOrder(order)}
                      >
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
              <div className="flex items-center justify-between px-4 py-3">
                <p className="text-sm text-[var(--muted-foreground)]">
                  共 {total} 条订单，第 {currentPage}/{totalPages} 页
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="gap-1"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    上一页
                  </Button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((page) => {
                      // Show first, last, and pages around current
                      if (page === 1 || page === totalPages) return true;
                      if (Math.abs(page - currentPage) <= 1) return true;
                      return false;
                    })
                    .reduce<(number | "ellipsis")[]>((acc, page, idx, arr) => {
                      if (idx > 0) {
                        const prev = arr[idx - 1];
                        if (page - prev > 1) {
                          acc.push("ellipsis");
                        }
                      }
                      acc.push(page);
                      return acc;
                    }, [])
                    .map((item, idx) =>
                      item === "ellipsis" ? (
                        <span
                          key={`ellipsis-${idx}`}
                          className="px-1 text-sm text-[var(--muted-foreground)]"
                        >
                          ...
                        </span>
                      ) : (
                        <Button
                          key={item}
                          variant={item === currentPage ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(item)}
                          className="w-8 h-8 p-0"
                        >
                          {item}
                        </Button>
                      )
                    )}
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage >= totalPages}
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    className="gap-1"
                  >
                    下一页
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
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
