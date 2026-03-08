"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Mails,
  Mail,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Inbox,
  AlertCircle,
  RotateCcw,
  Search,
  CheckSquare,
  Download,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Pagination from "@/components/shared/pagination";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Message {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: "PENDING" | "REPLIED" | "CLOSED";
  adminNote: string | null;
  createdAt: string;
}

const statusConfig = {
  PENDING: { label: "待处理", color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" },
  REPLIED: { label: "已回复", color: "bg-green-500/10 text-green-600 border-green-500/20" },
  CLOSED: { label: "已关闭", color: "bg-gray-500/10 text-gray-500 border-gray-500/20" },
};

const REPLY_TEMPLATES = [
  { label: "感谢反馈", text: "感谢您的反馈，我们已收到并会尽快处理。如有其他问题，请随时联系我们。" },
  { label: "已处理", text: "您的问题已处理完毕。如果还有其他疑问，请随时联系客服。" },
  { label: "需补充信息", text: "您好，为了更好地帮助您解决问题，请提供更多详细信息（如订单号、具体描述等）。" },
  { label: "退款指引", text: "关于退款，请前往「我的订单」页面提交退款申请，我们会在1-3个工作日内处理。" },
];

export default function AdminMessagesContent() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [activeTab, setActiveTab] = useState("all");
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [updating, setUpdating] = useState(false);

  // Search
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Batch selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchLoading, setBatchLoading] = useState(false);

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", "20");
      if (activeTab !== "all") params.set("status", activeTab);
      if (debouncedSearch) params.set("search", debouncedSearch);

      const res = await fetch(`/api/admin/messages?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setMessages(data.messages);
        setTotalPages(data.pagination.totalPages);
        setTotal(data.pagination.total);
        setError("");
      } else {
        setError(data.message || "获取留言列表失败");
      }
    } catch {
      setError("网络错误，获取留言列表失败");
    } finally {
      setLoading(false);
    }
  }, [page, activeTab, debouncedSearch]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Clear selection on tab/page/search change
  useEffect(() => {
    setSelectedIds(new Set());
  }, [activeTab, page, debouncedSearch]);

  const handleStatusUpdate = async (id: string, status: string) => {
    setUpdating(true);
    try {
      const res = await fetch("/api/admin/messages", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status, adminNote: adminNote || undefined }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(status === "REPLIED" ? "已标记为已回复" : "留言已关闭");
        setSelectedMessage(null);
        setAdminNote("");
        fetchMessages();
      } else {
        toast.error(data.message || "操作失败");
      }
    } catch {
      toast.error("网络错误，操作失败");
    } finally {
      setUpdating(false);
    }
  };

  const handleBatchAction = async (status: string) => {
    if (selectedIds.size === 0) return;
    setBatchLoading(true);
    try {
      const res = await fetch("/api/admin/messages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds), status }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        setSelectedIds(new Set());
        fetchMessages();
      } else {
        toast.error(data.message || "批量操作失败");
      }
    } catch {
      toast.error("网络错误");
    } finally {
      setBatchLoading(false);
    }
  };

  const handleExportCSV = () => {
    const items = selectedIds.size > 0 ? messages.filter((m) => selectedIds.has(m.id)) : messages;
    if (items.length === 0) { toast.error("没有可导出的数据"); return; }
    const headers = ["姓名", "邮箱", "主题", "留言内容", "状态", "管理员备注", "时间"];
    const statusLabel = (s: string) => statusConfig[s as keyof typeof statusConfig]?.label || s;
    const rows = items.map((m) => [
      m.name,
      m.email,
      `"${m.subject.replace(/"/g, '""')}"`,
      `"${m.message.replace(/"/g, '""')}"`,
      statusLabel(m.status),
      m.adminNote ? `"${m.adminNote.replace(/"/g, '""')}"` : "",
      m.createdAt,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `messages-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`已导出 ${items.length} 条留言`);
  };

  const allSelected = messages.length > 0 && messages.every((m) => selectedIds.has(m.id));
  const toggleSelectAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(messages.map((m) => m.id)));
  };
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const tabs = [
    { value: "all", label: "全部" },
    { value: "PENDING", label: "待处理" },
    { value: "REPLIED", label: "已回复" },
    { value: "CLOSED", label: "已关闭" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-[var(--primary)]/10">
          <Mails className="h-5 w-5 text-[var(--primary)]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[var(--foreground)]">
            留言管理
          </h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            共 {total} 条留言
          </p>
        </div>
      </div>

      {/* Tabs + search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => {
                setActiveTab(tab.value);
                setPage(1);
              }}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                activeTab === tab.value
                  ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                  : "bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <Input
            placeholder="搜索姓名、邮箱、主题..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 sm:w-64"
          />
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--primary)]/30 bg-[var(--primary)]/5 px-4 py-3">
          <CheckSquare className="h-4 w-4 text-[var(--primary)]" />
          <span className="text-sm font-medium">已选择 {selectedIds.size} 项</span>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1" onClick={handleExportCSV}>
              <Download className="h-3.5 w-3.5" />
              导出选中
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={() => handleBatchAction("REPLIED")}
              disabled={batchLoading}
            >
              {batchLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
              批量已回复
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={() => handleBatchAction("CLOSED")}
              disabled={batchLoading}
            >
              {batchLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
              批量关闭
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
              取消选择
            </Button>
          </div>
        </div>
      )}

      {/* Export all (no selection) */}
      {!loading && !error && messages.length > 0 && selectedIds.size === 0 && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" className="gap-1" onClick={handleExportCSV}>
            <Download className="h-3.5 w-3.5" />
            导出当前页
          </Button>
        </div>
      )}

      {/* Messages list */}
      {error && !loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <AlertCircle className="h-12 w-12 text-[var(--destructive)]" />
          <p className="mt-4 text-sm font-medium text-[var(--foreground)]">{error}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3 gap-2"
            onClick={fetchMessages}
          >
            <RotateCcw className="h-4 w-4" />
            重试
          </Button>
        </div>
      ) : loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="h-4 w-32 rounded bg-[var(--muted)]" />
                <div className="h-5 w-16 rounded-full bg-[var(--muted)]" />
              </div>
              <div className="h-3 w-3/4 rounded bg-[var(--muted)]" />
              <div className="h-3 w-1/2 rounded bg-[var(--muted)]" />
            </div>
          ))}
        </div>
      ) : messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Inbox className="h-12 w-12 text-[var(--muted-foreground)]" />
          <p className="mt-4 text-sm text-[var(--muted-foreground)]">
            暂无留言
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Select all */}
          <div className="flex items-center gap-2 px-1">
            <button
              type="button"
              onClick={toggleSelectAll}
              className={`flex h-4 w-4 items-center justify-center rounded border transition-colors ${
                allSelected
                  ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                  : "border-[var(--border)] hover:border-[var(--primary)]"
              }`}
            >
              {allSelected && <CheckSquare className="h-3 w-3" />}
            </button>
            <span className="text-xs text-[var(--muted-foreground)]">全选当前页</span>
          </div>

          {messages.map((m) => {
            const sc = statusConfig[m.status];
            const isSelected = selectedIds.has(m.id);
            return (
              <div
                key={m.id}
                className={`rounded-[var(--radius-lg)] border p-4 transition-colors ${
                  isSelected
                    ? "border-[var(--primary)]/50 bg-[var(--primary)]/5"
                    : "border-[var(--border)] bg-[var(--card)]"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={() => toggleSelect(m.id)}
                      className={`mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                        isSelected
                          ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                          : "border-[var(--border)] hover:border-[var(--primary)]"
                      }`}
                    >
                      {isSelected && <CheckSquare className="h-3 w-3" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-[var(--foreground)]">
                          {m.subject}
                        </span>
                        <Badge variant="outline" className={sc.color}>
                          {sc.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-[var(--muted-foreground)] line-clamp-2">
                        {m.message}
                      </p>
                      <div className="mt-2 flex items-center gap-4 text-xs text-[var(--muted-foreground)]">
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {m.name} &lt;{m.email}&gt;
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(m.createdAt).toLocaleString("zh-CN")}
                        </span>
                      </div>
                      {m.adminNote && (
                        <div className="mt-2 rounded-[var(--radius-md)] bg-[var(--muted)] px-3 py-2 text-xs text-[var(--muted-foreground)]">
                          管理员备注: {m.adminNote}
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedMessage(m);
                      setAdminNote(m.adminNote || "");
                    }}
                  >
                    处理
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
      )}

      {/* Detail/Action Dialog */}
      <Dialog
        open={!!selectedMessage}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedMessage(null);
            setAdminNote("");
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedMessage?.subject}</DialogTitle>
          </DialogHeader>
          {selectedMessage && (
            <div className="space-y-4">
              <div className="text-xs text-[var(--muted-foreground)]">
                来自: {selectedMessage.name} ({selectedMessage.email}) ·{" "}
                {new Date(selectedMessage.createdAt).toLocaleString("zh-CN")}
              </div>

              <div className="rounded-[var(--radius-md)] bg-[var(--muted)] p-4 text-sm text-[var(--foreground)] whitespace-pre-wrap">
                {selectedMessage.message}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">
                  管理员备注
                </label>
                <Textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="添加处理备注（可选）"
                  rows={3}
                />
                {/* Quick reply templates */}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
                    <FileText className="h-3 w-3" />
                    模板:
                  </span>
                  {REPLY_TEMPLATES.map((tpl) => (
                    <button
                      key={tpl.label}
                      type="button"
                      onClick={() => setAdminNote(tpl.text)}
                      className="rounded-full border border-[var(--border)] px-2.5 py-0.5 text-xs text-[var(--muted-foreground)] transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)]"
                    >
                      {tpl.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => handleStatusUpdate(selectedMessage.id, "REPLIED")}
                  disabled={updating}
                  className="flex-1 gap-2"
                >
                  {updating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4" />
                  )}
                  标记已回复
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleStatusUpdate(selectedMessage.id, "CLOSED")}
                  disabled={updating}
                  className="gap-2"
                >
                  <XCircle className="h-4 w-4" />
                  关闭
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
