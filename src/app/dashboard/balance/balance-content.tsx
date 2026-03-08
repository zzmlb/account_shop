"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  RotateCcw,
  Plus,
  RefreshCw,
  Settings,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type LogType = "RECHARGE" | "PURCHASE" | "REFUND" | "ADMIN_ADJUST";

interface BalanceLog {
  id: string;
  type: LogType;
  description: string;
  amount: number;
  createdAt: string;
}

const TYPE_CONFIG: Record<
  LogType,
  { label: string; variant: "success" | "destructive" | "default" | "secondary"; color: string }
> = {
  RECHARGE: { label: "充值", variant: "success", color: "text-[var(--success)]" },
  PURCHASE: { label: "消费", variant: "destructive", color: "text-[var(--destructive)]" },
  REFUND: { label: "退款", variant: "default", color: "text-[var(--accent)]" },
  ADMIN_ADJUST: { label: "调整", variant: "secondary", color: "text-[var(--muted-foreground)]" },
};

const RECHARGE_AMOUNTS = [50, 100, 200, 500];

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${d} ${h}:${min}`;
}

function getIcon(type: LogType) {
  switch (type) {
    case "RECHARGE":
      return <ArrowDownRight className="h-4 w-4 text-[var(--success)]" />;
    case "PURCHASE":
      return <ArrowUpRight className="h-4 w-4 text-[var(--destructive)]" />;
    case "REFUND":
      return <RotateCcw className="h-4 w-4 text-[var(--accent)]" />;
    case "ADMIN_ADJUST":
      return <Settings className="h-4 w-4 text-[var(--muted-foreground)]" />;
  }
}

function getIconBg(type: LogType) {
  switch (type) {
    case "RECHARGE":
      return "bg-[var(--success)]/10";
    case "PURCHASE":
      return "bg-[var(--destructive)]/10";
    case "REFUND":
      return "bg-[var(--accent)]/10";
    case "ADMIN_ADJUST":
      return "bg-[var(--secondary)]/10";
  }
}

export default function BalancePageContent() {
  const { user } = useAuthStore();
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [logs, setLogs] = useState<BalanceLog[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBalanceLogs = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const res = await fetch("/api/balance-logs");
      const data = await res.json();

      if (data.success) {
        setLogs(data.logs);
        setBalance(data.balance);
      } else {
        toast.error(data.message || "获取余额记录失败");
      }
    } catch {
      toast.error("网络错误，请稍后重试");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchBalanceLogs();
  }, [fetchBalanceLogs]);

  const displayBalance = balance !== null ? balance : (user?.balance ?? 0);

  const handleRecharge = () => {
    toast.info("充值功能开发中", {
      description: "支付集成即将上线，敬请期待",
    });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">余额管理</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          充值余额和查看交易记录
        </p>
      </div>

      {/* Balance card */}
      <Card className="relative overflow-hidden bg-gradient-to-br from-[var(--primary)]/10 to-[var(--accent)]/5 border-[var(--primary)]/20">
        <CardContent className="flex items-center justify-between p-6">
          <div>
            <p className="text-sm text-[var(--muted-foreground)]">账户余额</p>
            <p className="mt-1 text-4xl font-bold text-[var(--primary)]">
              ¥{displayBalance.toFixed(2)}
            </p>
          </div>
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--primary)]/10">
            <Wallet className="h-7 w-7 text-[var(--primary)]" />
          </div>
        </CardContent>
        {/* Decorative glow */}
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[var(--primary)]/5 blur-3xl" />
      </Card>

      {/* Recharge section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">在线充值</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {RECHARGE_AMOUNTS.map((amount) => (
              <button
                key={amount}
                onClick={() => setSelectedAmount(amount)}
                className={cn(
                  "flex flex-col items-center rounded-[var(--radius-md)] border-2 p-4 transition-all",
                  selectedAmount === amount
                    ? "border-[var(--primary)] bg-[var(--primary)]/5 shadow-[0_0_12px_rgba(108,92,231,0.15)]"
                    : "border-[var(--border)] hover:border-[var(--primary)]/50"
                )}
              >
                <span className="text-2xl font-bold">¥{amount}</span>
              </button>
            ))}
          </div>
          <Button
            className="w-full"
            size="lg"
            disabled={!selectedAmount}
            onClick={handleRecharge}
          >
            <Plus className="mr-2 h-4 w-4" />
            充值 {selectedAmount ? `¥${selectedAmount}` : ""}
          </Button>
          <p className="text-center text-xs text-[var(--muted-foreground)]">
            支持支付宝、微信支付，充值后即时到账
          </p>
        </CardContent>
      </Card>

      {/* Transaction history */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-lg">交易记录</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            disabled={refreshing}
            onClick={() => fetchBalanceLogs(true)}
          >
            <RefreshCw
              className={cn(
                "mr-1.5 h-3.5 w-3.5",
                refreshing && "animate-spin"
              )}
            />
            刷新
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-[var(--muted-foreground)]" />
              <span className="ml-2 text-sm text-[var(--muted-foreground)]">
                加载中...
              </span>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-[var(--muted-foreground)]">
              <Wallet className="mb-2 h-10 w-10 opacity-30" />
              <p className="text-sm">暂无交易记录</p>
            </div>
          ) : (
            <>
              {/* Table header (desktop only) */}
              <div className="mb-2 hidden grid-cols-[1fr_auto_auto] items-center gap-4 border-b border-[var(--border)] px-4 pb-2 text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)] sm:grid">
                <span>描述</span>
                <span className="w-16 text-center">类型</span>
                <span className="w-24 text-right">金额</span>
              </div>

              <div className="space-y-3">
                {logs.map((log) => {
                  const isPositive = log.amount > 0;
                  const config = TYPE_CONFIG[log.type] ?? TYPE_CONFIG.RECHARGE;
                  const amountStr = isPositive
                    ? `+${log.amount.toFixed(2)}`
                    : log.amount.toFixed(2);
                  return (
                    <div
                      key={log.id}
                      className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--border)] p-4"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                            getIconBg(log.type)
                          )}
                        >
                          {getIcon(log.type)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {log.description}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
                            <span>{formatDate(log.createdAt)}</span>
                            <Badge
                              variant={config.variant}
                              className="h-4 px-1.5 text-[10px]"
                            >
                              {config.label}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p
                          className={cn(
                            "font-mono font-semibold",
                            isPositive
                              ? "text-[var(--success)]"
                              : "text-[var(--destructive)]"
                          )}
                        >
                          {amountStr}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
