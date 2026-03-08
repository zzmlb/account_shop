"use client";

import { useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Search, ChevronRight, Eye, Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import AnimatedSection from "@/components/shared/animated-section";

export interface ArticleItem {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  tags?: string[];
  date: string;
  readCount: number;
}

interface ArticlesPageContentProps {
  articles: ArticleItem[];
}

const CATEGORIES = ["全部", "公告", "教程", "帮助"] as const;

const TAG_TO_CATEGORY: Record<string, string> = {
  faq: "帮助",
  guide: "教程",
  announcement: "公告",
  "after-sale": "帮助",
};

const categoryColorMap: Record<string, string> = {
  公告: "bg-[var(--destructive)]/10 text-[var(--destructive)]",
  教程: "bg-[var(--primary)]/10 text-[var(--primary)]",
  帮助: "bg-emerald-500/10 text-emerald-600",
};

export default function ArticlesPageContent({
  articles,
}: ArticlesPageContentProps) {
  const searchParams = useSearchParams();
  const tagParam = searchParams.get("tag");

  // Map tag param to initial category
  const initialCategory = tagParam
    ? TAG_TO_CATEGORY[tagParam] || "全部"
    : "全部";

  const [activeCategory, setActiveCategory] = useState<string>(initialCategory);
  const [activeTag] = useState<string | null>(tagParam);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredArticles = useMemo(() => {
    let result = [...articles];

    if (activeCategory !== "全部") {
      result = result.filter((a) => a.category === activeCategory);
    }

    // If tag param is set and doesn't map to a category, filter by tag directly
    if (activeTag && !TAG_TO_CATEGORY[activeTag]) {
      result = result.filter((a) => a.tags?.includes(activeTag));
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
  }, [articles, activeCategory, activeTag, searchQuery]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <AnimatedSection className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-[var(--foreground)] sm:text-4xl">
          帮助中心
        </h1>
        <p className="mt-3 text-[var(--muted-foreground)]">
          浏览公告、教程和常见问题，快速找到您需要的帮助
        </p>
      </AnimatedSection>

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
          {filteredArticles.map((article, index) => (
            <AnimatedSection key={article.id} delay={index * 0.1}>
              <Link
                href={`/articles/${article.slug}`}
                className="group block rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-6 transition-all hover:border-[var(--primary)]/30 hover:shadow-md"
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
            </AnimatedSection>
          ))}
        </div>
      )}
    </div>
  );
}
