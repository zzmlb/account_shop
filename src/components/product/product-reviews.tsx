"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Star, Loader2, MessageSquare, Send, ArrowUpDown, Shield, BadgeCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Pagination from "@/components/shared/pagination";
import { apiFetch, apiMutate } from "@/lib/api-fetch";

/* ---------- types ---------- */

interface ReviewItem {
  id: string;
  rating: number;
  content: string;
  username: string;
  avatar: string | null;
  adminReply: string | null;
  repliedAt: string | null;
  createdAt: string;
}

type SortOption = "newest" | "oldest" | "rating-high" | "rating-low";

interface ReviewStats {
  avgRating: number;
  total: number;
  ratingCounts: Record<number, number>;
}

interface ProductReviewsProps {
  productId: string;
}

/* ---------- helpers ---------- */

function Stars({
  rating,
  size = "sm",
  interactive = false,
  onRate,
}: {
  rating: number;
  size?: "sm" | "md";
  interactive?: boolean;
  onRate?: (r: number) => void;
}) {
  const [hovered, setHovered] = useState(0);
  const cls = size === "md" ? "h-5 w-5" : "h-4 w-4";

  const handleKeyDown = (e: React.KeyboardEvent, current: number) => {
    if (!interactive || !onRate) return;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      onRate(Math.min(5, current + 1));
    } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      onRate(Math.max(1, current - 1));
    }
  };

  return (
    <div
      className="flex items-center gap-0.5"
      {...(interactive ? { role: "radiogroup", "aria-label": "评价等级" } : { "aria-label": `${rating}星评价` })}
    >
      {[1, 2, 3, 4, 5].map((i) => {
        const filled = interactive ? i <= (hovered || rating) : i <= rating;
        return (
          <button
            key={i}
            type="button"
            disabled={!interactive}
            className={interactive ? "cursor-pointer" : "cursor-default"}
            onClick={() => onRate?.(i)}
            onMouseEnter={() => interactive && setHovered(i)}
            onMouseLeave={() => interactive && setHovered(0)}
            onKeyDown={(e) => handleKeyDown(e, i)}
            {...(interactive
              ? { role: "radio", "aria-checked": rating === i, "aria-label": `${i}星` }
              : { "aria-hidden": true, tabIndex: -1 })}
          >
            <Star
              className={cn(
                cls,
                "transition-colors",
                filled
                  ? "fill-amber-400 text-amber-400"
                  : "fill-transparent text-[var(--border)]"
              )}
            />
          </button>
        );
      })}
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function RatingBar({ count, total }: { count: number; total: number }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--muted)]">
      <div
        className="h-full rounded-full bg-amber-400 transition-all"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/* ---------- component ---------- */

