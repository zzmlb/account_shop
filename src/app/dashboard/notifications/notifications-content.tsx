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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = now - date;

  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes}分钟前`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}天前`;

  return new Date(dateStr).toLocaleDateString("zh-CN");
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
  const [markingAll, setMarkingAll] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"all" | "unread">("all");

  const fetchNotifications = useCallback(
    async (page: number, filter: "all" | "unread") => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("pageSize", "20");
        if (filter === "unread") params.set("unread", "true");

        const res = await fetch(`/api/notifications?${params.toString()}`);
        const data = await res.json();
        if (data.success) {
          setNotifications(data.notifications);
          setPagination(data.pagination);
          setUnreadCount(data.unreadCount);
        } else {
          toast.error("获取通知列表失败");
        }
      } catch {
        toast.error("网络错误，获取通知列表失败");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchNotifications(pagination.page, activeFilter);
  }, [pagination.page, activeFilter, fetchNotifications]);

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      const res = await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      const data = await res.json();
      if (data.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
        toast.success("已全部标记为已读");
      } else {
        toast.error("操作失败");
      }
    } catch {
      toast.error("网络错误，操作失败");
    } finally {
      setMarkingAll(false);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read if unread
    if (!notification.isRead) {
      fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [notification.id] }),
      }).catch(() => {});

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

      {/* Filter tabs */}
      <div className="flex gap-2">
        <button
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

      {/* Notification list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--muted-foreground)]" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--muted)]">
            <Inbox className="h-8 w-8 text-[var(--muted-foreground)]" />
          </div>
          <p className="mt-4 text-sm text-[var(--muted-foreground)]">
            {activeFilter === "unread" ? "没有未读通知" : "暂无通知"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const config = typeConfig[n.type];
            const Icon = config.icon;
            return (
              <button
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                className={cn(
                  "flex w-full items-start gap-3 rounded-[var(--radius-lg)] border p-4 text-left transition-all",
                  n.isRead
                    ? "border-[var(--border)] bg-transparent hover:bg-[var(--muted)]/50"
                    : "border-[var(--primary)]/20 bg-[var(--primary)]/5 hover:bg-[var(--primary)]/10",
                  n.href && "cursor-pointer"
                )}
              >
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
                    <span
                      className={cn(
                        "text-sm font-medium",
                        n.isRead
                          ? "text-[var(--foreground)]"
                          : "text-[var(--foreground)]"
                      )}
                    >
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
                  </div>
                  <p className="mt-1 text-sm text-[var(--muted-foreground)] line-clamp-2">
                    {n.content}
                  </p>
                  <span className="mt-1.5 block text-xs text-[var(--muted-foreground)]">
                    {timeAgo(n.createdAt)}
                  </span>
                </div>
              </button>
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
    </div>
  );
}
