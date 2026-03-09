"use client";

import { useState, useEffect, useMemo } from "react";
import { Star, Quote } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api-fetch";

interface Testimonial {
  username: string;
  rating: number;
  content: string;
  product: string;
}

const FALLBACK_TESTIMONIALS: Testimonial[] = [
  {
    username: "张**",
    rating: 5,
    content: "购买后秒到账，卡密立刻就能使用，体验非常好！会继续回购。",
    product: "Netflix 会员",
  },
  {
    username: "李**",
    rating: 5,
    content: "价格比官方便宜不少，而且客服响应很快，有问题马上就帮解决了。",
    product: "Spotify Premium",
  },
  {
    username: "王**",
    rating: 5,
    content: "朋友推荐来的，第一次买就很顺利，操作简单，支付方便。",
    product: "ChatGPT Plus",
  },
  {
    username: "赵**",
    rating: 4,
    content: "用了好几次了，每次都是自动发货，稳定可靠，值得信赖的平台。",
    product: "Steam 充值卡",
  },
  {
    username: "陈**",
    rating: 5,
    content: "半夜购买也能秒发，24小时自动服务太方便了，完全不用等。",
    product: "Gmail 账号",
  },
  {
    username: "刘**",
    rating: 5,
    content: "退款申请很快就通过了，售后保障做得不错，放心购买。",
    product: "Office 365",
  },
];

export default function Testimonials() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>(FALLBACK_TESTIMONIALS);

  useEffect(() => {
    const controller = new AbortController();
    apiFetch<{ success: boolean; reviews?: Testimonial[] }>("/api/reviews/featured", { signal: controller.signal })
      .then((data) => {
        if (data.success && data.reviews?.length && data.reviews.length >= 3) {
          setTestimonials(data.reviews);
        }
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
      });
    return () => controller.abort();
  }, []);

  // Show 6 testimonials in 2 rows of 3
  const displayed = useMemo(() => testimonials.slice(0, 6), [testimonials]);

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
      <div className="mb-10 text-center">
        <h2 className="text-2xl font-bold text-[var(--foreground)] sm:text-3xl">
          用户好评
        </h2>
        <p className="mt-2 text-[var(--muted-foreground)]">
          来自真实用户的评价与反馈
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {displayed.map((t, i) => (
          <div
            key={i}
            className={cn(
              "relative rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-5",
              "transition-all duration-200 hover:border-[var(--primary)]/30 hover:shadow-lg hover:shadow-[var(--primary)]/5"
            )}
          >
            <Quote className="absolute right-4 top-4 h-5 w-5 text-[var(--primary)]/20" />

            {/* Stars */}
            <div className="mb-3 flex gap-0.5">
              {Array.from({ length: 5 }).map((_, s) => (
                <Star
                  key={s}
                  className={cn(
                    "h-4 w-4",
                    s < t.rating
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-[var(--muted-foreground)]/30"
                  )}
                />
              ))}
            </div>

            {/* Content */}
            <p className="mb-4 text-sm leading-relaxed text-[var(--muted-foreground)]">
              &ldquo;{t.content}&rdquo;
            </p>

            {/* Author */}
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--primary)]/10 text-xs font-bold text-[var(--primary)]">
                {t.username.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--foreground)]">
                  {t.username}
                </p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  购买了 {t.product}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
