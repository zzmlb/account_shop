"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Search,
  Download,
  MoreHorizontal,
  Eye,
  RotateCcw,
  XCircle,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Package,
  Loader2,
  Truck,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${d} ${h}:${min}`;
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
  const [orders, setOrders] = useState<Order[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const pageSize = 20;
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchOrders = useCallback(
    async (page: number, status: string, search: string) => {
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
    fetchOrders(currentPage, activeTab, searchQuery);
  }, [currentPage, activeTab, searchQuery, fetchOrders]);

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
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 text-[var(--muted-foreground)]"
        >
          <CalendarDays className="h-4 w-4" />
          日期范围
        </Button>
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
                        className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--muted)]/50 transition-colors"
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
                        <td className="px-4 py-3 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                disabled={actionLoading === order.id}
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
                                onClick={() => {
                                  window.open(
                                    `/order/${order.orderNo}`,
                                    "_blank"
                                  );
                                }}
                              >
                                <Eye className="h-4 w-4" />
                                查看详情
                              </DropdownMenuItem>
                              {order.status === "PAID" && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="gap-2 cursor-pointer"
                                    onClick={() =>
                                      handleUpdateStatus(order.id, "DELIVERED")
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
                                      handleUpdateStatus(order.id, "REFUNDED")
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
                                      handleUpdateStatus(order.id, "CANCELLED")
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
    </div>
  );
}
