"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Package,
  RotateCcw,
  Wallet,
  Megaphone,
  Ticket,
  CheckCheck,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Inbox,
  AlertCircle,
  Trash2,
  CheckSquare,
  Square,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { timeAgo } from "@/lib/utils";
import ConfirmDialog from "@/components/shared/confirm-dialog";
import { apiFetch, apiMutate } from "@/lib/api-fetch";

interface Notification {
  id: string;
  type: "ORDER" | "REFUND" | "BALANCE" | "SYSTEM" | "COUPON";
  title: string;
  content: string;
  href: string | null;
  isRead: boolean;
  createdAt: string;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

const typeConfig = {
  ORDER: { icon: Package, label: "订单", color: "text-blue-500", bg: "bg-blue-500/10" },
  REFUND: { icon: RotateCcw, label: "退款", color: "text-orange-500", bg: "bg-orange-500/10" },
  BALANCE: { icon: Wallet, label: "余额", color: "text-green-500", bg: "bg-green-500/10" },
  SYSTEM: { icon: Megaphone, label: "系统", color: "text-purple-500", bg: "bg-purple-500/10" },
  COUPON: { icon: Ticket, label: "优惠", color: "text-pink-500", bg: "bg-pink-500/10" },
};

function getDateGroup(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const weekAgo = new Date(today.getTime() - 7 * 86400000);

  if (date >= today) return "今天";
  if (date >= yesterday) return "昨天";
  if (date >= weekAgo) return "本周";
  return "更早";
}

export default function NotificationsContent() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [markingAll, setMarkingAll] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"all" | "unread">("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchDeleting, setBatchDeleting] = useState(false);
  const [batchDeleteConfirm, setBatchDeleteConfirm] = useState(false);

  const fetchNotifications = useCallback(
    async (page: number, filter: "all" | "unread") => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("pageSize", "20");
        if (filter === "unread") params.set("unread", "true");
        if (typeFilter !== "all") params.set("type", typeFilter);

        const data = await apiFetch<{
          notifications: Notification[];
          pagination: Pagination;
          unreadCount: number;
        }>(`/api/notifications?${params.toString()}`);
        setNotifications(data.notifications);
        setPagination(data.pagination);
        setUnreadCount(data.unreadCount);
        setError("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "获取通知列表失败");
      } finally {
        setLoading(false);
      }
    },
    [typeFilter]
  );

