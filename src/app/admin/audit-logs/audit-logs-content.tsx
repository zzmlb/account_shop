"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ShieldAlert,
  Loader2,
  ChevronLeft,
  ChevronRight,
  User,
  Clock,
  Globe,
} from "lucide-react";
import { apiFetch } from "@/lib/api-fetch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import EmptyState from "@/components/shared/empty-state";

interface AuditLog {
  id: string;
  adminUsername: string;
  action: string;
  target: string | null;
  detail: string | null;
  ip: string | null;
  createdAt: string;
}

const ACTION_LABELS: Record<string, { label: string; variant: "default" | "destructive" | "secondary" | "outline" }> = {
  "order.refund": { label: "订单退款", variant: "destructive" },
  "order.deliver": { label: "手动发货", variant: "default" },
  "order.status_change": { label: "订单状态变更", variant: "secondary" },
  "user.ban": { label: "封禁用户", variant: "destructive" },
  "user.update": { label: "修改用户", variant: "secondary" },
  "user.status_change": { label: "用户状态变更", variant: "secondary" },
  "notification.broadcast": { label: "广播通知", variant: "outline" },
};

const FILTER_OPTIONS = [
  { value: "all", label: "全部操作" },
  { value: "order", label: "订单相关" },
  { value: "user", label: "用户相关" },
  { value: "notification", label: "通知相关" },
];

export default function AuditLogsContent() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState("all");

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: "20",
      });
      if (filter !== "all") {
        params.set("action", filter);
      }
      const data = await apiFetch<{ logs: AuditLog[]; totalPages: number; total: number }>(`/api/admin/audit-logs?${params}`);
      setLogs(data.logs || []);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
    } catch {
      // Silent
    } finally {
      setLoading(false);
    }
  }, [page, filter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const getActionInfo = (action: string) => {
    return ACTION_LABELS[action] || { label: action, variant: "outline" as const };
  };

  const parseDetail = (detail: string | null): Record<string, unknown> | null => {
    if (!detail) return null;
    try {
      return JSON.parse(detail);
    } catch {
      return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)] flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-[var(--primary)]" />
            操作日志
          </h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            管理员操作审计记录，共 {total} 条
          </p>
        </div>

        <Select value={filter} onValueChange={(v) => { setFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FILTER_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
        </div>
      ) : logs.length === 0 ? (
        <EmptyState
          icon={ShieldAlert}
          title="暂无操作日志"
          description="管理员执行关键操作时将自动记录在此"
        />
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">操作记录</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {logs.map((log) => {
                const actionInfo = getActionInfo(log.action);
                const detail = parseDetail(log.detail);
                return (
                  <div
                    key={log.id}
                    className="flex flex-col gap-2 rounded-lg border border-[var(--border)] bg-[var(--secondary)]/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={actionInfo.variant} className="text-xs">
                          {actionInfo.label}
                        </Badge>
                        {log.target && (
                          <span className="text-sm font-medium text-[var(--foreground)]">
                            {log.target}
                          </span>
                        )}
                      </div>
                      {detail && (
                        <p className="text-xs text-[var(--muted-foreground)]">
                          {Object.entries(detail).map(([k, v]) => (
                            <span key={k} className="mr-3">
                              {k}: {typeof v === "object" ? JSON.stringify(v) : String(v)}
                            </span>
                          ))}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-3 text-xs text-[var(--muted-foreground)]">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {log.adminUsername}
                      </span>
                      {log.ip && (
                        <span className="flex items-center gap-1">
                          <Globe className="h-3 w-3" />
                          {log.ip}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(log.createdAt)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <p className="text-xs text-[var(--muted-foreground)]">
                  第 {page}/{totalPages} 页
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
