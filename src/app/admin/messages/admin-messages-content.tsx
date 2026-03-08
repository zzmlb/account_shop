"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Mails,
  Mail,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Inbox,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

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

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

const statusConfig = {
  PENDING: { label: "待处理", color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" },
  REPLIED: { label: "已回复", color: "bg-green-500/10 text-green-600 border-green-500/20" },
  CLOSED: { label: "已关闭", color: "bg-gray-500/10 text-gray-500 border-gray-500/20" },
};

export default function AdminMessagesContent() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });
  const [activeTab, setActiveTab] = useState("all");
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [updating, setUpdating] = useState(false);

  const fetchMessages = useCallback(
    async (page: number, status: string) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("pageSize", "20");
        if (status !== "all") params.set("status", status);

        const res = await fetch(`/api/admin/messages?${params.toString()}`);
        const data = await res.json();
        if (data.success) {
          setMessages(data.messages);
          setPagination(data.pagination);
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchMessages(pagination.page, activeTab);
  }, [pagination.page, activeTab, fetchMessages]);

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
        setSelectedMessage(null);
        setAdminNote("");
        fetchMessages(pagination.page, activeTab);
      }
    } catch {
      // silently fail
    } finally {
      setUpdating(false);
    }
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
            共 {pagination.total} 条留言
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => {
              setActiveTab(tab.value);
              setPagination((p) => ({ ...p, page: 1 }));
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

      {/* Messages list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--muted-foreground)]" />
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
          {messages.map((m) => {
            const sc = statusConfig[m.status];
            return (
              <div
                key={m.id}
                className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-4"
              >
                <div className="flex items-start justify-between gap-4">
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
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page <= 1}
            onClick={() =>
              setPagination((p) => ({ ...p, page: p.page - 1 }))
            }
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-[var(--muted-foreground)]">
            {pagination.page} / {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() =>
              setPagination((p) => ({ ...p, page: p.page + 1 }))
            }
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
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
