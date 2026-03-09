"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import {
  DollarSign,
  ShoppingCart,
  UserPlus,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Send,
  Download,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { apiFetch, apiMutate } from "@/lib/api-fetch";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import dynamic from "next/dynamic";

const OverviewSalesCharts = dynamic(
  () => import("./overview-sales-charts").then((mod) => mod.OverviewSalesCharts),
  {
    ssr: false,
    loading: () => (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="h-[350px] animate-pulse rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--muted)]" />
        ))}
      </div>
    ),
  }
);
import { OverviewRecentOrders } from "./overview-recent-orders";
import { OverviewStatsPanels } from "./overview-stats-panels";

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
  pendingRefunds: number;
  pendingMessages: number;
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

interface RecentLogin {
  id: string;
  username: string;
  success: boolean;
  ip: string | null;
  createdAt: string;
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

interface UserGrowthItem {
  date: string;
  users: number;
}

interface ApiResponse {
  success: boolean;
  stats: StatsData;
  recentOrders: RecentOrder[];
  hotProducts: HotProduct[];
  salesChart: SalesChartItem[];
  userGrowthChart?: UserGrowthItem[];
  chartPeriod: number;
  ordersByStatus: OrderStatusCount[];
  revenueByMethod?: PaymentMethodStat[];
  monthlyComparison?: {
    thisMonthRevenue: number;
    lastMonthRevenue: number;
    thisMonthOrders: number;
    lastMonthOrders: number;
  };
  recentLogins?: RecentLogin[];
  lowStockProducts?: LowStockProduct[];
}

/* ---------- Page Component ---------- */

export default function AdminOverviewPageContent() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [hotProducts, setHotProducts] = useState<HotProduct[]>([]);
  const [salesChart, setSalesChart] = useState<SalesChartItem[]>([]);
  const [userGrowthChart, setUserGrowthChart] = useState<UserGrowthItem[]>([]);
  const [chartPeriod, setChartPeriod] = useState(7);
  const [ordersByStatus, setOrdersByStatus] = useState<OrderStatusCount[]>([]);
  const [recentLogins, setRecentLogins] = useState<RecentLogin[]>([]);
  const [revenueByMethod, setRevenueByMethod] = useState<PaymentMethodStat[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<LowStockProduct[]>([]);
  const [monthlyComparison, setMonthlyComparison] = useState<ApiResponse["monthlyComparison"]>(undefined);
  const [chartLoading, setChartLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastContent, setBroadcastContent] = useState("");
  const [broadcastSending, setBroadcastSending] = useState(false);

  const periodRef = useRef(chartPeriod);
  periodRef.current = chartPeriod;

  const fetchStats = useCallback(async (period: number, isInitial = false, isManual = false) => {
    try {
      if (isInitial) setLoading(true);
      else setChartLoading(true);
      const data = await apiFetch<ApiResponse>(`/api/admin/stats?period=${period}`);
      setStats(data.stats);
      setRecentOrders(data.recentOrders);
      setHotProducts(data.hotProducts);
      setSalesChart(data.salesChart);
      if (data.userGrowthChart) setUserGrowthChart(data.userGrowthChart);
      setOrdersByStatus(data.ordersByStatus || []);
      setRecentLogins(data.recentLogins || []);
      setRevenueByMethod(data.revenueByMethod || []);
      setLowStockProducts(data.lowStockProducts || []);
      setMonthlyComparison(data.monthlyComparison);
      setLastRefresh(new Date());
      if (isManual) toast.success("数据已刷新");
    } catch {
      if (isManual || isInitial) {
        toast.error("网络错误，获取统计数据失败");
      }
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
    // Refresh when tab becomes visible after being hidden
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchStats(periodRef.current);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [fetchStats]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePeriodChange = (period: number) => {
    setChartPeriod(period);
    fetchStats(period);
  };

  const orderStatusTotal = useMemo(
    () => ordersByStatus.reduce((sum, o) => sum + o.count, 0),
    [ordersByStatus]
  );

  const handleManualRefresh = () => {
    fetchStats(chartPeriod, false, true);
  };

  const handleSendBroadcast = async () => {
    if (!broadcastTitle.trim() || !broadcastContent.trim()) {
      toast.error("请填写标题和内容");
      return;
    }
    setBroadcastSending(true);
    try {
      const data = await apiMutate<{ message?: string }>("/api/admin/notifications", "POST", {
        title: broadcastTitle.trim(),
        content: broadcastContent.trim(),
      });
      toast.success(data.message || "发送成功");
      setShowBroadcast(false);
      setBroadcastTitle("");
      setBroadcastContent("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "网络错误，发送失败");
    } finally {
      setBroadcastSending(false);
    }
  };

  const handleExportReport = () => {
    if (!stats) return;
    const today = new Date().toISOString().split("T")[0];
    const lines = [
      `PJ37 运营报告 - ${today}`,
      "",
      "## 今日数据",
      `今日销售额,¥${stats.todaySales.toLocaleString()}`,
      `今日订单数,${stats.todayOrders}`,
      `新增用户,${stats.newUsers}`,
      `库存告警,${stats.lowStockCount}`,
      "",
      "## 累计数据",
      `总商品数,${stats.totalProducts}`,
      `总用户数,${stats.totalUsers}`,
      `总收入,¥${stats.totalRevenue.toLocaleString()}`,
      `待处理退款,${stats.pendingRefunds}`,
      "",
      "## 销售趋势",
      "日期,金额,订单数",
      ...salesChart.map((d) => `${d.date},¥${d.amount},${d.orders}`),
      "",
      "## 热销商品",
      "排名,商品名,销量,浏览量,收入",
      ...hotProducts.map((p) => `${p.rank},${p.name},${p.sales},${p.views},¥${p.revenue}`),
    ];
    if (revenueByMethod.length > 0) {
      lines.push("", "## 支付方式分布", "方式,收入,订单数");
      revenueByMethod.forEach((m) => lines.push(`${m.method},¥${m.revenue},${m.count}`));
    }
    const bom = "\uFEFF";
    const blob = new Blob([bom + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pj37_report_${today}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("报告已导出");
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="加载中">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div>
            <div className="h-7 w-32 rounded bg-[var(--muted)]" />
            <div className="mt-2 h-3 w-56 rounded bg-[var(--muted)]" />
          </div>
          <div className="h-9 w-24 rounded-[var(--radius-md)] bg-[var(--muted)]" />
        </div>
        {/* Stats cards skeleton */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-5">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-3 w-16 rounded bg-[var(--muted)]" />
                  <div className="h-6 w-20 rounded bg-[var(--muted)]" />
                </div>
                <div className="h-10 w-10 rounded-[var(--radius-md)] bg-[var(--muted)]" />
              </div>
              <div className="mt-3 h-3 w-24 rounded bg-[var(--muted)]" />
            </div>
          ))}
        </div>
        {/* Chart + table skeleton */}
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-6">
            <div className="h-4 w-28 rounded bg-[var(--muted)]" />
            <div className="mt-4 h-56 rounded bg-[var(--muted)]" />
          </div>
          <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-6">
            <div className="h-4 w-28 rounded bg-[var(--muted)]" />
            <div className="mt-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-[var(--muted)]" />
                  <div className="flex-1 space-y-1">
                    <div className="h-3 w-2/3 rounded bg-[var(--muted)]" />
                    <div className="h-2 w-1/3 rounded bg-[var(--muted)]" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
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
      sub: stats?.pendingRefunds
        ? `待处理退款 ${stats.pendingRefunds} 件`
        : `在售商品 ${stats?.totalProducts ?? 0}`,
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
        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowBroadcast(true)}
            className="gap-1.5"
          >
            <Send className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">发送通知</span>
          </Button>
          {lastRefresh && (
            <span className="hidden text-xs text-[var(--muted-foreground)] sm:inline">
              {lastRefresh.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })} 更新
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportReport}
            disabled={!stats}
            className="gap-1.5"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">导出报告</span>
          </Button>
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
      <OverviewSalesCharts
        salesChart={salesChart}
        userGrowthChart={userGrowthChart}
        hotProducts={hotProducts}
        chartPeriod={chartPeriod}
        chartLoading={chartLoading}
        onPeriodChange={handlePeriodChange}
      />

      {/* ========== Order Status Distribution + Cumulative + Payment + Low Stock + Logins ========== */}
      <OverviewStatsPanels
        ordersByStatus={ordersByStatus}
        orderStatusTotal={orderStatusTotal}
        stats={stats ? { totalRevenue: stats.totalRevenue, totalUsers: stats.totalUsers, totalProducts: stats.totalProducts } : null}
        monthlyComparison={monthlyComparison}
        revenueByMethod={revenueByMethod}
        lowStockProducts={lowStockProducts}
        recentLogins={recentLogins}
      />

      {/* ========== Recent Orders + Quick Actions Row ========== */}
      <OverviewRecentOrders
        recentOrders={recentOrders}
        stats={stats ? { lowStockCount: stats.lowStockCount, totalProducts: stats.totalProducts, pendingRefunds: stats.pendingRefunds, pendingMessages: stats.pendingMessages } : null}
      />

      {/* Broadcast Notification Dialog */}
      <Dialog open={showBroadcast} onOpenChange={setShowBroadcast}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>发送系统通知</DialogTitle>
            <DialogDescription>
              向所有活跃用户发送系统通知
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">通知标题</label>
              <Input
                placeholder="例如: 系统维护通知"
                value={broadcastTitle}
                onChange={(e) => setBroadcastTitle(e.target.value)}
                maxLength={200}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">通知内容</label>
              <textarea
                placeholder="输入通知内容..."
                value={broadcastContent}
                onChange={(e) => setBroadcastContent(e.target.value)}
                maxLength={2000}
                rows={4}
                className="w-full rounded-[var(--radius-md)] border border-[var(--input)] bg-transparent px-3 py-2 text-sm placeholder:text-[var(--muted-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
              />
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                {broadcastContent.length}/2000
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBroadcast(false)}>
              取消
            </Button>
            <Button
              onClick={handleSendBroadcast}
              disabled={broadcastSending || !broadcastTitle.trim() || !broadcastContent.trim()}
              className="gap-1.5"
            >
              {broadcastSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              发送给所有用户
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
