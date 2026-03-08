"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Shield,
  Search,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Globe,
  Monitor,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDateTimeFull } from "@/lib/utils";

type StatusFilter = "all" | "success" | "failed";

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (search) params.set("search", search);
      params.set("page", String(page));
      params.set("pageSize", "20");

      const res = await fetch(`/api/admin/login-logs?${params}`);
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs);
        setTotalPages(data.pagination.totalPages);
        setTotal(data.pagination.total);
      } else {
        setError(data.message || "加载失败");
      }
    } catch {
      setError("网络错误");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search, page]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Shield className="h-6 w-6 text-[var(--primary)]" />
          登录日志
        </h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          查看所有用户的登录活动记录
        </p>
      </div>

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
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
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
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--border)] text-left text-xs font-medium text-[var(--muted-foreground)]">
                    <th className="px-4 py-3">状态</th>
                    <th className="px-4 py-3">用户名</th>
                    <th className="px-4 py-3">IP 地址</th>
                    <th className="px-4 py-3">浏览器</th>
                    <th className="px-4 py-3">原因</th>
                    <th className="px-4 py-3">时间</th>
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
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-[var(--muted-foreground)]">
                共 {total} 条，第 {page}/{totalPages} 页
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                  上一页
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  下一页
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
