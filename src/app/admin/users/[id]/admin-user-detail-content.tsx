"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Mail,
  Wallet,
  ShoppingCart,
  Star,
  Heart,
  Clock,
  Shield,
  Ban,
  Loader2,
  Globe,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, formatDateTime } from "@/lib/utils";

interface UserDetail {
  id: string;
  username: string;
  email: string;
  avatar: string | null;
  balance: number;
  role: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  counts: {
    orders: number;
    reviews: number;
    favorites: number;
    notifications: number;
  };
  totalSpent: number;
}

interface RecentOrder {
  id: string;
  orderNo: string;
  totalAmount: number;
  payAmount: number;
  status: string;
  paymentMethod: string;
  createdAt: string;
}

interface BalanceLog {
  id: string;
  amount: number;
  type: string;
  description: string;
  createdAt: string;
}

interface LoginLog {
  id: string;
  ip: string;
  userAgent: string;
  success: boolean;
  createdAt: string;
}

const STATUS_MAP: Record<string, { label: string; variant: "default" | "destructive" | "success" | "outline" }> = {
  PENDING: { label: "待支付", variant: "outline" },
  PAID: { label: "已支付", variant: "default" },
  DELIVERED: { label: "已发货", variant: "success" },
  CANCELLED: { label: "已取消", variant: "destructive" },
  REFUNDED: { label: "已退款", variant: "outline" },
  EXPIRED: { label: "已过期", variant: "outline" },
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "刚刚";
  if (mins < 60) return `${mins}分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}天前`;
  return formatDateTime(iso);
}

