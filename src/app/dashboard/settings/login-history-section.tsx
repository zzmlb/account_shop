"use client";

import { useState, useEffect } from "react";
import {
  Shield,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Globe,
  Monitor,
  XCircle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { apiFetch } from "@/lib/api-fetch";

interface LoginLogEntry {
  id: string;
  success: boolean;
  ip: string | null;
  userAgent: string | null;
  reason: string | null;
  createdAt: string;
}

function parseBrowser(ua: string | null): string {
  if (!ua) return "-";
  if (ua.includes("Chrome") && !ua.includes("Edg")) return "Chrome";
  if (ua.includes("Edg")) return "Edge";
  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("Safari")) return "Safari";
  return "其他";
}

export function LoginHistorySection() {
  const [entries, setEntries] = useState<LoginLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    apiFetch<{ logs: LoginLogEntry[] }>("/api/auth/login-history", {
      signal: controller.signal,
    })
      .then((data) => setEntries(data.logs))
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Shield className="h-5 w-5 text-[var(--primary)]" />
          登录记录
        </CardTitle>
        <CardDescription>
          最近20条登录活动，如发现异常请立即修改密码
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--primary)]" />
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--destructive)]/10 px-3 py-2 text-sm text-[var(--destructive)]">
            <AlertCircle className="h-4 w-4 shrink-0" />
            加载登录记录失败，请刷新页面重试
          </div>
        ) : entries.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)]">暂无登录记录</p>
        ) : (
          <div className="space-y-2">
            {entries.slice(0, 10).map((entry) => {
              const d = new Date(entry.createdAt);
              const timeStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
              return (
                <div
                  key={entry.id}
                  className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--border)] px-3 py-2"
                >
                  <div className="flex items-center gap-3">
                    {entry.success ? (
                      <CheckCircle2 className="h-4 w-4 text-[var(--success)]" />
                    ) : (
                      <XCircle className="h-4 w-4 text-[var(--destructive)]" />
                    )}
                    <div>
                      <div className="flex items-center gap-2 text-sm">
                        <span
                          className={
                            entry.success
                              ? "text-[var(--foreground)]"
                              : "text-[var(--destructive)]"
                          }
                        >
                          {entry.success ? "登录成功" : "登录失败"}
                        </span>
                        {entry.reason && (
                          <span className="text-xs text-[var(--muted-foreground)]">
                            ({entry.reason})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-[var(--muted-foreground)]">
                        <span className="flex items-center gap-1">
                          <Globe className="h-3 w-3" />
                          {entry.ip || "-"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Monitor className="h-3 w-3" />
                          {parseBrowser(entry.userAgent)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-[var(--muted-foreground)]">
                    {timeStr}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
