"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Star, Loader2, MessageSquare, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/* ---------- types ---------- */

interface ReviewItem {
  id: string;
  rating: number;
  content: string;
  username: string;
  avatar: string | null;
  createdAt: string;
}

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

  return (
    <div className="flex items-center gap-0.5">
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
          >
            <Star
              className={`${cls} ${
                filled
                  ? "fill-amber-400 text-amber-400"
                  : "fill-transparent text-[var(--border)]"
              } transition-colors`}
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

  // Review form
  const [showForm, setShowForm] = useState(false);
  const [formRating, setFormRating] = useState(5);
  const [formContent, setFormContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/reviews?productId=${productId}&page=${page}&pageSize=5`
      );
      const data = await res.json();
      if (data.success) {
        setReviews(data.reviews);
        setStats(data.stats);
        setTotalPages(data.pagination.totalPages);
      }
    } catch {
      toast.error("评价加载失败，请刷新重试");
    } finally {
      setLoading(false);
    }
  }, [productId, page]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const handleSubmit = async () => {
    if (!formContent.trim()) {
      toast.error("请输入评价内容");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          rating: formRating,
          content: formContent.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("评价提交成功");
        setFormContent("");
        setFormRating(5);
        setShowForm(false);
        setPage(1);
        fetchReviews();
      } else {
        toast.error(data.message || "提交失败");
      }
    } catch {
      toast.error("网络错误，请稍后重试");
    } finally {
      setSubmitting(false);
    }
  };

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

          {/* Rating distribution */}
          <div className="flex flex-1 flex-col justify-center gap-1.5">
            {[5, 4, 3, 2, 1].map((r) => (
              <div key={r} className="flex items-center gap-2 text-sm">
                <span className="w-8 text-right text-[var(--muted-foreground)]">
                  {r}星
                </span>
                <RatingBar
                  count={stats.ratingCounts[r] || 0}
                  total={stats.total}
                />
                <span className="w-8 text-xs text-[var(--muted-foreground)]">
                  {stats.ratingCounts[r] || 0}
                </span>
              </div>
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
            placeholder="分享您的使用体验..."
            maxLength={1000}
            rows={3}
            className="mb-3 w-full resize-none rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--muted-foreground)]">
              {formContent.length}/1000
            </span>
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

      {/* Reviews list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--primary)]" />
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
                  {review.avatar ? (
                    <Image
                      src={review.avatar}
                      alt={review.username}
                      width={32}
                      height={32}
                      className="rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--primary)]/10 text-sm font-bold text-[var(--primary)]">
                      {review.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <span className="text-sm font-medium text-[var(--foreground)]">
                      {review.username}
                    </span>
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
            </div>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                上一页
              </Button>
              <span className="px-3 text-sm text-[var(--muted-foreground)]">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                下一页
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