  useEffect(() => {
    fetchNotifications(pagination.page, activeFilter);
  }, [pagination.page, activeFilter, typeFilter, fetchNotifications]);

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await apiMutate("/api/notifications", "PUT", { all: true });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast.success("已全部标记为已读");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "操作失败");
    } finally {
      setMarkingAll(false);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read if unread
    if (!notification.isRead) {
      apiMutate("/api/notifications", "PUT", { ids: [notification.id] }).catch(() => {});

      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    }

    // Navigate if href exists
    if (notification.href) {
      router.push(notification.href);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await apiFetch(`/api/notifications?id=${id}`, { method: "DELETE" });
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      const deleted = notifications.find((n) => n.id === id);
      if (deleted && !deleted.isRead) setUnreadCount((c) => Math.max(0, c - 1));
      toast.success("通知已删除");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "删除失败");
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === notifications.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(notifications.map((n) => n.id)));
    }
  };

  const handleBatchDelete = async () => {
    setBatchDeleteConfirm(false);
    if (selectedIds.size === 0) return;
    setBatchDeleting(true);
    try {
      const data = await apiMutate<{ message?: string }>("/api/notifications", "DELETE", {
        ids: Array.from(selectedIds),
      });
      const deletedUnread = notifications.filter(
        (n) => selectedIds.has(n.id) && !n.isRead
      ).length;
      setNotifications((prev) => prev.filter((n) => !selectedIds.has(n.id)));
      setUnreadCount((c) => Math.max(0, c - deletedUnread));
      setSelectedIds(new Set());
      toast.success(data.message || "批量删除成功");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "批量删除失败");
    } finally {
      setBatchDeleting(false);
    }
  };

  // Clear selection when filter/page changes
  useEffect(() => {
    setSelectedIds(new Set());
  }, [pagination.page, activeFilter, typeFilter]);

  const allSelected = notifications.length > 0 && selectedIds.size === notifications.length;

  // Group notifications by date
  const groupedNotifications = notifications.reduce<{ group: string; items: Notification[] }[]>(
    (groups, n) => {
      const group = getDateGroup(n.createdAt);
      const last = groups[groups.length - 1];
      if (last && last.group === group) {
        last.items.push(n);
      } else {
        groups.push({ group, items: [n] });
      }
      return groups;
    },
    []
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-[var(--primary)]/10">
            <Bell className="h-5 w-5 text-[var(--primary)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--foreground)]">
              我的通知
            </h1>
            <p className="text-sm text-[var(--muted-foreground)]">
              {unreadCount > 0
                ? `${unreadCount} 条未读通知`
                : "暂无未读通知"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllRead}
              disabled={markingAll}
              className="gap-2"
            >
              {markingAll ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCheck className="h-4 w-4" />
              )}
              全部已读
            </Button>
          )}
        </div>
      </div>

      {/* Batch action bar */}
      {notifications.length > 0 && (
        <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--muted)]/50 px-3 py-2">
          <button
            onClick={toggleSelectAll}
            className="flex items-center gap-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
            aria-label={allSelected ? "取消全选" : "全选"}
          >
            {allSelected ? (
              <CheckSquare className="h-4 w-4 text-[var(--primary)]" />
            ) : (
              <Square className="h-4 w-4" />
            )}
            {allSelected ? "取消全选" : "全选"}
          </button>
          {selectedIds.size > 0 && (
            <>
              <span className="text-xs text-[var(--muted-foreground)]">
                已选 {selectedIds.size} 条
              </span>
              <Button
                variant="destructive"
                size="sm"
                className="ml-auto gap-1.5 h-7 text-xs"
                onClick={() => setBatchDeleteConfirm(true)}
                disabled={batchDeleting}
              >
                {batchDeleting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                批量删除
              </Button>
            </>
          )}
        </div>
      )}

      {/* Filter tabs */}
      <div className="space-y-2">
        <div className="flex gap-2" role="tablist" aria-label="通知筛选">
          <button
            role="tab"
            aria-selected={activeFilter === "all"}
            onClick={() => {
              setActiveFilter("all");
              setPagination((p) => ({ ...p, page: 1 }));
            }}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              activeFilter === "all"
                ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                : "bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            )}
          >
            全部
          </button>
          <button
            role="tab"
            aria-selected={activeFilter === "unread"}
            onClick={() => {
              setActiveFilter("unread");
              setPagination((p) => ({ ...p, page: 1 }));
            }}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              activeFilter === "unread"
                ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                : "bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            )}
          >
            未读
            {unreadCount > 0 && (
              <span className="ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[var(--primary-foreground)]/20 text-xs">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>
        </div>
        {/* Type filter */}
        <div className="flex flex-wrap gap-1.5">
          {([
            { value: "all", label: "全部类型" },
            { value: "ORDER", label: "订单" },
            { value: "REFUND", label: "退款" },
            { value: "BALANCE", label: "余额" },
            { value: "SYSTEM", label: "系统" },
            { value: "COUPON", label: "优惠" },
          ]).map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                setTypeFilter(opt.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                typeFilter === opt.value
                  ? "bg-[var(--foreground)] text-[var(--background)]"
                  : "border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--foreground)]/30"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Notification list */}
      {error && !loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--destructive)]/10">
            <AlertCircle className="h-8 w-8 text-[var(--destructive)]" />
          </div>
          <p className="mt-4 text-sm font-medium text-[var(--foreground)]">{error}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3 gap-2"
            onClick={() => fetchNotifications(pagination.page, activeFilter)}
          >
            <RotateCcw className="h-4 w-4" />
            重试
          </Button>
        </div>
      ) : loading ? (
        <div className="animate-pulse space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] p-4">
              <div className="mt-0.5 h-8 w-8 shrink-0 rounded-full bg-[var(--muted)]" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-2/3 rounded bg-[var(--muted)]" />
                <div className="h-3 w-full rounded bg-[var(--muted)]" />
                <div className="h-3 w-20 rounded bg-[var(--muted)]" />
              </div>
            </div>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--muted)]">
            <Inbox className="h-8 w-8 text-[var(--muted-foreground)]" />
          </div>
          <p className="mt-4 text-sm font-medium text-[var(--foreground)]">
            {activeFilter === "unread" ? "没有未读通知" : "暂无通知"}
          </p>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            {activeFilter === "unread"
              ? "所有通知已读，保持关注新动态"
              : "下单后您将在此收到订单状态和系统通知"}
          </p>
          {activeFilter === "unread" && (
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => setActiveFilter("all")}
            >
              查看所有通知
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {groupedNotifications.map(({ group, items }) => (
            <div key={group}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                {group}
              </p>
              <div className="space-y-2">
                {items.map((n) => {
                  const config = typeConfig[n.type];
                  const Icon = config.icon;
                  return (
                    <div
                      key={n.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleNotificationClick(n)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleNotificationClick(n); }}
                      aria-label={`${n.isRead ? "" : "未读 - "}${n.title}`}
                      className={cn(
                        "group flex w-full items-start gap-3 rounded-[var(--radius-lg)] border p-4 text-left transition-all",
                        n.isRead
                          ? "border-[var(--border)] bg-transparent hover:bg-[var(--muted)]/50"
                          : "border-[var(--primary)]/20 bg-[var(--primary)]/5 hover:bg-[var(--primary)]/10",
                        selectedIds.has(n.id) && "ring-1 ring-[var(--primary)] border-[var(--primary)]/40",
                        n.href && "cursor-pointer"
                      )}
                    >
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleSelect(n.id); }}
                        className="mt-1 shrink-0 text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors"
                        aria-label={selectedIds.has(n.id) ? "取消选择" : "选择"}
                      >
                        {selectedIds.has(n.id) ? (
                          <CheckSquare className="h-4 w-4 text-[var(--primary)]" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </button>
                      <div
                        className={cn(
                          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                          config.bg
                        )}
                      >
                        <Icon className={cn("h-4 w-4", config.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-[var(--foreground)]">
                            {n.title}
                          </span>
                          {!n.isRead && (
                            <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--primary)]" />
                          )}
                          <Badge
                            variant="outline"
                            className="ml-auto shrink-0 text-[10px]"
                          >
                            {config.label}
                          </Badge>
                          <button
                            onClick={(e) => handleDelete(e, n.id)}
                            className="shrink-0 rounded p-1 text-[var(--muted-foreground)] opacity-0 transition-opacity hover:text-[var(--destructive)] group-hover:opacity-100"
                            aria-label="删除通知"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <p className="mt-1 text-sm text-[var(--muted-foreground)] line-clamp-2">
                          {n.content}
                        </p>
                        <span className="mt-1.5 block text-xs text-[var(--muted-foreground)]">
                          {timeAgo(n.createdAt)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
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

      <ConfirmDialog
        open={batchDeleteConfirm}
        onOpenChange={setBatchDeleteConfirm}
        title="批量删除通知"
        description={`确定要删除选中的 ${selectedIds.size} 条通知吗？此操作不可撤销。`}
        confirmLabel="删除"
        variant="destructive"
        isLoading={batchDeleting}
        onConfirm={handleBatchDelete}
      />
    </div>
  );
}
