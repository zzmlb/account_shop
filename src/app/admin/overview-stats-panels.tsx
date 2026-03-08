"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/* ---------- Types ---------- */

interface OrderStatusCount {
  status: string;
  count: number;
}

interface StatsData {
  totalRevenue: number;
  totalUsers: number;
  totalProducts: number;
}

interface MonthlyComparison {
  thisMonthRevenue: number;
  lastMonthRevenue: number;
  thisMonthOrders: number;
  lastMonthOrders: number;
}

interface PaymentMethodStat {
  method: string;
  revenue: number;
  count: number;
}

interface LowStockProduct {
  id: string;
  name: string;
  slug: string;
  stockCount: number;
  soldCount: number;
  price: number;
}

interface RecentLogin {
  id: string;
  username: string;
  success: boolean;
  ip: string | null;
  createdAt: string;
}

/* ---------- Props ---------- */

export interface OverviewStatsPanelsProps {
  ordersByStatus: OrderStatusCount[];
  orderStatusTotal: number;
  stats: StatsData | null;
  monthlyComparison?: MonthlyComparison;
  revenueByMethod: PaymentMethodStat[];
  lowStockProducts: LowStockProduct[];
  recentLogins: RecentLogin[];
}

/* ---------- Component ---------- */

export function OverviewStatsPanels({
  ordersByStatus,
  orderStatusTotal,
  stats,
  monthlyComparison,
  revenueByMethod,
  lowStockProducts,
  recentLogins,
}: OverviewStatsPanelsProps) {
  return (
    <>
      {/* ========== Order Status Distribution + Total Revenue ========== */}
      {ordersByStatus.length > 0 && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">
                订单状态分布
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {[
                  { key: "PENDING", label: "待支付", color: "var(--muted-foreground)" },
                  { key: "PAID", label: "已支付", color: "var(--primary)" },
                  { key: "DELIVERED", label: "已完成", color: "var(--success)" },
                  { key: "CANCELLED", label: "已取消", color: "var(--muted-foreground)" },
                  { key: "REFUNDED", label: "已退款", color: "var(--destructive)" },
                  { key: "EXPIRED", label: "已过期", color: "var(--muted-foreground)" },
                ].map((s) => {
                  const item = ordersByStatus.find((o) => o.status === s.key);
                  const count = item?.count ?? 0;
                  const pct = orderStatusTotal > 0 ? Math.round((count / orderStatusTotal) * 100) : 0;
                  return (
                    <div
                      key={s.key}
                      className="rounded-[var(--radius-md)] border border-[var(--border)] p-3 text-center"
                    >
                      <p className="text-2xl font-bold" style={{ color: s.color }}>
                        {count}
                      </p>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {s.label}
                      </p>
                      <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-[var(--muted)]">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, backgroundColor: s.color }}
                        />
                      </div>
                      <p className="mt-0.5 text-[10px] text-[var(--muted-foreground)]">
                        {pct}%
                      </p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">
                累计数据
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-gradient-to-br from-[var(--primary)]/5 to-transparent p-4">
                  <p className="text-xs text-[var(--muted-foreground)]">总营收</p>
                  <p className="text-2xl font-bold text-[var(--primary)]">
                    ¥{(stats?.totalRevenue ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-[var(--radius-md)] border border-[var(--border)] p-3 text-center">
                    <p className="text-lg font-bold">{stats?.totalUsers ?? 0}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">总用户</p>
                  </div>
                  <div className="rounded-[var(--radius-md)] border border-[var(--border)] p-3 text-center">
                    <p className="text-lg font-bold">{stats?.totalProducts ?? 0}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">在售商品</p>
                  </div>
                </div>
                <div className="rounded-[var(--radius-md)] border border-[var(--border)] p-3 text-center">
                  <p className="text-lg font-bold">{orderStatusTotal}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">总订单数</p>
                </div>
              </div>
              {/* Monthly comparison */}
              {monthlyComparison && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs font-medium text-[var(--muted-foreground)]">本月 vs 上月</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-[var(--radius-md)] border border-[var(--border)] p-2.5">
                      <p className="text-[10px] text-[var(--muted-foreground)]">本月营收</p>
                      <p className="text-sm font-bold">¥{monthlyComparison.thisMonthRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                      {monthlyComparison.lastMonthRevenue > 0 && (() => {
                        const pct = Math.round(((monthlyComparison.thisMonthRevenue - monthlyComparison.lastMonthRevenue) / monthlyComparison.lastMonthRevenue) * 100);
                        return (
                          <span className={cn("text-[10px]", pct >= 0 ? "text-[var(--success)]" : "text-[var(--destructive)]")}>
                            {pct >= 0 ? "+" : ""}{pct}%
                          </span>
                        );
                      })()}
                    </div>
                    <div className="rounded-[var(--radius-md)] border border-[var(--border)] p-2.5">
                      <p className="text-[10px] text-[var(--muted-foreground)]">本月订单</p>
                      <p className="text-sm font-bold">{monthlyComparison.thisMonthOrders}</p>
                      {monthlyComparison.lastMonthOrders > 0 && (() => {
                        const pct = Math.round(((monthlyComparison.thisMonthOrders - monthlyComparison.lastMonthOrders) / monthlyComparison.lastMonthOrders) * 100);
                        return (
                          <span className={cn("text-[10px]", pct >= 0 ? "text-[var(--success)]" : "text-[var(--destructive)]")}>
                            {pct >= 0 ? "+" : ""}{pct}%
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========== Revenue by Payment Method ========== */}
      {revenueByMethod.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">支付方式分布</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(() => {
                const methodLabels: Record<string, string> = {
                  balance: "余额支付",
                  alipay: "支付宝",
                  wechat: "微信支付",
                  usdt: "USDT",
                };
                const totalRevenue = revenueByMethod.reduce((s, m) => s + m.revenue, 0);
                return revenueByMethod.map((m) => {
                  const pct = totalRevenue > 0 ? Math.round((m.revenue / totalRevenue) * 100) : 0;
                  return (
                    <div
                      key={m.method}
                      className="rounded-[var(--radius-md)] border border-[var(--border)] p-3"
                    >
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {methodLabels[m.method] || m.method}
                      </p>
                      <p className="mt-1 text-lg font-bold">¥{m.revenue.toFixed(2)}</p>
                      <div className="mt-1 flex items-center justify-between text-xs text-[var(--muted-foreground)]">
                        <span>{m.count} 笔</span>
                        <span>{pct}%</span>
                      </div>
                      <div className="mt-1 h-1 w-full rounded-full bg-[var(--muted)]">
                        <div
                          className="h-1 rounded-full bg-[var(--primary)]"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ========== Low Stock Alert ========== */}
      {lowStockProducts.length > 0 && (
        <Card className="border-[var(--warning)]/30">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <AlertTriangle className="h-4 w-4 text-[var(--warning)]" />
              库存告警
              <Badge variant="outline" className="border-[var(--warning)] text-[var(--warning)]">
                {lowStockProducts.length} 件
              </Badge>
            </CardTitle>
            <Link
              href="/admin/products"
              className="flex items-center gap-1 text-xs text-[var(--primary)] hover:underline"
            >
              管理商品
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {lowStockProducts.map((product) => (
                <Link
                  key={product.id}
                  href={`/admin/products`}
                  className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border)] p-3 transition-colors hover:bg-[var(--muted)]/50"
                >
                  <div className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-sm font-bold",
                    product.stockCount === 0
                      ? "bg-[var(--destructive)]/10 text-[var(--destructive)]"
                      : product.stockCount <= 3
                        ? "bg-[var(--warning)]/10 text-[var(--warning)]"
                        : "bg-[var(--muted)] text-[var(--muted-foreground)]"
                  )}>
                    {product.stockCount}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[var(--foreground)]">
                      {product.name}
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {product.stockCount === 0 ? "已售罄" : `剩余 ${product.stockCount} 件`}
                      {" · "}已售 {product.soldCount}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Login Activity */}
      {recentLogins.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Shield className="h-4 w-4 text-[var(--primary)]" />
              最近登录活动
            </CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/login-logs">查看全部</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--muted-foreground)]">
                    <th className="pb-2 font-medium">用户</th>
                    <th className="pb-2 font-medium">状态</th>
                    <th className="pb-2 font-medium">IP</th>
                    <th className="pb-2 font-medium text-right">时间</th>
                  </tr>
                </thead>
                <tbody>
                  {recentLogins.slice(0, 8).map((login) => (
                    <tr
                      key={login.id}
                      className="border-b border-[var(--border)] last:border-0"
                    >
                      <td className="py-2 font-medium">{login.username}</td>
                      <td className="py-2">
                        <Badge variant={login.success ? "success" : "destructive"}>
                          {login.success ? "成功" : "失败"}
                        </Badge>
                      </td>
                      <td className="py-2 font-mono text-xs text-[var(--muted-foreground)]">
                        {login.ip || "-"}
                      </td>
                      <td className="py-2 text-right text-xs text-[var(--muted-foreground)]">
                        {new Date(login.createdAt).toLocaleString("zh-CN", {
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
