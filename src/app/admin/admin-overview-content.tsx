"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import {
  DollarSign,
  ShoppingCart,
  UserPlus,
  AlertTriangle,
  Package,
  ArrowUpRight,
  ArrowDownRight,
  Upload,
  Bell,
  Crown,
  Loader2,
  RefreshCw,
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
import {
  Area,
  Bar,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

/* ---------- Types ---------- */

interface StatsData {
  todaySales: number;
  todayOrders: number;
  newUsers: number;
  lowStockCount: number;
  yesterdaySales: number;
  yesterdayOrders: number;
  yesterdayUsers: number;
  todayConversion: number;
  yesterdayConversion: number;
  totalProducts: number;
  totalUsers: number;
  totalRevenue: number;
}

interface OrderStatusCount {
  status: string;
  count: number;
}

interface RecentOrder {
  id: string;
  product: string;
  quantity: number;
  amount: number;
  status: string;
  createdAt: string;
}

interface HotProduct {
  rank: number;
  name: string;
  sales: number;
  views: number;
  revenue: number;
}

interface SalesChartItem {
  date: string;
  amount: number;
  orders: number;
}

interface ApiResponse {
  success: boolean;
  stats: StatsData;
  recentOrders: RecentOrder[];
  hotProducts: HotProduct[];
  salesChart: SalesChartItem[];
  chartPeriod: number;
  ordersByStatus: OrderStatusCount[];
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

/* ---------- Custom Tooltip for the Chart ---------- */

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const amountEntry = payload.find((p) => p.dataKey === "amount");
  const ordersEntry = payload.find((p) => p.dataKey === "orders");
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card)] px-3 py-2 shadow-lg">
      <p className="text-xs text-[var(--muted-foreground)]">{label}</p>
      {amountEntry && (
        <p className="text-sm font-semibold text-[var(--foreground)]">
          ¥{amountEntry.value.toLocaleString()}
        </p>
      )}
      {ordersEntry && (
        <p className="text-xs text-[var(--muted-foreground)]">
          {ordersEntry.value} 个订单
        </p>
      )}
    </div>
  );
}

/* ---------- Rank Badge ---------- */

function RankBadge({ rank }: { rank: number }) {
  const colors: Record<number, string> = {
    1: "bg-[#FFD700] text-[#1a1a2e]",
    2: "bg-[#C0C0C0] text-[#1a1a2e]",
    3: "bg-[#CD7F32] text-white",
  };

  return (
    <span
      className={cn(
        "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold",
        colors[rank] ?? "bg-[var(--secondary)] text-[var(--muted-foreground)]"
      )}
    >
      {rank}
    </span>
  );
}

/* ---------- Page Component ---------- */

