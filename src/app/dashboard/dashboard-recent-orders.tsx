"use client";

import Link from "next/link";
import { ShoppingBag, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface OrderItem {
  productName: string;
  quantity: number;
}

interface RecentOrder {
  id: string;
  orderNo: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  items: OrderItem[];
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: "待支付",
  PAID: "已支付",
  DELIVERED: "已完成",
  CANCELLED: "已取消",
  REFUNDED: "已退款",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline" | "success"> = {
  PENDING: "default",
  PAID: "outline",
  DELIVERED: "success",
  CANCELLED: "secondary",
  REFUNDED: "secondary",
};

function formatCurrency(value: number | string): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return `¥${num.toFixed(2)}`;
}

function buildProductSummary(items: OrderItem[]): string {
  if (items.length === 0) return "未知商品";
  const first = items[0];
  const label = `${first.productName}${first.quantity > 1 ? ` x${first.quantity}` : ""}`;
  if (items.length > 1) return `${label} 等${items.length}件`;
  return label;
}

interface DashboardRecentOrdersProps {
  orders: RecentOrder[];
}

export function DashboardRecentOrders({ orders }: DashboardRecentOrdersProps) {
  return (
    <Card className="lg:col-span-2">
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-lg">最近订单</CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/orders" className="gap-1">
            查看全部
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-[var(--muted-foreground)]">
              <ShoppingBag className="mb-3 h-10 w-10 opacity-40" />
              <p className="text-sm">暂无订单</p>
              <Button variant="ghost" size="sm" asChild className="mt-2">
                <Link href="/">去逛逛</Link>
              </Button>
            </div>
          ) : (
            orders.map((order) => (
              <Link
                key={order.id}
                href={`/order/${order.orderNo}`}
                className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--border)] p-4 transition-colors hover:bg-[var(--card-hover)]"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--primary)]/10">
                    <ShoppingBag className="h-4 w-4 text-[var(--primary)]" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {buildProductSummary(order.items)}
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {order.orderNo} &middot; {order.createdAt.slice(0, 10)}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-sm font-semibold">
                    {formatCurrency(order.totalAmount)}
                  </span>
                  <Badge variant={STATUS_VARIANT[order.status] ?? "default"}>
                    {STATUS_LABEL[order.status] ?? order.status}
                  </Badge>
                </div>
              </Link>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
