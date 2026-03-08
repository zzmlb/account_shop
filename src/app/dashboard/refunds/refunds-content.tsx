"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  RotateCcw,
  Clock,
  CheckCircle2,
  XCircle,
  ShoppingBag,
  Eye,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface RefundItem {
  id: string;
  orderId: string;
  orderNo: string;
  reason: string;
  status: string;
  adminNote: string | null;
  amount: number;
  createdAt: string;
  updatedAt: string;
  orderStatus: string;
  products: string;
}

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "success" | "destructive"; icon: typeof Clock }> = {
  PENDING: { label: "审核中", variant: "default", icon: Clock },
  APPROVED: { label: "已通过", variant: "success", icon: CheckCircle2 },
  REJECTED: { label: "已拒绝", variant: "destructive", icon: XCircle },
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function RefundsContent() {
  const [refunds, setRefunds] = useState<RefundItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRefunds = useCallback(async () => {
    try {
      const res = await fetch("/api/refunds");
      const data = await res.json();
      if (data.success) {
        setRefunds(data.refunds);
      } else {
        toast.error(data.message || "获取退款列表失败");
      }
    } catch {
      toast.error("网络错误，获取退款列表失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRefunds();
  }, [fetchRefunds]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">退款申请</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          查看您的退款申请状态
        </p>
      </div>

      {loading ? (
        <div className="space-y-3" aria-busy="true">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-4 w-32 rounded bg-[var(--muted)]" />
                  <div className="h-3 w-48 rounded bg-[var(--muted)]" />
                </div>
                <div className="h-6 w-16 rounded bg-[var(--muted)]" />
              </div>
            </div>
          ))}
        </div>
      ) : refunds.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <div className="mb-4 rounded-full bg-[var(--muted)] p-4">
            <RotateCcw className="h-10 w-10 text-[var(--muted-foreground)]" />
          </div>
          <p className="font-medium">还没有退款申请</p>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            如需退款，请前往订单详情页提交申请
          </p>
          <Button asChild variant="outline" size="sm" className="mt-4">
            <Link href="/dashboard/orders">查看订单</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {refunds.map((refund) => {
            const config = STATUS_CONFIG[refund.status] || STATUS_CONFIG.PENDING;
            const StatusIcon = config.icon;
            return (
              <div
                key={refund.id}
                className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)]"
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-mono text-[var(--muted-foreground)]">
                      {refund.orderNo}
                    </span>
                    <span className="text-xs text-[var(--muted-foreground)]">
                      {formatDate(refund.createdAt)}
                    </span>
                  </div>
                  <Badge variant={config.variant} className="gap-1">
                    <StatusIcon className="h-3 w-3" />
                    {config.label}
                  </Badge>
                </div>

                {/* Body */}
                <div className="px-5 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                        <ShoppingBag className="h-3.5 w-3.5" />
                        <span className="truncate">{refund.products}</span>
                      </div>
                      <div className="rounded-[var(--radius-md)] bg-[var(--muted)]/50 px-3 py-2">
                        <p className="text-xs text-[var(--muted-foreground)]">退款原因：</p>
                        <p className="mt-0.5 text-sm">{refund.reason}</p>
                      </div>
                      {refund.adminNote && (
                        <div className="rounded-[var(--radius-md)] border border-[var(--primary)]/20 bg-[var(--primary)]/5 px-3 py-2">
                          <p className="text-xs font-medium text-[var(--primary)]">管理员回复：</p>
                          <p className="mt-0.5 text-sm">{refund.adminNote}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <span className="text-lg font-bold">¥{refund.amount.toFixed(2)}</span>
                      <Button asChild variant="outline" size="sm" className="gap-1">
                        <Link href={`/order/${refund.orderNo}`}>
                          <Eye className="h-3.5 w-3.5" />
                          订单详情
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