export default function AdminUserDetailContent({ userId }: { userId: string }) {
  const [user, setUser] = useState<UserDetail | null>(null);
  const [orders, setOrders] = useState<RecentOrder[]>([]);
  const [balanceLogs, setBalanceLogs] = useState<BalanceLog[]>([]);
  const [loginLogs, setLoginLogs] = useState<LoginLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`);
      const data = await res.json();
      if (data.success) {
        setUser(data.user);
        setOrders(data.recentOrders);
        setBalanceLogs(data.recentBalanceLogs);
        setLoginLogs(data.recentLoginLogs);
      } else {
        setError(data.message || "用户不存在");
      }
    } catch {
      setError("加载失败");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const handleToggleBan = async () => {
    if (!user) return;
    const newStatus = user.status === "BANNED" ? "ACTIVE" : "BANNED";
    try {
      const res = await fetch(`/api/admin/users?id=${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setUser((prev) => prev ? { ...prev, status: newStatus } : prev);
        toast.success(newStatus === "BANNED" ? "用户已封禁" : "用户已解封");
      } else {
        toast.error(data.message || "操作失败");
      }
    } catch {
      toast.error("网络错误");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6" aria-busy="true">
        {/* Back button */}
        <div className="h-9 w-16 animate-pulse rounded bg-[var(--muted)]" />
        {/* Profile card */}
        <div className="animate-pulse rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-[var(--muted)]" />
            <div className="space-y-2">
              <div className="h-5 w-32 rounded bg-[var(--muted)]" />
              <div className="h-3 w-48 rounded bg-[var(--muted)]" />
            </div>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="rounded-[var(--radius-md)] bg-[var(--muted)]/50 p-3 text-center">
                <div className="mx-auto mb-1 h-4 w-4 rounded bg-[var(--muted)]" />
                <div className="mx-auto h-5 w-12 rounded bg-[var(--muted)]" />
                <div className="mx-auto mt-1 h-3 w-10 rounded bg-[var(--muted)]" />
              </div>
            ))}
          </div>
        </div>
        {/* Two column cards */}
        <div className="grid gap-6 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)]">
              <div className="border-b border-[var(--border)] px-5 py-3">
                <div className="h-4 w-20 rounded bg-[var(--muted)]" />
              </div>
              <div className="divide-y divide-[var(--border)]">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="flex items-center justify-between px-5 py-3">
                    <div className="space-y-1.5">
                      <div className="h-3 w-28 rounded bg-[var(--muted)]" />
                      <div className="h-3 w-16 rounded bg-[var(--muted)]" />
                    </div>
                    <div className="h-4 w-16 rounded bg-[var(--muted)]" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="flex flex-col items-center py-16 text-center">
        <XCircle className="mb-4 h-12 w-12 text-[var(--destructive)]" />
        <p className="text-lg font-medium">{error || "用户不存在"}</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/admin/users">返回用户列表</Link>
        </Button>
      </div>
    );
  }

  const roleLabel = user.role === "SUPER_ADMIN" ? "超级管理员" : user.role === "ADMIN" ? "管理员" : "普通用户";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/users">
            <ArrowLeft className="mr-1 h-4 w-4" />
            返回
          </Link>
        </Button>
      </div>

      {/* User Profile Card */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--primary)]/10 text-2xl font-bold text-[var(--primary)]">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold">{user.username}</h1>
                <Badge variant={user.status === "BANNED" ? "destructive" : "success"}>
                  {user.status === "BANNED" ? "已封禁" : "正常"}
                </Badge>
                {user.role !== "USER" && (
                  <Badge variant="outline" className="gap-1">
                    <Shield className="h-3 w-3" />
                    {roleLabel}
                  </Badge>
                )}
              </div>
              <div className="mt-1 flex items-center gap-3 text-sm text-[var(--muted-foreground)]">
                <span className="flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" />
                  {user.email}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  注册于 {formatDateTime(user.createdAt)}
                </span>
              </div>
            </div>
          </div>
          <Button
            variant={user.status === "BANNED" ? "outline" : "destructive"}
            size="sm"
            onClick={handleToggleBan}
            className="gap-1"
          >
            {user.status === "BANNED" ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                解封用户
              </>
            ) : (
              <>
                <Ban className="h-4 w-4" />
                封禁用户
              </>
            )}
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
          {[
            { label: "余额", value: `¥${user.balance.toFixed(2)}`, icon: Wallet },
            { label: "消费总额", value: `¥${user.totalSpent.toFixed(2)}`, icon: ShoppingCart },
            { label: "订单数", value: String(user.counts.orders), icon: ShoppingCart },
            { label: "评价数", value: String(user.counts.reviews), icon: Star },
            { label: "收藏数", value: String(user.counts.favorites), icon: Heart },
          ].map((stat) => (
            <div key={stat.label} className="rounded-[var(--radius-md)] bg-[var(--muted)]/50 p-3 text-center">
              <stat.icon className="mx-auto mb-1 h-4 w-4 text-[var(--muted-foreground)]" />
              <div className="text-lg font-bold">{stat.value}</div>
              <div className="text-xs text-[var(--muted-foreground)]">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Orders */}
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)]">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3">
            <h2 className="font-semibold">近期订单</h2>
            <span className="text-xs text-[var(--muted-foreground)]">共 {user.counts.orders} 笔</span>
          </div>
          {orders.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-[var(--muted-foreground)]">暂无订单</div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {orders.map((order) => {
                const statusInfo = STATUS_MAP[order.status] || STATUS_MAP.PENDING;
                return (
                  <Link
                    key={order.id}
                    href={`/admin/orders/${order.id}`}
                    className="flex items-center justify-between px-5 py-3 transition-colors hover:bg-[var(--muted)]/50"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm">{order.orderNo}</span>
                        <Badge variant={statusInfo.variant} className="text-[10px]">
                          {statusInfo.label}
                        </Badge>
                      </div>
                      <span className="text-xs text-[var(--muted-foreground)]">{timeAgo(order.createdAt)}</span>
                    </div>
                    <span className="font-semibold">¥{order.payAmount.toFixed(2)}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Balance Logs */}
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)]">
          <div className="border-b border-[var(--border)] px-5 py-3">
            <h2 className="font-semibold">余额变动</h2>
          </div>
          {balanceLogs.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-[var(--muted-foreground)]">暂无记录</div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {balanceLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm">{log.description}</p>
                    <span className="text-xs text-[var(--muted-foreground)]">{timeAgo(log.createdAt)}</span>
                  </div>
                  <span
                    className={cn(
                      "font-semibold tabular-nums",
                      log.amount >= 0 ? "text-green-600" : "text-red-500"
                    )}
                  >
                    {log.amount >= 0 ? "+" : ""}
                    {log.amount.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Login Logs */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)]">
        <div className="border-b border-[var(--border)] px-5 py-3">
          <h2 className="font-semibold">登录记录</h2>
        </div>
        {loginLogs.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-[var(--muted-foreground)]">暂无登录记录</div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {loginLogs.map((log) => (
              <div key={log.id} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  {log.success ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 shrink-0 text-red-500" />
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm">
                      <Globe className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
                      <span className="font-mono">{log.ip}</span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-[var(--muted-foreground)] max-w-md">
                      {log.userAgent}
                    </p>
                  </div>
                </div>
                <span className="shrink-0 text-xs text-[var(--muted-foreground)]">{timeAgo(log.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
