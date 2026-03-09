"use client";

import {
  ShoppingCart,
  DollarSign,
  Clock,
  AlertCircle,
} from "lucide-react";

interface OrderStats {
  todayOrders: number;
  todayRevenue: number;
  pendingCount: number;
  paidCount: number;
}

interface AdminOrderStatsProps {
  stats: OrderStats;
}

export function AdminOrderStats({ stats }: AdminOrderStatsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] px-4 py-3">
        <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
          <ShoppingCart className="h-3.5 w-3.5" />
          今日订单
        </div>
        <p className="mt-1 text-xl font-bold text-[var(--foreground)]">{stats.todayOrders}</p>
      </div>
      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] px-4 py-3">
        <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
          <DollarSign className="h-3.5 w-3.5" />
          今日收入
        </div>
        <p className="mt-1 text-xl font-bold text-[var(--primary)]">
          ¥{stats.todayRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
      </div>
      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] px-4 py-3">
        <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
          <Clock className="h-3.5 w-3.5" />
          待支付
        </div>
        <p className="mt-1 text-xl font-bold text-[var(--warning)]">{stats.pendingCount}</p>
      </div>
      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] px-4 py-3">
        <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
          <AlertCircle className="h-3.5 w-3.5" />
          待发货
        </div>
        <p className="mt-1 text-xl font-bold text-[var(--accent)]">{stats.paidCount}</p>
      </div>
    </div>
  );
}