export default function AdminOverviewPageContent() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [hotProducts, setHotProducts] = useState<HotProduct[]>([]);
  const [salesChart, setSalesChart] = useState<SalesChartItem[]>([]);
  const [chartPeriod, setChartPeriod] = useState(7);
  const [ordersByStatus, setOrdersByStatus] = useState<OrderStatusCount[]>([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const periodRef = useRef(chartPeriod);
  periodRef.current = chartPeriod;

  const fetchStats = useCallback(async (period: number, isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      else setChartLoading(true);
      const res = await fetch(`/api/admin/stats?period=${period}`);
      const data: ApiResponse = await res.json();
      if (data.success) {
        setStats(data.stats);
        setRecentOrders(data.recentOrders);
        setHotProducts(data.hotProducts);
        setSalesChart(data.salesChart);
        setOrdersByStatus(data.ordersByStatus || []);
        setLastRefresh(new Date());
      }
    } catch {
      // silently fail for background refresh
    } finally {
      setLoading(false);
      setChartLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats(chartPeriod, true);
    // Auto-refresh stats every 60 seconds
    const interval = setInterval(() => {
      fetchStats(periodRef.current);
    }, 60_000);
    return () => clearInterval(interval);
  }, [fetchStats]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePeriodChange = (period: number) => {
    setChartPeriod(period);
    fetchStats(period);
  };

  const handleManualRefresh = () => {
    fetchStats(chartPeriod);
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  // Compute comparison percentages
  const salesChange = stats?.yesterdaySales
    ? ((stats.todaySales - stats.yesterdaySales) / stats.yesterdaySales) * 100
    : stats?.todaySales ? 100 : 0;
  const ordersChange = stats?.yesterdayOrders
    ? ((stats.todayOrders - stats.yesterdayOrders) / stats.yesterdayOrders) * 100
    : stats?.todayOrders ? 100 : 0;
  const usersChange = stats?.yesterdayUsers
    ? ((stats.newUsers - stats.yesterdayUsers) / stats.yesterdayUsers) * 100
    : stats?.newUsers ? 100 : 0;

  const statsCards = [
    {
      label: "今日销售额",
      value: `¥${(stats?.todaySales ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: DollarSign,
      color: "var(--primary)",
      change: salesChange,
      sub: `昨日 ¥${(stats?.yesterdaySales ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    },
    {
      label: "今日订单数",
      value: String(stats?.todayOrders ?? 0),
      icon: ShoppingCart,
      color: "var(--accent)",
      change: ordersChange,
      sub: `转化率 ${stats?.todayConversion ?? 0}%`,
    },
    {
      label: "新用户数",
      value: String(stats?.newUsers ?? 0),
      icon: UserPlus,
      color: "var(--success)",
      change: usersChange,
      sub: `总用户 ${stats?.totalUsers ?? 0}`,
    },
    {
      label: "库存告警",
      value: String(stats?.lowStockCount ?? 0),
      icon: AlertTriangle,
      color: "var(--warning)",
      change: null,
      sub: `在售商品 ${stats?.totalProducts ?? 0}`,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">
            管理概览
          </h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            欢迎回来，以下是今日平台运营数据概览
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastRefresh && (
            <span className="hidden text-xs text-[var(--muted-foreground)] sm:inline">
              {lastRefresh.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })} 更新
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualRefresh}
            disabled={chartLoading}
            className="gap-1.5"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", chartLoading && "animate-spin")} />
            刷新
          </Button>
        </div>
      </div>

      {/* ========== Stats Cards ========== */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statsCards.map((stat) => {
          const Icon = stat.icon;
          const isUp = stat.change !== null && stat.change >= 0;
          const TrendIcon = isUp ? ArrowUpRight : ArrowDownRight;
          return (
            <Card key={stat.label} className="overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex flex-col gap-1">
                    <span className="text-sm text-[var(--muted-foreground)]">
                      {stat.label}
                    </span>
                    <span className="text-2xl font-bold text-[var(--foreground)]">
                      {stat.value}
                    </span>
                    <div className="flex items-center gap-2">
                      {stat.change !== null && (
                        <span
                          className={cn(
                            "flex items-center text-xs font-medium",
                            isUp ? "text-[var(--success)]" : "text-[var(--destructive)]"
                          )}
                        >
                          <TrendIcon className="h-3 w-3 mr-0.5" />
                          {Math.abs(stat.change).toFixed(1)}%
                        </span>
                      )}
                      <span className="text-[10px] text-[var(--muted-foreground)]">
                        {stat.sub}
                      </span>
                    </div>
                  </div>
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-lg)]"
                    style={{ backgroundColor: `color-mix(in srgb, ${stat.color} 15%, transparent)` }}
                  >
                    <Icon
                      className="h-5 w-5"
                      style={{ color: stat.color }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ========== Chart + Hot Products Row ========== */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Sales Trend Chart */}
        <Card className="xl:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold">
              销售趋势
            </CardTitle>
            <div className="flex items-center gap-1">
              {[7, 14, 30].map((p) => (
                <button
                  key={p}
                  onClick={() => handlePeriodChange(p)}
                  disabled={chartLoading}
                  className={cn(
                    "rounded-[var(--radius-sm)] px-2.5 py-1 text-xs font-medium transition-colors",
                    chartPeriod === p
                      ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                      : "text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
                  )}
                >
                  {p}天
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={salesChart}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6c5ce7" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#6c5ce7" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--border)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                  />
                  <YAxis
                    yAxisId="amount"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                    tickFormatter={(v: number) => `¥${v}`}
                  />
                  <YAxis
                    yAxisId="orders"
                    orientation="right"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar
                    yAxisId="orders"
                    dataKey="orders"
                    fill="var(--accent)"
                    opacity={0.3}
                    radius={[4, 4, 0, 0]}
                    barSize={20}
                  />
                  <Area
                    yAxisId="amount"
                    type="monotone"
                    dataKey="amount"
                    stroke="#6c5ce7"
                    strokeWidth={2}
                    fill="url(#salesGradient)"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Hot Products Ranking */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Crown className="h-4 w-4 text-[var(--warning)]" />
              热门商品
            </CardTitle>
            <span className="text-xs text-[var(--muted-foreground)]">
              按销量排序
            </span>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {hotProducts.length === 0 ? (
                <p className="text-sm text-[var(--muted-foreground)] text-center py-4">
                  暂无数据
                </p>
              ) : (
                hotProducts.map((product) => (
                  <div
                    key={product.rank}
                    className="flex items-center gap-3"
                  >
                    <RankBadge rank={product.rank} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--foreground)] truncate">
                        {product.name}
                      </p>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        销量 {product.sales} 件 &middot; 浏览 {product.views} 次
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-[var(--foreground)] whitespace-nowrap">
                      ¥{product.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

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
                  const total = ordersByStatus.reduce((sum, o) => sum + o.count, 0);
                  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
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
                  <p className="text-lg font-bold">{ordersByStatus.reduce((sum, o) => sum + o.count, 0)}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">总订单数</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========== Recent Orders + Quick Actions Row ========== */}
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
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="pb-3 text-left font-medium text-[var(--muted-foreground)]">
                      订单号
                    </th>
                    <th className="pb-3 text-left font-medium text-[var(--muted-foreground)]">
                      商品
                    </th>
                    <th className="pb-3 text-right font-medium text-[var(--muted-foreground)]">
                      金额
                    </th>
                    <th className="pb-3 text-center font-medium text-[var(--muted-foreground)]">
                      状态
                    </th>
                    <th className="pb-3 text-right font-medium text-[var(--muted-foreground)]">
                      时间
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-8 text-center text-sm text-[var(--muted-foreground)]"
                      >
                        暂无订单数据
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
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
