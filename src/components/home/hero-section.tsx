"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { Search } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface StatsData {
  products: string;
  users: string;
  orders: string;
}

// Pre-generated particle positions to avoid hydration mismatch from Math.random() in render
const PARTICLES = Array.from({ length: 20 }, (_, i) => ({
  width: (((i * 7 + 3) % 11) / 11) * 4 + 2,
  left: ((i * 37 + 13) % 100),
  top: ((i * 53 + 7) % 100),
  opacity: (((i * 17 + 5) % 10) / 10) * 0.6 + 0.2,
  duration: (((i * 11 + 2) % 6) + 4),
  delay: ((i * 23 + 1) % 4),
  colorType: i % 3,
}));

export default function HeroSection() {
  const [query, setQuery] = useState("");
  const router = useRouter();
  const [stats, setStats] = useState<StatsData | null>(null);

  useEffect(() => {
    let cancelled = false;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);

    const load = async (attempt = 0) => {
      try {
        const res = await fetch("/api/stats", { signal: ctrl.signal });
        const data = await res.json();
        if (!cancelled && data.success) setStats(data.stats);
      } catch {
        if (!cancelled && attempt < 1) {
          // retry once after 2s
          setTimeout(() => load(attempt + 1), 2000);
        }
      }
    };

    load();
    return () => { cancelled = true; clearTimeout(timer); ctrl.abort(); };
  }, []);

  const displayStats = [
    { value: stats?.products, label: "精选商品" },
    { value: stats?.users, label: "注册用户" },
    { value: stats?.orders, label: "成功交易" },
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/products?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <section className="relative overflow-hidden">
      {/* Background gradient */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(135deg, #1a0a2e 0%, #0a0a0f 50%, #0a0f1a 100%)",
        }}
      />

      {/* Floating particles (pre-generated to avoid hydration mismatch) */}
      <div className="absolute inset-0 overflow-hidden">
        {PARTICLES.map((p, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: `${p.width}px`,
              height: `${p.width}px`,
              left: `${p.left}%`,
              top: `${p.top}%`,
              background:
                p.colorType === 0
                  ? "var(--primary)"
                  : p.colorType === 1
                    ? "var(--accent)"
                    : "rgba(255,255,255,0.3)",
              opacity: p.opacity,
              animation: `float-particle ${p.duration}s ease-in-out infinite`,
              animationDelay: `${p.delay}s`,
            }}
          />
        ))}
      </div>

      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage:
            "linear-gradient(rgba(108,92,231,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(108,92,231,0.3) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Content */}
      <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-24 sm:px-6 sm:pb-28 sm:pt-32 lg:px-8 lg:pb-32 lg:pt-40">
        <div className="flex flex-col items-center text-center">
          {/* Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="max-w-4xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl"
            style={{
              background:
                "linear-gradient(135deg, #ffffff 0%, #6c5ce7 50%, #00d2ff 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            安全可靠的数字商品交易平台
          </motion.h1>

          {/* Subheading */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15, ease: "easeOut" }}
            className="mt-6 max-w-2xl text-lg text-[var(--muted-foreground)] sm:text-xl"
          >
            即时交付 &middot; 品质保障 &middot; 全天候服务
          </motion.p>

          {/* Search bar */}
          <motion.form
            onSubmit={handleSearch}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3, ease: "easeOut" }}
            className="mt-10 flex w-full max-w-xl items-center"
          >
            <div className="relative w-full">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--muted-foreground)]" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜索商品..."
                aria-label="搜索商品"
                className={cn(
                  "h-12 w-full rounded-full border border-[var(--border)] bg-[var(--card)]/80 pl-12 pr-28 text-sm text-[var(--foreground)] backdrop-blur-sm",
                  "placeholder:text-[var(--muted-foreground)]",
                  "focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent",
                  "transition-all duration-200"
                )}
              />
              <button
                type="submit"
                className={cn(
                  "absolute right-1.5 top-1/2 -translate-y-1/2",
                  "h-9 rounded-full bg-[var(--primary)] px-5 text-sm font-medium text-[var(--primary-foreground)]",
                  "hover:bg-[var(--primary-hover)] transition-colors duration-200"
                )}
              >
                搜索
              </button>
            </div>
          </motion.form>

          {/* CTA buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.45, ease: "easeOut" }}
            className="mt-8 flex flex-wrap items-center justify-center gap-4"
          >
            <Button asChild size="lg" className="rounded-full px-8">
              <Link href="/products">浏览商品</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="rounded-full px-8"
            >
              <Link href="/articles">了解更多</Link>
            </Button>
          </motion.div>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.6, ease: "easeOut" }}
            role="group"
            aria-label="平台统计数据"
            className="mt-16 flex items-center gap-8 sm:gap-16"
          >
            {displayStats.map((stat, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                {stat.value != null ? (
                  <span
                    className="text-2xl font-bold sm:text-3xl"
                    style={{
                      background:
                        "linear-gradient(135deg, var(--primary), var(--accent))",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                    }}
                  >
                    {stat.value}
                  </span>
                ) : (
                  <div className="h-8 w-16 animate-pulse rounded bg-[var(--muted)] sm:h-9" />
                )}
                <span className="text-sm text-[var(--muted-foreground)]">
                  {stat.label}
                </span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Particle animation keyframes */}
      <style jsx>{`
        @keyframes float-particle {
          0%,
          100% {
            transform: translateY(0) translateX(0);
          }
          25% {
            transform: translateY(-20px) translateX(10px);
          }
          50% {
            transform: translateY(-10px) translateX(-10px);
          }
          75% {
            transform: translateY(-30px) translateX(5px);
          }
        }
      `}</style>
    </section>
  );
}
