"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ShoppingBag, Clock } from "lucide-react";
import { timeAgo } from "@/lib/utils";

interface ActivityItem {
  id: string;
  user: string;
  product: string;
  slug: string;
  time: string;
}

export default function LiveActivity() {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [visible, setVisible] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/activity", { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.activity?.length > 0) {
          setItems(data.activity);
        }
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
      });
    return () => controller.abort();
  }, []);

  // Rotate visible item every 4 seconds
  useEffect(() => {
    if (items.length <= 1) return;
    const interval = setInterval(() => {
      setVisible((prev) => (prev + 1) % items.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [items.length]);

  if (items.length === 0) return null;

  const current = items[visible];

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)]">
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-[var(--border)] bg-[var(--primary)]/5 px-4 py-2">
          <div className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--success)] opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--success)]" />
          </div>
          <span className="text-xs font-medium text-[var(--muted-foreground)]">
            实时动态
          </span>
        </div>

        {/* Rotating activity item */}
        <div className="relative h-12 overflow-hidden">
          <div
            key={current.id}
            className="absolute inset-0 flex items-center gap-3 px-4 animate-in fade-in slide-in-from-bottom-2 duration-500"
          >
            <ShoppingBag className="h-4 w-4 shrink-0 text-[var(--primary)]" />
            <p className="min-w-0 flex-1 truncate text-sm text-[var(--foreground)]">
              <span className="font-medium">{current.user}</span>
              {" "}购买了{" "}
              <Link
                href={`/products/${current.slug}`}
                className="font-medium text-[var(--primary)] hover:underline"
              >
                {current.product}
              </Link>
            </p>
            <span className="flex shrink-0 items-center gap-1 text-xs text-[var(--muted-foreground)]">
              <Clock className="h-3 w-3" />
              {timeAgo(current.time)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
