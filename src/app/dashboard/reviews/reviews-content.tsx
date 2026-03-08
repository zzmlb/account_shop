"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Star,
  MessageSquare,
  Package,
  Clock,
  EyeOff,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import EmptyState from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-fetch";

interface ReviewProduct {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  price: number;
}

interface MyReview {
  id: string;
  rating: number;
  content: string;
  isVisible: boolean;
  adminReply: string | null;
  repliedAt: string | null;
  createdAt: string;
  product: ReviewProduct;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            "h-3.5 w-3.5",
            star <= rating
              ? "fill-yellow-400 text-yellow-400"
              : "text-[var(--muted-foreground)]/30"
          )}
        />
      ))}
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function ReviewsContent() {
  const [reviews, setReviews] = useState<MyReview[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReviews = useCallback(async () => {
    try {
      const data = await apiFetch<{ reviews: MyReview[] }>("/api/reviews/my");
      setReviews(data.reviews);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "获取评价失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="space-y-1">
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-4 w-48" />
        </div>
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-[var(--radius-lg)]" />
        ))}
      </div>
    );
  }

  const avgRating =
    reviews.length > 0
      ? Math.round(
          (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10
        ) / 10
      : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-[var(--foreground)] sm:text-2xl">
          我的评价
        </h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          查看您提交的所有商品评价
        </p>
      </div>

      {/* Stats bar */}
      {reviews.length > 0 && (
        <div className="flex flex-wrap items-center gap-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] px-5 py-3">
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            <span className="text-sm font-medium text-[var(--foreground)]">
              平均 {avgRating} 分
            </span>
          </div>
          <div className="h-4 w-px bg-[var(--border)]" />
          <span className="text-sm text-[var(--muted-foreground)]">
            共 {reviews.length} 条评价
          </span>
          <div className="h-4 w-px bg-[var(--border)]" />
          <span className="text-sm text-[var(--muted-foreground)]">
            {reviews.filter((r) => r.adminReply).length} 条已回复
          </span>
        </div>
      )}

      {/* Review list */}
      {reviews.length === 0 ? (
        <div className="py-8">
          <EmptyState
            icon={Star}
            title="暂无评价"
            description="购买商品后即可发表评价"
          />
          <div className="mt-4 text-center">
            <Link
              href="/products"
              className="inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] hover:opacity-90 transition-opacity"
            >
              <Package className="h-4 w-4" />
              浏览商品
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-4 transition-colors hover:border-[var(--border)]/80"
            >
              {/* Product info + rating */}
              <div className="flex items-start gap-3">
                {/* Product image */}
                <Link
                  href={`/products/${review.product.slug}`}
                  className="shrink-0"
                >
                  <div className="relative h-14 w-14 overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--muted)]">
                    {review.product.image ? (
                      <Image
                        src={review.product.image}
                        alt={review.product.name}
                        fill
                        className="object-cover"
                        sizes="56px"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Package className="h-6 w-6 text-[var(--muted-foreground)]/40" />
                      </div>
                    )}
                  </div>
                </Link>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link
                        href={`/products/${review.product.slug}`}
                        className="text-sm font-medium text-[var(--foreground)] hover:text-[var(--primary)] transition-colors line-clamp-1"
                      >
                        {review.product.name}
                      </Link>
                      <div className="mt-1 flex items-center gap-2">
                        <StarRating rating={review.rating} />
                        <span className="text-xs text-[var(--muted-foreground)]">
                          {review.rating}.0
                        </span>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {!review.isVisible && (
                        <Badge variant="secondary" className="text-[10px]">
                          <EyeOff className="mr-1 h-3 w-3" />
                          已隐藏
                        </Badge>
                      )}
                      <span className="flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
                        <Clock className="h-3 w-3" />
                        {formatDate(review.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Review content */}
                  <p className="mt-2 text-sm leading-relaxed text-[var(--foreground)]">
                    {review.content}
                  </p>

                  {/* Admin reply */}
                  {review.adminReply && (
                    <div className="mt-3 rounded-[var(--radius-md)] bg-[var(--muted)] px-3 py-2.5">
                      <div className="mb-1 flex items-center gap-1.5">
                        <MessageSquare className="h-3 w-3 text-[var(--primary)]" />
                        <span className="text-xs font-medium text-[var(--primary)]">
                          商家回复
                        </span>
                        {review.repliedAt && (
                          <span className="text-[10px] text-[var(--muted-foreground)]">
                            {formatDate(review.repliedAt)}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-[var(--muted-foreground)]">
                        {review.adminReply}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