export default function ProductReviews({ productId }: ProductReviewsProps) {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalReviews, setTotalReviews] = useState(0);
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("newest");

  // Avatar error tracking
  const [failedAvatars, setFailedAvatars] = useState<Set<string>>(new Set());

  // Review form
  const [showForm, setShowForm] = useState(false);
  const [formRating, setFormRating] = useState(5);
  const [formContent, setFormContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        productId,
        page: String(page),
        pageSize: "5",
      });
      if (ratingFilter) params.set("rating", String(ratingFilter));
      if (sortBy !== "newest") params.set("sort", sortBy);
      const data = await apiFetch<{ reviews: ReviewItem[]; stats: ReviewStats; pagination: { totalPages: number; total?: number } }>(`/api/reviews?${params}`);
      setReviews(data.reviews);
      setStats(data.stats);
      setTotalPages(data.pagination.totalPages);
      setTotalReviews(data.pagination.total ?? 0);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "评价加载失败，请刷新重试");
    } finally {
      setLoading(false);
    }
  }, [productId, page, ratingFilter, sortBy]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const handleSubmit = useCallback(async () => {
    if (!formContent.trim()) {
      toast.error("请输入评价内容");
      return;
    }
    setSubmitting(true);
    try {
      await apiMutate("/api/reviews", "POST", {
        productId,
        rating: formRating,
        content: formContent.trim(),
      });
      toast.success("评价提交成功");
      setFormContent("");
      setFormRating(5);
      setShowForm(false);
      setPage(1);
      fetchReviews();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "网络错误，请稍后重试");
    } finally {
      setSubmitting(false);
    }
  }, [formContent, formRating, productId, fetchReviews]);

  return (
    <div className="mt-12">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold text-[var(--foreground)]">
          用户评价
          {stats && stats.total > 0 && (
            <span className="ml-2 text-base font-normal text-[var(--muted-foreground)]">
              ({stats.total})
            </span>
          )}
        </h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowForm(!showForm)}
        >
          <MessageSquare className="mr-2 h-4 w-4" />
          写评价
        </Button>
      </div>

      {/* Rating summary */}
      {stats && stats.total > 0 && (
        <div className="mb-6 flex gap-8 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-6">
          {/* Average rating */}
          <div className="flex flex-col items-center justify-center">
            <div className="text-4xl font-bold text-[var(--foreground)]">
              {stats.avgRating}
            </div>
            <Stars rating={Math.round(stats.avgRating)} size="md" />
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              {stats.total} 条评价
            </p>
          </div>

          {/* Rating distribution (clickable to filter) */}
          <div className="flex flex-1 flex-col justify-center gap-1.5">
            {[5, 4, 3, 2, 1].map((r) => (
              <button
                key={r}
                type="button"
                className={cn(
                  "flex items-center gap-2 rounded-[var(--radius-sm)] px-1 py-0.5 text-sm transition-colors hover:bg-[var(--muted)]",
                  ratingFilter === r && "bg-[var(--primary)]/10"
                )}
                onClick={() => {
                  setRatingFilter(ratingFilter === r ? null : r);
                  setPage(1);
                }}
                aria-label={`筛选${r}星评价`}
                aria-pressed={ratingFilter === r}
              >
                <span className={cn("w-8 text-right", ratingFilter === r ? "font-semibold text-[var(--primary)]" : "text-[var(--muted-foreground)]")}>
                  {r}星
                </span>
                <RatingBar
                  count={stats.ratingCounts[r] || 0}
                  total={stats.total}
                />
                <span className={cn("w-8 text-xs", ratingFilter === r ? "font-semibold text-[var(--primary)]" : "text-[var(--muted-foreground)]")}>
                  {stats.ratingCounts[r] || 0}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Review form */}
      {showForm && (
        <div className="mb-6 rounded-[var(--radius-lg)] border border-[var(--primary)]/20 bg-[var(--primary)]/5 p-5">
          <h3 className="mb-3 text-sm font-semibold text-[var(--foreground)]">
            发表评价
          </h3>
          <div className="mb-3 flex items-center gap-3">
            <span className="text-sm text-[var(--muted-foreground)]">评分:</span>
            <Stars
              rating={formRating}
              size="md"
              interactive
              onRate={setFormRating}
            />
            <span className="text-sm font-medium text-amber-500">
              {formRating}星
            </span>
          </div>
          <textarea
            value={formContent}
            onChange={(e) => setFormContent(e.target.value)}
            placeholder="分享您的使用体验（至少5个字符）..."
            minLength={5}
            maxLength={1000}
            rows={3}
            disabled={submitting}
            aria-label="评价内容"
            className="mb-3 w-full resize-none rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] disabled:opacity-50"
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xs text-[var(--muted-foreground)]">
                {formContent.length}/1000
              </span>
              <span className="text-xs text-[var(--muted-foreground)]">
                提交后需审核才会显示
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowForm(false)}
              >
                取消
              </Button>
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={submitting || !formContent.trim()}
              >
                {submitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                提交评价
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Sort & active filter */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
          {ratingFilter && (
            <>
              <span>筛选: {ratingFilter}星评价</span>
              <button
                type="button"
                onClick={() => { setRatingFilter(null); setPage(1); }}
                className="text-[var(--primary)] hover:underline"
              >
                清除筛选
              </button>
            </>
          )}
        </div>
        <div className="flex items-center gap-1">
          <ArrowUpDown className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
          {([
            { value: "newest" as const, label: "最新" },
            { value: "oldest" as const, label: "最早" },
            { value: "rating-high" as const, label: "好评优先" },
            { value: "rating-low" as const, label: "差评优先" },
          ]).map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setSortBy(opt.value); setPage(1); }}
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
                sortBy === opt.value
                  ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                  : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Reviews list */}
      {loading ? (
        <div className="space-y-4" aria-busy="true">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-5">
              <div className="mb-3 flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-[var(--muted)]" />
                <div className="space-y-1.5">
                  <div className="h-3 w-20 rounded bg-[var(--muted)]" />
                  <div className="h-3 w-24 rounded bg-[var(--muted)]" />
                </div>
              </div>
              <div className="h-3 w-full rounded bg-[var(--muted)]" />
              <div className="mt-1.5 h-3 w-2/3 rounded bg-[var(--muted)]" />
            </div>
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] py-12 text-center">
          <MessageSquare className="mb-3 h-10 w-10 text-[var(--muted-foreground)]" />
          <p className="text-sm font-medium text-[var(--foreground)]">
            暂无评价
          </p>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            购买后即可评价
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-5"
            >
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {review.avatar && !failedAvatars.has(review.id) ? (
                    <Image
                      src={review.avatar}
                      alt={review.username}
                      width={32}
                      height={32}
                      className="rounded-full object-cover"
                      onError={() =>
                        setFailedAvatars((prev) => new Set(prev).add(review.id))
                      }
                    />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--primary)]/10 text-sm font-bold text-[var(--primary)]">
                      {review.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-[var(--foreground)]">
                        {review.username}
                      </span>
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-green-600">
                        <BadgeCheck className="h-3 w-3" />
                        已购买
                      </span>
                    </div>
                    <Stars rating={review.rating} size="sm" />
                  </div>
                </div>
                <span className="text-xs text-[var(--muted-foreground)]">
                  {formatDate(review.createdAt)}
                </span>
              </div>
              <p className="whitespace-pre-line text-sm leading-relaxed text-[var(--card-foreground)]">
                {review.content}
              </p>
              {review.adminReply && (
                <div className="mt-3 rounded-[var(--radius-md)] border border-[var(--primary)]/20 bg-[var(--primary)]/5 p-3">
                  <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-[var(--primary)]">
                    <Shield className="h-3 w-3" />
                    商家回复
                    {review.repliedAt && (
                      <span className="ml-auto text-[var(--muted-foreground)]">
                        {formatDate(review.repliedAt)}
                      </span>
                    )}
                  </div>
                  <p className="whitespace-pre-line text-sm text-[var(--muted-foreground)]">
                    {review.adminReply}
                  </p>
                </div>
              )}
            </div>
          ))}

          {/* Pagination */}
          <Pagination
            page={page}
            totalPages={totalPages}
            total={totalReviews}
            onPageChange={setPage}
            totalLabel="条评价"
          />
        </div>
      )}
    </div>
  );
}
