"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Package,
  Wallet,
  Clock,
  Ticket,
  ArrowRight,
  ShoppingBag,
  TrendingUp,
  HelpCircle,
  Zap,
  Loader2,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/stores/auth-store";

/* ---- Types ---- */
interface OrderItem {
  product: { name: string; slug: string };
  quantity: number;
  unitPrice: string;
}

interface Order {
  id: string;
  orderNo: string;
  status: string;
  totalAmount: string;
  createdAt: string;
  email: string;
  items: OrderItem[];
}

/* ---- Status mapping ---- */
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

/* ---- Helpers ---- */
function formatCurrency(value: number | string): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return `¥${num.toFixed(2)}`;
}

function formatDate(iso: string): string {
  return iso.slice(0, 10);
}

function buildProductSummary(items: OrderItem[]): string {
  if (items.length === 0) return "未知商品";
  const first = items[0];
  const label = `${first.product.name}${first.quantity > 1 ? ` x${first.quantity}` : ""}`;
  if (items.length > 1) return `${label} 等${items.length}件`;
  return label;
}

/* ---- Static data ---- */
const quickActions = [
  {
    label: "充值余额",
    description: "快速充值，即时到账",
    href: "/dashboard/balance",
    icon: Wallet,
    color: "text-[var(--success)]",
    bg: "bg-[var(--success)]/10",
  },
  {
    label: "查看卡密",
    description: "查询已购买的卡密信息",
    href: "/order/search",
    icon: TrendingUp,
    color: "text-[var(--primary)]",
    bg: "bg-[var(--primary)]/10",
  },
  {
    label: "帮助中心",
    description: "常见问题与使用指南",
    href: "/articles",
    icon: HelpCircle,
    color: "text-[var(--accent)]",
    bg: "bg-[var(--accent)]/10",
  },
];


export default function DashboardPageContent() {
  const { user } = useAuthStore();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    async function fetchOrders() {
      try {
        const res = await fetch("/api/orders");
        const data = await res.json();
        if (data.success && Array.isArray(data.orders)) {
          setOrders(data.orders);
        } else {
          setFetchError(true);
        }
      } catch {
        setFetchError(true);
      } finally {
        setLoading(false);
      }
    }
    fetchOrders();
  }, []);

  /* ---- Computed stats ---- */
  const totalOrders = orders.length;
  const pendingOrders = orders.filter((o) => o.status === "PENDING").length;
  const balance = user?.balance ?? 0;

  const stats = [
    {
      label: "总订单数",
      value: String(totalOrders),
      icon: Package,
      href: "/dashboard/orders",
      color: "text-[var(--primary)]",
      bg: "bg-[var(--primary)]/10",
      border: "border-[var(--primary)]/20",
    },
    {
      label: "账户余额",
      value: formatCurrency(balance),
      icon: Wallet,
      href: "/dashboard/balance",
      color: "text-[var(--success)]",
      bg: "bg-[var(--success)]/10",
      border: "border-[var(--success)]/20",
    },
    {
      label: "待处理订单",
      value: String(pendingOrders),
      icon: Clock,
      href: "/dashboard/orders?status=pending",
      color: "text-[var(--warning)]",
      bg: "bg-[var(--warning)]/10",
      border: "border-[var(--warning)]/20",
    },
    {
      label: "优惠券",
      value: "0",
      icon: Ticket,
      href: "/dashboard/coupons",
      color: "text-[var(--accent)]",
      bg: "bg-[var(--accent)]/10",
      border: "border-[var(--accent)]/20",
    },
  ];

  const recentOrders = orders.slice(0, 5);

  /* ---- 7-day spending trend data ---- */
  const spendingData = useMemo(() => {
    const days: { date: string; amount: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const dayLabel = `${d.getMonth() + 1}/${d.getDate()}`;
      const dayOrders = orders.filter(
        (o) =>
          o.createdAt.slice(0, 10) === dateStr &&
          (o.status === "PAID" || o.status === "DELIVERED")
      );
      const total = dayOrders.reduce(
        (sum, o) => sum + parseFloat(String(o.totalAmount)),
        0
      );
      days.push({ date: dayLabel, amount: Math.round(total * 100) / 100 });
    }
    return days;
  }, [orders]);

  /* ---- Loading state ---- */
  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  /* ---- Error state ---- */
  if (fetchError && orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="mb-4 text-[var(--muted-foreground)]">加载数据失败，请刷新页面重试</p>
        <Button onClick={() => window.location.reload()} variant="outline">刷新页面</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome section */}
      <div className="relative overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-gradient-to-br from-[var(--primary)]/5 via-transparent to-[var(--accent)]/5 p-6">
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-sm text-[var(--primary)]">
            <Zap className="h-4 w-4" />
            <span className="font-medium">控制面板</span>
          </div>
          <h1 className="mt-2 text-2xl font-bold">
            欢迎回来，{user?.username ?? "用户"}
          </h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            这是您的账户概览，随时掌握最新动态
          </p>
        </div>
        {/* Decorative glow */}
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[var(--primary)]/5 blur-3xl" />
      </div>

      {/* Stats Bento Grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.label} href={stat.href}>
              <Card
                className={`transition-all hover:-translate-y-0.5 hover:shadow-md hover:shadow-[var(--primary)]/5 cursor-pointer border-${stat.border}`}
              >
                <CardContent className="flex items-center gap-4 p-5">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] ${stat.bg}`}
                  >
                    <Icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm text-[var(--muted-foreground)]">
                      {stat.label}
                    </p>
                    <p className="text-xl font-bold">{stat.value}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Spending Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5 text-[var(--primary)]" />
            近7天消费趋势
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={spendingData}
                margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="spendingGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `¥${v}`}
                  width={60}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-md)",
                    fontSize: "13px",
                  }}
                  formatter={(value: number) => [`¥${value.toFixed(2)}`, "消费金额"]}
                />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  fill="url(#spendingGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Two-column bento: Recent Orders + Quick Actions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Orders (takes 2 cols) */}
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
              {recentOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-[var(--muted-foreground)]">
                  <ShoppingBag className="mb-3 h-10 w-10 opacity-40" />
                  <p className="text-sm">暂无订单</p>
                  <Button variant="ghost" size="sm" asChild className="mt-2">
                    <Link href="/">去逛逛</Link>
                  </Button>
                </div>
              ) : (
                recentOrders.map((order) => (
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
                          {order.orderNo} &middot; {formatDate(order.createdAt)}
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

        {/* Quick Actions (1 col) */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
            快捷操作
          </h3>
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.label} href={action.href}>
                <Card className="mb-4 transition-all hover:-translate-y-0.5 hover:shadow-md cursor-pointer">
                  <CardContent className="flex items-center gap-4 p-5">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] ${action.bg}`}
                    >
                      <Icon className={`h-5 w-5 ${action.color}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{action.label}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {action.description}
                      </p>
                    </div>
                    <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-[var(--muted-foreground)]" />
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
