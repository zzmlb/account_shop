"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Eye, Calendar } from "lucide-react";
import Breadcrumb from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { sanitizeHtml } from "@/lib/sanitize";

interface ArticleDetail {
  id: string;
  title: string;
  slug: string;
  category: string;
  date: string;
  readCount: number;
  content: string;
}

interface RelatedArticle {
  title: string;
  slug: string;
  category: string;
  date: string;
}

const categoryColorMap: Record<string, string> = {
  公告: "bg-[var(--destructive)]/10 text-[var(--destructive)]",
  教程: "bg-[var(--primary)]/10 text-[var(--primary)]",
  帮助: "bg-emerald-500/10 text-emerald-600",
};

interface Props {
  article: ArticleDetail;
  relatedArticles: RelatedArticle[];
}

export default function ArticleDetailContent({ article, relatedArticles }: Props) {
  const cleanContent = useMemo(() => sanitizeHtml(article.content), [article.content]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: "帮助中心", href: "/articles" },
          { label: article.title },
        ]}
        className="mb-6"
      />

      {/* Back button */}
      <Link href="/articles">
        <Button variant="ghost" size="sm" className="mb-6 -ml-2">
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回帮助中心
        </Button>
      </Link>

      {/* Article header */}
      <div className="mb-8">
        <Badge
          variant="secondary"
          className={`mb-4 ${categoryColorMap[article.category] || ""}`}
        >
          {article.category}
        </Badge>
        <h1 className="mb-4 text-3xl font-bold text-[var(--foreground)] sm:text-4xl">
          {article.title}
        </h1>
        <div className="flex items-center gap-4 text-sm text-[var(--muted-foreground)]">
          <span className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            {article.date}
          </span>
          <span className="flex items-center gap-1.5">
            <Eye className="h-4 w-4" />
            {article.readCount.toLocaleString()} 阅读
          </span>
        </div>
      </div>

      {/* Divider */}
      <div className="mb-8 h-px bg-[var(--border)]" />

      {/* Article content */}
      <div
        className="prose prose-neutral dark:prose-invert max-w-none
          prose-headings:text-[var(--foreground)] prose-headings:font-bold
          prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-4
          prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-3
          prose-p:text-[var(--card-foreground)] prose-p:leading-relaxed prose-p:mb-4
          prose-li:text-[var(--card-foreground)] prose-li:leading-relaxed
          prose-strong:text-[var(--foreground)]
          prose-code:bg-[var(--accent)] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-[var(--radius-sm)] prose-code:text-sm
          prose-ol:my-4 prose-ol:pl-6
          prose-ul:my-4 prose-ul:pl-6"
        dangerouslySetInnerHTML={{ __html: cleanContent }}
      />

      {/* Divider */}
      <div className="my-12 h-px bg-[var(--border)]" />

      {/* Related articles */}
      {relatedArticles.length > 0 && (
        <div>
          <h2 className="mb-6 text-xl font-bold text-[var(--foreground)]">
            相关文章
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {relatedArticles.map((related) => (
              <Link
                key={related.slug}
                href={`/articles/${related.slug}`}
                className="group rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-4 transition-all hover:border-[var(--primary)]/30 hover:shadow-md"
              >
                <Badge
                  variant="secondary"
                  className={`mb-2 text-xs ${categoryColorMap[related.category] || ""}`}
                >
                  {related.category}
                </Badge>
                <h3 className="text-sm font-semibold text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors line-clamp-2">
                  {related.title}
                </h3>
                <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                  {related.date}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Back to articles */}
      <div className="mt-12 text-center">
        <Link href="/articles">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回帮助中心
          </Button>
        </Link>
      </div>
    </div>
  );
}
