"use client";

import Link from "next/link";
import {
  DollarSign,
  ShoppingCart,
  UserPlus,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Package,
  ArrowUpRight,
  Upload,
  Bell,
  Crown,
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
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

/* ---------- Mock Data ---------- */

const statsCards = [
  {
    label: "今日销售额",
    value: "¥1,234.56",
    change: "+12.5%",
    trend: "up" as const,
    icon: DollarSign,
    color: "var(--primary)",
  },
  {
    label: "今日订单数",
    value: "28",
    change: "+8.2%",
    trend: "up" as const,
    icon: ShoppingCart,
    color: "var(--accent)",
  },
  {
    label: "新用户数",
    value: "12",
    change: "+23.1%",
    trend: "up" as const,
    icon: UserPlus,
    color: "var(--success)",
  },
  {
    label: "库存告警",
    value: "3",
    change: "-2",
    trend: "down" as const,
    icon: AlertTriangle,
    color: "var(--warning)",
  },
];

const salesChartData = [
  { date: "03/02", amount: 980 },
  { date: "03/03", amount: 1450 },
  { date: "03/04", amount: 1120 },
  { date: "03/05", amount: 1680 },
  { date: "03/06", amount: 1320 },
  { date: "03/07", amount: 1890 },
  { date: "03/08", amount: 1234 },
];

const recentOrders = [
  {
    id: "ORD-20260308-A1B2",
    product: "ChatGPT Plus 账号",
    amount: "¥199.00",
    status: "已完成",
    statusVariant: "success" as const,
    date: "2026-03-08 14:32",
  },
  {
    id: "ORD-20260308-C3D4",
    product: "Netflix 高级会员",
    amount: "¥89.00",
    status: "待支付",
    statusVariant: "secondary" as const,
    date: "2026-03-08 13:15",
  },
  {
    id: "ORD-20260308-E5F6",
    product: "Spotify Premium 年卡",
    amount: "¥128.00",
    status: "已完成",
    statusVariant: "success" as const,
    date: "2026-03-08 12:48",
  },
  {
    id: "ORD-20260308-G7H8",
    product: "Adobe Creative Cloud",
    amount: "¥399.00",
    status: "处理中",
    statusVariant: "default" as const,
    date: "2026-03-08 11:20",
  },
  {
    id: "ORD-20260307-I9J0",
    product: "Windows 11 Pro 密钥",
    amount: "¥258.00",
    status: "已退款",
    statusVariant: "destructive" as const,
    date: "2026-03-07 22:05",
  },
];

const hotProducts = [
  {
    rank: 1,
    name: "ChatGPT Plus 账号",
    sales: 156,
    revenue: "¥31,044.00",
  },
  {
    rank: 2,
    name: "Netflix 高级会员",
    sales: 132,
    revenue: "¥11,748.00",
  },
  {
    rank: 3,
    name: "Spotify Premium 年卡",
    sales: 98,
    revenue: "¥12,544.00",
  },
  {
    rank: 4,
    name: "Adobe Creative Cloud",
    sales: 67,
    revenue: "¥26,733.00",
  },
  {
    rank: 5,
    name: "Windows 11 Pro 密钥",
    sales: 54,
    revenue: "¥13,932.00",
  },
];

/* ---------- Custom Tooltip for the Chart ---------- */

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card)] px-3 py-2 shadow-lg">
      <p className="text-xs text-[var(--muted-foreground)]">{label}</p>
      <p className="text-sm font-semibold text-[var(--foreground)]">
        ¥{payload[0].value.toLocaleString()}
      </p>
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

export const dynamic = "force-dynamic";

export default function AdminOverviewPage() {
  return (
    <div className="space-y-6">
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">
          管理概览
        </h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          欢迎回来，以下是今日平台运营数据概览
        </p>
      </div>

      {/* ========== Stats Cards ========== */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statsCards.map((stat) => {
          const Icon = stat.icon;
          const isUp = stat.trend === "up";
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
                    <div className="flex items-center gap-1 mt-1">
                      {isUp ? (
                        <TrendingUp className="h-3.5 w-3.5 text-[var(--success)]" />
                      ) : (
                        <TrendingDown className="h-3.5 w-3.5 text-[var(--warning)]" />
                      )}
                      <span
                        className={cn(
                          "text-xs font-medium",
                          isUp
                            ? "text-[var(--success)]"
                            : "text-[var(--warning)]"
                        )}
                      >
                        {stat.change}
                      </span>
                      <span className="text-xs text-[var(--muted-foreground)]">
                        较昨日
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
            <span className="text-xs text-[var(--muted-foreground)]">
              最近 7 天
            </span>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={salesChartData}
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
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                    tickFormatter={(v: number) => `¥${v}`}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="#6c5ce7"
                    strokeWidth={2}
                    fill="url(#salesGradient)"
                  />
                </AreaChart>
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
              本月
            </span>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {hotProducts.map((product) => (
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
                      销量 {product.sales} 件
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-[var(--foreground)] whitespace-nowrap">
                    {product.revenue}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

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
                  {recentOrders.map((order) => (
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
                          {order.amount}
                        </span>
                      </td>
                      <td className="py-3 text-center">
                        <Badge variant={order.statusVariant}>
                          {order.status}
                        </Badge>
                      </td>
                      <td className="py-3 text-right">
                        <span className="text-xs text-[var(--muted-foreground)] whitespace-nowrap">
                          {order.date}
                        </span>
                      </td>
                    </tr>
                  ))}
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
                      3 个商品库存不足
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
