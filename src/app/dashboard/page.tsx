"use client";

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
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/stores/auth-store";

/* ---- Mock data ---- */
const stats = [
  {
    label: "总订单数",
    value: "12",
    icon: Package,
    href: "/dashboard/orders",
    color: "text-[var(--primary)]",
    bg: "bg-[var(--primary)]/10",
    border: "border-[var(--primary)]/20",
  },
  {
    label: "账户余额",
    value: "¥128.00",
    icon: Wallet,
    href: "/dashboard/balance",
    color: "text-[var(--success)]",
    bg: "bg-[var(--success)]/10",
    border: "border-[var(--success)]/20",
  },
  {
    label: "待处理订单",
    value: "2",
    icon: Clock,
    href: "/dashboard/orders?status=pending",
    color: "text-[var(--warning)]",
    bg: "bg-[var(--warning)]/10",
    border: "border-[var(--warning)]/20",
  },
  {
    label: "优惠券",
    value: "3",
    icon: Ticket,
    href: "/dashboard/coupons",
    color: "text-[var(--accent)]",
    bg: "bg-[var(--accent)]/10",
    border: "border-[var(--accent)]/20",
  },
];

const recentOrders = [
  {
    id: "ORD-20260307-A1B2",
    product: "Gmail 全新账号 x2",
    amount: "¥11.98",
    status: "已完成",
    statusVariant: "success" as const,
    date: "2026-03-07",
  },
  {
    id: "ORD-20260306-C3D4",
    product: "Netflix 高级会员 1 个月",
    amount: "¥15.99",
    status: "待支付",
    statusVariant: "default" as const,
    date: "2026-03-06",
  },
  {
    id: "ORD-20260305-E5F6",
    product: "ChatGPT Plus 共享账号",
    amount: "¥19.99",
    status: "已完成",
    statusVariant: "success" as const,
    date: "2026-03-05",
  },
  {
    id: "ORD-20260304-G7H8",
    product: "NordVPN 2 年套餐",
    amount: "¥59.99",
    status: "已退款",
    statusVariant: "secondary" as const,
    date: "2026-03-04",
  },
  {
    id: "ORD-20260303-I9J0",
    product: "Spotify Premium 年卡",
    amount: "¥39.99",
    status: "已完成",
    statusVariant: "success" as const,
    date: "2026-03-03",
  },
];

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

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  const { user } = useAuthStore();

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
              {recentOrders.map((order) => (
                <Link
                  key={order.id}
                  href={`/order/${order.id}`}
                  className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--border)] p-4 transition-colors hover:bg-[var(--card-hover)]"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--primary)]/10">
                      <ShoppingBag className="h-4 w-4 text-[var(--primary)]" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {order.product}
                      </p>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {order.id} &middot; {order.date}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-sm font-semibold">
                      {order.amount}
                    </span>
                    <Badge variant={order.statusVariant}>{order.status}</Badge>
                  </div>
                </Link>
              ))}
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
