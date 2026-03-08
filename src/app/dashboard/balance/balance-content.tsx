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
  Download,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
  const [customAmount, setCustomAmount] = useState("");
  const [filterType, setFilterType] = useState<LogType | "ALL">("ALL");
  const [logs, setLogs] = useState<BalanceLog[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
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
        setError("");
      } else {
        setError(data.message || "获取余额记录失败");
      }
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchBalanceLogs();
  }, [fetchBalanceLogs]);

  const displayBalance = balance !== null ? balance : (user?.balance ?? 0);
  const filteredLogs = filterType === "ALL" ? logs : logs.filter((l) => l.type === filterType);

  const [showRechargeGuide, setShowRechargeGuide] = useState(false);

  const handleRecharge = () => {
    if (!selectedAmount) return;
    setShowRechargeGuide(true);
  };

  const exportTransactions = () => {
    if (logs.length === 0) {
      toast.error("暂无交易记录可导出");
      return;
    }
    const header = "日期,类型,描述,金额\n";
    const rows = logs
      .map((log) => {
        const config = TYPE_CONFIG[log.type] ?? TYPE_CONFIG.RECHARGE;
        return [
          formatDate(log.createdAt),
          config.label,
          `"${log.description.replace(/"/g, '""')}"`,
          log.amount.toFixed(2),
        ].join(",");
      })
      .join("\n");

    const blob = new Blob(["\uFEFF" + header + rows], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `balance_history_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("导出成功", {
      description: `已导出 ${logs.length} 条交易记录`,
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
                onClick={() => { setSelectedAmount(amount); setCustomAmount(""); }}
                className={cn(
                  "flex flex-col items-center rounded-[var(--radius-md)] border-2 p-4 transition-all",
                  selectedAmount === amount && !customAmount
                    ? "border-[var(--primary)] bg-[var(--primary)]/5 shadow-[0_0_12px_rgba(108,92,231,0.15)]"
                    : "border-[var(--border)] hover:border-[var(--primary)]/50"
                )}
              >
                <span className="text-2xl font-bold">¥{amount}</span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-[var(--muted-foreground)] whitespace-nowrap">自定义金额</span>
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]">¥</span>
              <input
                type="number"
                min="10"
                max="10000"
                step="1"
                placeholder="10 ~ 10000"
                value={customAmount}
                onChange={(e) => {
                  setCustomAmount(e.target.value);
                  const val = parseFloat(e.target.value);
                  if (val >= 10 && val <= 10000) {
                    setSelectedAmount(val);
                  } else {
                    setSelectedAmount(null);
                  }
                }}
                className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 pl-8 text-sm focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
              />
            </div>
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
            支持支付宝、微信支付转账充值，管理员审核后到账
          </p>
        </CardContent>
      </Card>

      {/* Transaction history */}
      <Card>
        <CardHeader className="flex-row items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-lg">交易记录</CardTitle>
          <div className="flex items-center gap-1">
            <div className="flex items-center gap-1 mr-2">
              {(["ALL", "RECHARGE", "PURCHASE", "REFUND", "ADMIN_ADJUST"] as const).map((type) => (
                <Button
                  key={type}
                  variant={filterType === type ? "default" : "ghost"}
                  size="sm"
                  className="text-xs h-7 px-2"
                  onClick={() => setFilterType(type)}
                >
                  {type === "ALL" ? "全部" : TYPE_CONFIG[type].label}
                </Button>
              ))}
            </div>
            <Button
              variant="ghost"
              size="sm"
              disabled={logs.length === 0}
              onClick={exportTransactions}
            >
              <Download className="mr-1.5 h-3.5 w-3.5" />
              导出
            </Button>
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
          </div>
        </CardHeader>
        <CardContent>
          {error && !loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="mb-2 h-10 w-10 text-[var(--destructive)]" />
              <p className="text-sm font-medium">{error}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 gap-2"
                onClick={() => fetchBalanceLogs()}
              >
                <RotateCcw className="h-4 w-4" />
                重试
              </Button>
            </div>
          ) : loading ? (
            <div className="animate-pulse space-y-3 py-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between px-1">
                  <div className="space-y-1.5">
                    <div className="h-3.5 w-32 rounded bg-[var(--muted)]" />
                    <div className="h-3 w-20 rounded bg-[var(--muted)]" />
                  </div>
                  <div className="h-4 w-16 rounded bg-[var(--muted)]" />
                </div>
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--muted)]">
                <Wallet className="h-8 w-8 text-[var(--muted-foreground)]" />
              </div>
              <p className="text-sm font-medium text-[var(--foreground)]">暂无交易记录</p>
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                充值余额后即可在此查看交易明细
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4 gap-1.5"
                onClick={() => setShowRechargeGuide(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                立即充值
              </Button>
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
                {filteredLogs.map((log) => {
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

      {/* Recharge Guide Dialog */}
      <Dialog open={showRechargeGuide} onOpenChange={setShowRechargeGuide}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>充值 ¥{selectedAmount}</DialogTitle>
            <DialogDescription>
              请按以下步骤完成余额充值
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--muted)]/50 p-4 space-y-3">
              <div className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-xs font-bold text-[var(--primary-foreground)]">1</span>
                <p className="text-sm">联系客服获取充值账户信息（支付宝/微信/银行卡）</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-xs font-bold text-[var(--primary-foreground)]">2</span>
                <p className="text-sm">转账 <strong className="text-[var(--primary)]">¥{selectedAmount}</strong>，备注您的用户名: <strong className="text-[var(--primary)]">{user?.username}</strong></p>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-xs font-bold text-[var(--primary-foreground)]">3</span>
                <p className="text-sm">转账完成后通知客服，管理员审核后余额将自动到账</p>
              </div>
            </div>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => {
                  if (user?.username) {
                    navigator.clipboard.writeText(user.username);
                    toast.success("用户名已复制");
                  }
                }}
                className="text-xs text-[var(--primary)] hover:underline"
              >
                复制用户名
              </button>
              <span className="text-xs text-[var(--muted-foreground)]">|</span>
              <a href="/contact" className="text-xs text-[var(--primary)] hover:underline">
                联系客服
              </a>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowRechargeGuide(false)}>
              关闭
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
