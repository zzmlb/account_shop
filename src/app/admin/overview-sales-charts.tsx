"use client";

import Link from "next/link";
import {
  UserPlus,
  Package,
  Crown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Area,
  AreaChart,
  Bar,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

/* ---------- Types ---------- */

interface SalesChartItem {
  date: string;
  amount: number;
  orders: number;
}

interface UserGrowthItem {
  date: string;
  users: number;
}

interface HotProduct {
  rank: number;
  name: string;
  sales: number;
  views: number;
  revenue: number;
}

/* ---------- Props ---------- */

export interface OverviewSalesChartsProps {
  salesChart: SalesChartItem[];
  userGrowthChart: UserGrowthItem[];
  hotProducts: HotProduct[];
  chartPeriod: number;
  chartLoading: boolean;
  onPeriodChange: (period: number) => void;
}

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

/* ---------- Component ---------- */

export function OverviewSalesCharts({
  salesChart,
  userGrowthChart,
  hotProducts,
  chartPeriod,
  chartLoading,
  onPeriodChange,
}: OverviewSalesChartsProps) {
  return (
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
                onClick={() => onPeriodChange(p)}
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

      {/* User Growth Chart */}
      {userGrowthChart.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-[var(--success)]" />
              用户增长趋势
            </CardTitle>
            <span className="text-xs text-[var(--muted-foreground)]">
              近{chartPeriod}天新注册用户
            </span>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={userGrowthChart}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="userGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00b894" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#00b894" stopOpacity={0} />
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
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-md)",
                      fontSize: "12px",
                    }}
                    formatter={(value: number) => [`${value} 人`, "新增用户"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="users"
                    stroke="#00b894"
                    strokeWidth={2}
                    fill="url(#userGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

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
              <div className="flex flex-col items-center py-6 text-center text-[var(--muted-foreground)]">
                <Package className="mb-2 h-8 w-8 opacity-20" />
                <p className="text-sm">暂无销量数据</p>
                <Link href="/admin/products" className="mt-1 text-xs text-[var(--primary)] hover:underline">
                  管理商品
                </Link>
              </div>
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
  );
}
