"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Star,
  Search,
  Loader2,
  Eye,
  EyeOff,
  Trash2,
  Download,
  MessageSquare,
  Reply,
  CheckSquare,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import Pagination from "@/components/shared/pagination";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatDateTime } from "@/lib/utils";
import { exportToCsv } from "@/lib/csv-export";

/* ---------- types ---------- */

interface ReviewUser {
  id: string;
  username: string;
}

interface ReviewProduct {
  id: string;
  name: string;
  slug: string;
}

interface AdminReview {
  id: string;
  rating: number;
  content: string;
  adminReply: string | null;
  repliedAt: string | null;
  isVisible: boolean;
  createdAt: string;
  user: ReviewUser;
  product: ReviewProduct;
}

/* ---------- helpers ---------- */

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${
            i <= rating
              ? "fill-amber-400 text-amber-400"
              : "fill-transparent text-[var(--border)]"
          }`}
        />
      ))}
    </div>
  );
}

/* ---------- component ---------- */

export default function AdminReviewsContent() {
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [ratingFilter, setRatingFilter] = useState("");
  const [visibleFilter, setVisibleFilter] = useState("");
  const limit = 20;

  const [deleteTarget, setDeleteTarget] = useState<AdminReview | null>(null);
  const [replyTarget, setReplyTarget] = useState<AdminReview | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replySubmitting, setReplySubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Batch selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchLoading, setBatchLoading] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (ratingFilter) params.set("rating", ratingFilter);
      if (visibleFilter) params.set("visible", visibleFilter);

      const res = await fetch(`/api/admin/reviews?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setReviews(data.reviews);
        setTotal(data.total);
      } else {
        toast.error(data.message || "获取评价失败");
      }
    } catch {
      toast.error("网络错误");
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, ratingFilter, visibleFilter]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const handleToggleVisibility = async (review: AdminReview) => {
    setActionLoading(review.id);
    try {
      const res = await fetch(`/api/admin/reviews?id=${review.id}`, {
        method: "PUT",
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        setReviews((prev) =>
          prev.map((r) =>
            r.id === review.id ? { ...r, isVisible: data.isVisible } : r
          )
        );
      } else {
        toast.error(data.message);
      }
    } catch {
      toast.error("操作失败");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setActionLoading(deleteTarget.id);
    try {
      const res = await fetch(`/api/admin/reviews?id=${deleteTarget.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        toast.success("评价已删除");
        setDeleteTarget(null);
        fetchReviews();
      } else {
        toast.error(data.message);
      }
    } catch {
      toast.error("删除失败");
    } finally {
      setActionLoading(null);
    }
  };

  const openReplyDialog = (review: AdminReview) => {
    setReplyTarget(review);
    setReplyText(review.adminReply || "");
  };

  const handleReply = async () => {
    if (!replyTarget) return;
    setReplySubmitting(true);
    try {
      const res = await fetch("/api/admin/reviews", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: replyTarget.id, reply: replyText }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        setReviews((prev) =>
          prev.map((r) =>
            r.id === replyTarget.id
              ? { ...r, adminReply: data.adminReply, repliedAt: data.repliedAt }
              : r
          )
        );
        setReplyTarget(null);
        setReplyText("");
      } else {
        toast.error(data.message);
      }
    } catch {
      toast.error("操作失败");
    } finally {
      setReplySubmitting(false);
    }
  };

  // Clear selection when filters change
  useEffect(() => {
    setSelectedIds(new Set());
  }, [page, debouncedSearch, ratingFilter, visibleFilter]);

  const allSelected = reviews.length > 0 && reviews.every((r) => selectedIds.has(r.id));
  const toggleSelectAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(reviews.map((r) => r.id)));
  };
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBatchVisibility = async (visible: boolean) => {
    if (selectedIds.size === 0) return;
    setBatchLoading(true);
    try {
      const res = await fetch("/api/admin/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds), visible }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        setSelectedIds(new Set());
        fetchReviews();
      } else {
        toast.error(data.message || "操作失败");
      }
    } catch {
      toast.error("网络错误");
    } finally {
      setBatchLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">评价管理</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            管理用户商品评价，共 {total} 条
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() =>
            exportToCsv(
              `reviews-${new Date().toISOString().slice(0, 10)}`,
              [
                { header: "用户", accessor: (r: AdminReview) => r.user.username },
                { header: "商品", accessor: (r: AdminReview) => r.product.name },
                { header: "评分", accessor: (r: AdminReview) => r.rating },
                { header: "内容", accessor: (r: AdminReview) => r.content },
                { header: "可见", accessor: (r: AdminReview) => r.isVisible ? "是" : "否" },
                { header: "管理员回复", accessor: (r: AdminReview) => r.adminReply || "" },
                { header: "时间", accessor: (r: AdminReview) => formatDateTime(r.createdAt) },
              ],
              reviews
            )
          }
          disabled={reviews.length === 0}
        >
          <Download className="h-4 w-4" />
          导出
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <Input
            placeholder="搜索评价内容、用户名或商品..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={ratingFilter}
          onChange={(e) => {
            setRatingFilter(e.target.value);
            setPage(1);
          }}
          aria-label="按评分筛选"
          className="h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)]"
        >
          <option value="">全部评分</option>
          <option value="5">5星</option>
          <option value="4">4星</option>
          <option value="3">3星</option>
          <option value="2">2星</option>
          <option value="1">1星</option>
        </select>
        <select
          value={visibleFilter}
          onChange={(e) => {
            setVisibleFilter(e.target.value);
            setPage(1);
          }}
          aria-label="按可见状态筛选"
          className="h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)]"
        >
          <option value="">全部状态</option>
          <option value="true">已显示</option>
          <option value="false">已隐藏</option>
        </select>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--primary)]/30 bg-[var(--primary)]/5 px-4 py-3">
          <CheckSquare className="h-4 w-4 text-[var(--primary)]" />
          <span className="text-sm font-medium">已选择 {selectedIds.size} 条评价</span>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={() => handleBatchVisibility(true)}
              disabled={batchLoading}
            >
              {batchLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
              批量显示
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={() => handleBatchVisibility(false)}
              disabled={batchLoading}
            >
              {batchLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <EyeOff className="h-3.5 w-3.5" />}
              批量隐藏
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
              取消选择
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
        </div>
      ) : reviews.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] py-16 text-center">
          <MessageSquare className="mb-3 h-10 w-10 text-[var(--muted-foreground)]" />
          <p className="text-sm font-medium">暂无评价</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)]">
          <table className="w-full" aria-label="评价管理列表">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-xs font-medium text-[var(--muted-foreground)]">
                <th className="w-10 px-4 py-3">
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
                </th>
                <th className="px-4 py-3">用户</th>
                <th className="px-4 py-3">商品</th>
                <th className="px-4 py-3">评分</th>
                <th className="px-4 py-3 max-w-xs">内容</th>
                <th className="px-4 py-3">状态</th>
                <th className="px-4 py-3">时间</th>
                <th className="px-4 py-3 text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((review) => {
                const isSelected = selectedIds.has(review.id);
                return (
                <tr
                  key={review.id}
                  className={`border-b border-[var(--border)] last:border-0 transition-colors ${isSelected ? "bg-[var(--primary)]/5" : ""}`}
                >
                  <td className="w-10 px-4 py-3">
                    <button
                      type="button"
                      onClick={() => toggleSelect(review.id)}
                      className={`flex h-4 w-4 items-center justify-center rounded border transition-colors ${
                        isSelected
                          ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                          : "border-[var(--border)] hover:border-[var(--primary)]"
                      }`}
                    >
                      {isSelected && <CheckSquare className="h-3 w-3" />}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium">
                    {review.user.username}
                  </td>
                  <td className="px-4 py-3 text-sm text-[var(--muted-foreground)]">
                    <span className="line-clamp-1 max-w-[150px]">
                      {review.product.name}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Stars rating={review.rating} />
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <p className="line-clamp-2 max-w-xs text-[var(--card-foreground)]">
                      {review.content}
                    </p>
                    {review.adminReply && (
                      <p className="mt-1 line-clamp-1 max-w-xs text-xs text-[var(--primary)]">
                        ↳ 管理员回复: {review.adminReply}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={review.isVisible ? "success" : "secondary"}
                    >
                      {review.isVisible ? "显示" : "隐藏"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--muted-foreground)] whitespace-nowrap">
                    {formatDateTime(review.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openReplyDialog(review)}
                        disabled={actionLoading === review.id}
                        className={`flex h-10 w-10 sm:h-8 sm:w-8 items-center justify-center rounded-[var(--radius-md)] transition-colors hover:bg-[var(--primary)]/10 hover:text-[var(--primary)] ${
                          review.adminReply
                            ? "text-[var(--primary)]"
                            : "text-[var(--muted-foreground)]"
                        }`}
                        title={review.adminReply ? "编辑回复" : "回复"}
                      >
                        <Reply className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleToggleVisibility(review)}
                        disabled={actionLoading === review.id}
                        className="flex h-10 w-10 sm:h-8 sm:w-8 items-center justify-center rounded-[var(--radius-md)] text-[var(--muted-foreground)] transition-colors hover:bg-[var(--secondary)] hover:text-[var(--foreground)]"
                        title={review.isVisible ? "隐藏" : "显示"}
                      >
                        {review.isVisible ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        onClick={() => setDeleteTarget(review)}
                        disabled={actionLoading === review.id}
                        className="flex h-10 w-10 sm:h-8 sm:w-8 items-center justify-center rounded-[var(--radius-md)] text-[var(--muted-foreground)] transition-colors hover:bg-red-50 hover:text-[var(--destructive)] dark:hover:bg-red-950/30"
                        title="删除"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />

      {/* Delete confirmation dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除评价</DialogTitle>
            <DialogDescription>
              确定要删除 {deleteTarget?.user.username} 对「{deleteTarget?.product.name}」的评价吗？此操作不可恢复。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={!!actionLoading}
            >
              {actionLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reply dialog */}
      <Dialog
        open={!!replyTarget}
        onOpenChange={(open) => {
          if (!open) {
            setReplyTarget(null);
            setReplyText("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {replyTarget?.adminReply ? "编辑回复" : "回复评价"}
            </DialogTitle>
            <DialogDescription>
              回复 {replyTarget?.user.username} 对「{replyTarget?.product.name}」的评价（{replyTarget?.rating}星）
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-[var(--radius-md)] bg-[var(--secondary)] p-3 text-sm">
              <p className="text-[var(--card-foreground)]">{replyTarget?.content}</p>
            </div>
            <Textarea
              placeholder="输入管理员回复..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              rows={4}
            />
            <p className="text-xs text-[var(--muted-foreground)]">
              留空并保存可清除已有回复
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setReplyTarget(null);
                setReplyText("");
              }}
            >
              取消
            </Button>
            <Button onClick={handleReply} disabled={replySubmitting}>
              {replySubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              保存回复
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
