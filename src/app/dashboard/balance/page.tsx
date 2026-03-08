"use client";

import { useState } from "react";
import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  RotateCcw,
  Plus,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";

type LogType = "RECHARGE" | "PURCHASE" | "REFUND";

interface BalanceLog {
  id: string;
  type: LogType;
  description: string;
  amount: string;
  date: string;
  balance: string;
}

const TYPE_CONFIG: Record<LogType, { label: string; variant: "success" | "destructive" | "default"; color: string }> = {
  RECHARGE: { label: "充值", variant: "success", color: "text-[var(--success)]" },
  PURCHASE: { label: "消费", variant: "destructive", color: "text-[var(--destructive)]" },
  REFUND: { label: "退款", variant: "default", color: "text-[var(--accent)]" },
};

const BALANCE_LOGS: BalanceLog[] = [
  { id: "1", type: "RECHARGE", description: "在线充值", amount: "+100.00", date: "2026-03-07 14:30", balance: "¥228.00" },
  { id: "2", type: "PURCHASE", description: "购买 Gmail 全新账号 x2", amount: "-11.98", date: "2026-03-07 14:35", balance: "¥128.00" },
  { id: "3", type: "RECHARGE", description: "在线充值", amount: "+50.00", date: "2026-03-06 10:00", balance: "¥139.98" },
  { id: "4", type: "PURCHASE", description: "购买 ChatGPT Plus 共享账号", amount: "-19.99", date: "2026-03-05 09:45", balance: "¥89.98" },
  { id: "5", type: "REFUND", description: "订单退款 ORD-20260304-G7H8", amount: "+59.99", date: "2026-03-04 18:00", balance: "¥109.97" },
  { id: "6", type: "PURCHASE", description: "购买 NordVPN 2 年套餐", amount: "-59.99", date: "2026-03-04 16:20", balance: "¥49.98" },
  { id: "7", type: "PURCHASE", description: "购买 Spotify Premium 年卡", amount: "-39.99", date: "2026-03-03 11:00", balance: "¥109.97" },
  { id: "8", type: "RECHARGE", description: "在线充值", amount: "+200.00", date: "2026-03-01 08:00", balance: "¥149.96" },
];

const RECHARGE_AMOUNTS = [50, 100, 200, 500];

export default function BalancePage() {
  const { user } = useAuthStore();
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);

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
              ¥{user?.balance?.toFixed(2) ?? "128.00"}
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
          <Button className="w-full" size="lg" disabled={!selectedAmount}>
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
          <Button variant="ghost" size="sm">
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            刷新
          </Button>
        </CardHeader>
        <CardContent>
          {/* Table header (desktop only) */}
          <div className="mb-2 hidden grid-cols-[1fr_auto_auto_auto] items-center gap-4 border-b border-[var(--border)] px-4 pb-2 text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)] sm:grid">
            <span>描述</span>
            <span className="w-16 text-center">类型</span>
            <span className="w-24 text-right">金额</span>
            <span className="w-24 text-right">余额</span>
          </div>

          <div className="space-y-3">
            {BALANCE_LOGS.map((log) => {
              const isPositive = log.amount.startsWith("+");
              const config = TYPE_CONFIG[log.type];
              return (
                <div
                  key={log.id}
                  className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--border)] p-4"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                        log.type === "RECHARGE" && "bg-[var(--success)]/10",
                        log.type === "PURCHASE" && "bg-[var(--destructive)]/10",
                        log.type === "REFUND" && "bg-[var(--accent)]/10"
                      )}
                    >
                      {log.type === "RECHARGE" && (
                        <ArrowDownRight className="h-4 w-4 text-[var(--success)]" />
                      )}
                      {log.type === "PURCHASE" && (
                        <ArrowUpRight className="h-4 w-4 text-[var(--destructive)]" />
                      )}
                      {log.type === "REFUND" && (
                        <RotateCcw className="h-4 w-4 text-[var(--accent)]" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {log.description}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
                        <span>{log.date}</span>
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
                      {log.amount}
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      余额 {log.balance}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
