"use client";

import Link from "next/link";
import {
  Eye,
  ExternalLink,
  RotateCcw,
  XCircle,
  Package,
  Loader2,
  Truck,
  Clock,
  MoreHorizontal,
  User,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import PaginationBar from "@/components/shared/pagination";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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

export interface OrdersTableProps {
  orders: Order[];
  loading: boolean;
  selectedOrders: Set<string>;
  allSelected: boolean;
  actionLoading: string | null;
  currentPage: number;
  totalPages: number;
  total: number;
  onToggleSelectAll: () => void;
  onToggleSelectOrder: (id: string) => void;
  onViewDetail: (order: Order) => void;
  onConfirmAction: (action: {
    orderId: string;
    orderNo: string;
    status: "DELIVERED" | "REFUNDED" | "CANCELLED";
  }) => void;
  onPageChange: (page: number) => void;
}

export function OrdersDesktopTable({
  orders,
  loading,
  selectedOrders,
  allSelected,
  actionLoading,
  currentPage,
  totalPages,
  total,
  onToggleSelectAll,
  onToggleSelectOrder,
  onViewDetail,
  onConfirmAction,
  onPageChange,
}: OrdersTableProps) {
  return (
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
                    onChange={onToggleSelectAll}
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
                      onClick={() => onViewDetail(order)}
                    >
                      <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => onToggleSelectOrder(order.id)}
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
                              onClick={() => onViewDetail(order)}
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
                                    onConfirmAction({ orderId: order.id, orderNo: order.orderNo, status: "DELIVERED" })
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
                                    onConfirmAction({ orderId: order.id, orderNo: order.orderNo, status: "REFUNDED" })
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
                                    onConfirmAction({ orderId: order.id, orderNo: order.orderNo, status: "CANCELLED" })
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
              onPageChange={onPageChange}
              showPageNumbers
              totalLabel="条订单"
              className="px-4 py-3"
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function OrdersMobileCards({
  orders,
  loading,
  selectedOrders,
  actionLoading,
  currentPage,
  totalPages,
  total,
  onToggleSelectOrder,
  onViewDetail,
  onConfirmAction,
  onPageChange,
}: Omit<OrdersTableProps, "allSelected" | "onToggleSelectAll">) {
  return (
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
                onClick={() => onViewDetail(order)}
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => onToggleSelectOrder(order.id)}
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
                            onClick={() => onViewDetail(order)}
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
                                  onConfirmAction({ orderId: order.id, orderNo: order.orderNo, status: "DELIVERED" })
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
                                  onConfirmAction({ orderId: order.id, orderNo: order.orderNo, status: "REFUNDED" })
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
                                  onConfirmAction({ orderId: order.id, orderNo: order.orderNo, status: "CANCELLED" })
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
              onPageChange={onPageChange}
              totalLabel="条订单"
            />
          )}
        </>
      )}
    </div>
  );
}
