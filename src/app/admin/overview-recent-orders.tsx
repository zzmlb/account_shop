"use client";

import Link from "next/link";
import {
  ShoppingCart,
  Package,
  Upload,
  Bell,
  RotateCcw,
  ArrowUpRight,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/* ---------- Types ---------- */

interface RecentOrder {
  id: string;
  product: string;
  quantity: number;
  amount: number;
  status: string;
  createdAt: string;
}

interface QuickActionsStats {
  lowStockCount: number;
  totalProducts: number;
  pendingRefunds: number;
  pendingMessages: number;
}

/* ---------- Status Mapping ---------- */

const orderStatusMap: Record<string, { label: string; variant: "success" | "secondary" | "default" | "destructive" | "outline" }> = {
  PENDING: { label: "待支付", variant: "secondary" },
  PAID: { label: "已支付", variant: "default" },
  DELIVERED: { label: "已完成", variant: "success" },
  CANCELLED: { label: "已取消", variant: "outline" },
  REFUNDED: { label: "已退款", variant: "destructive" },
  EXPIRED: { label: "已过期", variant: "outline" },
};

/* ---------- Props ---------- */

export interface OverviewRecentOrdersProps {
  recentOrders: RecentOrder[];
  stats: QuickActionsStats | null;
}

/* ---------- Component ---------- */

export function OverviewRecentOrders({
  recentOrders,
  stats,
}: OverviewRecentOrdersProps) {
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      {/* Recent Orders */}
      <Card className="xl:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-semibold">
            最近订单
          </CardTitle>
          <Link
            href="/admin/orders"
            className="flex items-center gap-1 text-xs text-[var(--primary)] hover:underline"
          >
            查看全部
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        </CardHeader>
        <CardContent>
          {/* Table wrapper for horizontal scroll on mobile */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm" aria-label="最近订单">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th scope="col" className="pb-3 text-left font-medium text-[var(--muted-foreground)]">
                    订单号
                  </th>
                  <th scope="col" className="pb-3 text-left font-medium text-[var(--muted-foreground)]">
                    商品
                  </th>
                  <th scope="col" className="pb-3 text-right font-medium text-[var(--muted-foreground)]">
                    金额
                  </th>
                  <th scope="col" className="pb-3 text-center font-medium text-[var(--muted-foreground)]">
                    状态
                  </th>
                  <th scope="col" className="pb-3 text-right font-medium text-[var(--muted-foreground)]">
                    时间
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-8 text-center"
                    >
                      <div className="flex flex-col items-center text-[var(--muted-foreground)]">
                        <ShoppingCart className="mb-2 h-8 w-8 opacity-20" />
                        <p className="text-sm">暂无订单数据</p>
                        <Link href="/admin/orders" className="mt-1 text-xs text-[var(--primary)] hover:underline">
                          查看全部订单
                        </Link>
                      </div>
                    </td>
                  </tr>
                ) : (
                  recentOrders.map((order) => {
                    const statusInfo = orderStatusMap[order.status] ?? {
                      label: order.status,
                      variant: "secondary" as const,
                    };
                    const orderDate = new Date(order.createdAt);
                    const formattedDate = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, "0")}-${String(orderDate.getDate()).padStart(2, "0")} ${String(orderDate.getHours()).padStart(2, "0")}:${String(orderDate.getMinutes()).padStart(2, "0")}`;
                    return (
                      <tr
                        key={order.id}
                        className="border-b border-[var(--border)] last:border-0"
                      >
                        <td className="py-3 pr-4">
                          <span className="font-mono text-xs text-[var(--foreground)]">
                            {order.id}
                          </span>
                        </td>
                        <td className="py-3 pr-4">
                          <span className="text-[var(--foreground)]">
                            {order.product}
                          </span>
                        </td>
                        <td className="py-3 text-right pr-4">
                          <span className="font-semibold text-[var(--foreground)]">
                            ¥{order.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td className="py-3 text-center">
                          <Badge variant={statusInfo.variant}>
                            {statusInfo.label}
                          </Badge>
                        </td>
                        <td className="py-3 text-right">
                          <span className="text-xs text-[var(--muted-foreground)] whitespace-nowrap">
                            {formattedDate}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">
            快捷操作
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Button
              asChild
              className="w-full justify-start gap-3"
              variant="outline"
              size="lg"
            >
              <Link href="/admin/products">
                <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] bg-[var(--primary)]/10">
                  <Package className="h-4 w-4 text-[var(--primary)]" />
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-sm font-medium">添加商品</span>
                  <span className="text-[10px] text-[var(--muted-foreground)]">
                    创建新的数字商品
                  </span>
                </div>
              </Link>
            </Button>

            <Button
              asChild
              className="w-full justify-start gap-3"
              variant="outline"
              size="lg"
            >
              <Link href="/admin/card-keys">
                <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] bg-[var(--accent)]/10">
                  <Upload className="h-4 w-4 text-[var(--accent)]" />
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-sm font-medium">导入卡密</span>
                  <span className="text-[10px] text-[var(--muted-foreground)]">
                    批量导入商品卡密
                  </span>
                </div>
              </Link>
            </Button>

            <Button
              asChild
              className="w-full justify-start gap-3"
              variant="outline"
              size="lg"
            >
              <Link href="/admin/products">
                <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] bg-[var(--warning)]/10">
                  <Bell className="h-4 w-4 text-[var(--warning)]" />
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-sm font-medium">查看告警</span>
                  <span className="text-[10px] text-[var(--muted-foreground)]">
                    {stats?.lowStockCount ?? 0} 个商品库存不足
                  </span>
                </div>
              </Link>
            </Button>
            {(stats?.pendingRefunds ?? 0) > 0 && (
              <Button
                asChild
                className="w-full justify-start gap-3"
                variant="outline"
                size="lg"
              >
                <Link href="/admin/refunds">
                  <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] bg-[var(--destructive)]/10">
                    <RotateCcw className="h-4 w-4 text-[var(--destructive)]" />
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="text-sm font-medium">待处理退款</span>
                    <span className="text-[10px] text-[var(--muted-foreground)]">
                      {stats?.pendingRefunds} 件退款申请等待审核
                    </span>
                  </div>
                </Link>
              </Button>
            )}
            {(stats?.pendingMessages ?? 0) > 0 && (
              <Button
                asChild
                className="w-full justify-start gap-3"
                variant="outline"
                size="lg"
              >
                <Link href="/admin/messages">
                  <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] bg-[var(--accent)]/10">
                    <Bell className="h-4 w-4 text-[var(--accent)]" />
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="text-sm font-medium">待回复留言</span>
                    <span className="text-[10px] text-[var(--muted-foreground)]">
                      {stats?.pendingMessages} 条留言等待回复
                    </span>
                  </div>
                </Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
