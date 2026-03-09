"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Shield,
  Search,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Globe,
  Monitor,
  Download,
  TrendingUp,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-fetch";
import { Button } from "@/components/ui/button";
import Pagination from "@/components/shared/pagination";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDateTimeFull } from "@/lib/utils";

type StatusFilter = "all" | "success" | "failed";

interface LoginStats {
  todayTotal: number;
  todaySuccess: number;
  todayFailed: number;
  todayUniqueIPs: number;
}

interface LoginLogItem {
  id: string;
  userId: string | null;
  username: string;
  success: boolean;
  ip: string | null;
  userAgent: string | null;
  reason: string | null;
  createdAt: string;
  user: {
    id: string;
    username: string;
    email: string | null;
    role: string;
  } | null;
}

const statusTabs: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "success", label: "成功" },
  { value: "failed", label: "失败" },
];

function parseUA(ua: string | null): string {
  if (!ua) return "-";
  // Simple browser detection
  if (ua.includes("Chrome") && !ua.includes("Edg")) return "Chrome";
  if (ua.includes("Edg")) return "Edge";
  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("Safari") && !ua.includes("Chrome")) return "Safari";
  if (ua.includes("curl")) return "curl";
  return "其他";
}

export default function AdminLoginLogsContent() {
  const [logs, setLogs] = useState<LoginLogItem[]>([]);
  const [stats, setStats] = useState<LoginStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (debouncedSearch) params.set("search", debouncedSearch);
      params.set("page", String(page));
      params.set("pageSize", "20");

      const data = await apiFetch<{
        logs: LoginLogItem[];
        pagination: { totalPages: number; total: number };
        stats?: LoginStats;
      }>(`/api/admin/login-logs?${params}`);
      setLogs(data.logs);
      setTotalPages(data.pagination.totalPages);
      setTotal(data.pagination.total);
      if (data.stats) setStats(data.stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : "网络错误");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, debouncedSearch, page]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const handleExportCSV = () => {
    if (logs.length === 0) { toast.error("没有可导出的数据"); return; }
    const headers = ["状态", "用户名", "邮箱", "IP地址", "浏览器", "原因", "时间"];
    const rows = logs.map((l) => [
      l.success ? "成功" : "失败",
      l.username,
      l.user?.email || "",
      l.ip || "",
      parseUA(l.userAgent),
      l.reason || "",
      l.createdAt,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `login-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`已导出 ${logs.length} 条记录`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Shield className="h-6 w-6 text-[var(--primary)]" />
            登录日志
          </h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            查看所有用户的登录活动记录
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-1" onClick={handleExportCSV} disabled={logs.length === 0}>
          <Download className="h-3.5 w-3.5" />
          导出当前页
        </Button>
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] px-4 py-3">
            <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
              <TrendingUp className="h-3.5 w-3.5" />
              今日登录
            </div>
            <p className="mt-1 text-xl font-bold text-[var(--foreground)]">{stats.todayTotal}</p>
          </div>
          <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] px-4 py-3">
            <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
              <CheckCircle2 className="h-3.5 w-3.5" />
              今日成功
            </div>
            <p className="mt-1 text-xl font-bold text-[var(--success)]">{stats.todaySuccess}</p>
          </div>
          <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] px-4 py-3">
            <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
              <XCircle className="h-3.5 w-3.5" />
              今日失败
            </div>
            <p className="mt-1 text-xl font-bold text-[var(--destructive)]">{stats.todayFailed}</p>
          </div>
          <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] px-4 py-3">
            <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
              <Users className="h-3.5 w-3.5" />
              独立IP
            </div>
            <p className="mt-1 text-xl font-bold text-[var(--foreground)]">{stats.todayUniqueIPs}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={statusFilter} onValueChange={(v) => { setStatusFilter(v as StatusFilter); setPage(1); }}>
          <TabsList>
            {statusTabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <Input
            placeholder="搜索用户名、IP..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 sm:w-64"
          />
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="flex flex-col items-center py-16 text-center">
          <AlertCircle className="mb-4 h-10 w-10 text-[var(--destructive)]" />
          <p className="text-sm text-[var(--muted-foreground)]">{error}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={fetchLogs}>
            重试
          </Button>
        </div>
      )}

      {/* Table */}
      {!loading && !error && (
        <>
          {logs.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center">
              <Shield className="mb-4 h-10 w-10 text-[var(--muted-foreground)]" />
              <p className="font-medium">暂无登录记录</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)]">
              <table className="w-full" aria-label="登录日志列表">
                <thead>
                  <tr className="border-b border-[var(--border)] text-left text-xs font-medium text-[var(--muted-foreground)]">
                    <th scope="col" className="px-4 py-3">状态</th>
                    <th scope="col" className="px-4 py-3">用户名</th>
                    <th scope="col" className="px-4 py-3">IP 地址</th>
                    <th scope="col" className="px-4 py-3">浏览器</th>
                    <th scope="col" className="px-4 py-3">原因</th>
                    <th scope="col" className="px-4 py-3">时间</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((item) => (
                    <tr key={item.id} className="border-b border-[var(--border)] last:border-0">
                      <td className="px-4 py-3">
                        {item.success ? (
                          <Badge variant="success" className="gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            成功
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="gap-1">
                            <XCircle className="h-3 w-3" />
                            失败
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium">{item.username}</div>
                        {item.user?.email && (
                          <div className="text-xs text-[var(--muted-foreground)]">
                            {item.user.email}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-sm text-[var(--muted-foreground)]">
                          <Globe className="h-3.5 w-3.5" />
                          {item.ip || "-"}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-sm text-[var(--muted-foreground)]">
                          <Monitor className="h-3.5 w-3.5" />
                          {parseUA(item.userAgent)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--muted-foreground)]">
                        {item.reason || "-"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-[var(--muted-foreground)]">
                        {formatDateTimeFull(item.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
