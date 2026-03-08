"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, ChevronRight, Eye, Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  category: "公告" | "教程" | "帮助";
  date: string;
  readCount: number;
}

const MOCK_ARTICLES: Article[] = [
  {
    id: "art_001",
    title: "Gmail账号使用教程",
    slug: "gmail-account-tutorial",
    excerpt:
      "详细介绍如何安全登录和使用购买的Gmail账号，包括修改密码、绑定手机号、开启两步验证等操作步骤。",
    category: "教程",
    date: "2026-03-05",
    readCount: 3842,
  },
  {
    id: "art_002",
    title: "平台公告：2026年3月促销活动",
    slug: "march-2026-promotion",
    excerpt:
      "即日起至3月31日，全场邮箱类商品享8折优惠，VPN服务类商品满100减20，活动期间下单还可获得积分双倍奖励。",
    category: "公告",
    date: "2026-03-01",
    readCount: 5621,
  },
  {
    id: "art_003",
    title: "如何使用加密货币支付",
    slug: "crypto-payment-guide",
    excerpt:
      "本教程将指导您如何使用 USDT、BTC 等主流加密货币在平台上完成支付，享受更低的手续费和更快的到账速度。",
    category: "教程",
    date: "2026-02-28",
    readCount: 2156,
  },
  {
    id: "art_004",
    title: "售后服务与退款政策",
    slug: "refund-policy",
    excerpt:
      "了解平台的售后保障政策，包括商品质量问题的处理流程、退款时效、以及如何联系客服获取帮助。",
    category: "帮助",
    date: "2026-02-25",
    readCount: 4310,
  },
  {
    id: "art_005",
    title: "账号安全使用指南",
    slug: "account-security-guide",
    excerpt:
      "保护您购买的数字商品账号安全的最佳实践，包括使用独立密码、开启二次验证、避免异地登录等注意事项。",
    category: "教程",
    date: "2026-02-20",
    readCount: 3105,
  },
  {
    id: "art_006",
    title: "平台升级公告 - 新增余额支付功能",
    slug: "balance-payment-launch",
    excerpt:
      "平台现已支持余额充值和余额支付功能，充值满200送10，满500送30，让您的购物体验更加便捷。",
    category: "公告",
    date: "2026-02-15",
    readCount: 2876,
  },
  {
    id: "art_007",
    title: "订单查询与物流追踪",
    slug: "order-tracking-help",
    excerpt:
      "如何查看您的订单状态、获取商品卡密信息、以及在遇到发货延迟时该如何处理的详细指南。",
    category: "帮助",
    date: "2026-02-10",
    readCount: 1987,
  },
  {
    id: "art_008",
    title: "新用户注册与首单优惠",
    slug: "new-user-guide",
    excerpt:
      "欢迎来到 PJ37！本指南将帮助您快速完成注册、了解平台功能，并领取新用户专属的首单立减优惠券。",
    category: "帮助",
    date: "2026-02-05",
    readCount: 6543,
  },
];

const CATEGORIES = ["全部", "公告", "教程", "帮助"] as const;

const categoryColorMap: Record<string, string> = {
  公告: "bg-[var(--destructive)]/10 text-[var(--destructive)]",
  教程: "bg-[var(--primary)]/10 text-[var(--primary)]",
  帮助: "bg-emerald-500/10 text-emerald-600",
};

export default function ArticlesPage() {
  const [activeCategory, setActiveCategory] = useState<string>("全部");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredArticles = useMemo(() => {
    let result = [...MOCK_ARTICLES];

    if (activeCategory !== "全部") {
      result = result.filter((a) => a.category === activeCategory);
    }

    if (searchQuery.trim()) {
      const keyword = searchQuery.toLowerCase();
      result = result.filter(
        (a) =>
          a.title.toLowerCase().includes(keyword) ||
          a.excerpt.toLowerCase().includes(keyword)
      );
    }

    return result;
  }, [activeCategory, searchQuery]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-[var(--foreground)] sm:text-4xl">
          帮助中心
        </h1>
        <p className="mt-3 text-[var(--muted-foreground)]">
          浏览公告、教程和常见问题，快速找到您需要的帮助
        </p>
      </div>

      {/* Search bar */}
      <div className="mx-auto mb-8 max-w-xl">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <Input
            type="text"
            placeholder="搜索文章..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Category filter tabs */}
      <div className="mb-8 flex flex-wrap items-center justify-center gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`rounded-full px-5 py-2 text-sm font-medium transition-all ${
              activeCategory === cat
                ? "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-sm"
                : "bg-[var(--card)] text-[var(--muted-foreground)] border border-[var(--border)] hover:text-[var(--foreground)] hover:border-[var(--foreground)]/20"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Articles grid */}
      {filteredArticles.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-lg text-[var(--muted-foreground)]">
            没有找到相关文章
          </p>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            尝试使用其他关键词搜索
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {filteredArticles.map((article) => (
            <Link
              key={article.id}
              href={`/articles/${article.slug}`}
              className="group rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-6 transition-all hover:border-[var(--primary)]/30 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* Category badge */}
                  <Badge
                    variant="secondary"
                    className={`mb-3 ${categoryColorMap[article.category] || ""}`}
                  >
                    {article.category}
                  </Badge>

                  {/* Title */}
                  <h2 className="mb-2 text-lg font-semibold text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors line-clamp-2">
                    {article.title}
                  </h2>

                  {/* Excerpt */}
                  <p className="mb-4 text-sm leading-relaxed text-[var(--muted-foreground)] line-clamp-2">
                    {article.excerpt}
                  </p>

                  {/* Meta info */}
                  <div className="flex items-center gap-4 text-xs text-[var(--muted-foreground)]">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {article.date}
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="h-3.5 w-3.5" />
                      {article.readCount.toLocaleString()} 阅读
                    </span>
                  </div>
                </div>

                {/* Arrow */}
                <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-[var(--muted-foreground)] transition-transform group-hover:translate-x-1 group-hover:text-[var(--primary)]" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
