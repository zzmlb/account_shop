import { Suspense } from "react";
import type { Metadata } from "next";
import { db } from "@/server/db";
import { SITE_NAME, SITE_URL } from "@/lib/constants";
import ArticlesPageContent, { type ArticleItem } from "./articles-page-content";

export const revalidate = 120; // ISR: revalidate every 2 minutes

export const metadata: Metadata = {
  title: `帮助中心 - ${SITE_NAME}`,
  description: "浏览公告、教程和常见问题，快速找到您需要的帮助",
  openGraph: {
    title: `帮助中心 - ${SITE_NAME}`,
    description: "浏览公告、教程和常见问题，快速找到您需要的帮助",
    url: `${SITE_URL}/articles`,
    type: "website",
  },
  twitter: {
    card: "summary",
    title: `帮助中心 - ${SITE_NAME}`,
    description: "浏览公告、教程和常见问题，快速找到您需要的帮助",
  },
  alternates: { canonical: `${SITE_URL}/articles` },
};

export default async function ArticlesPage() {
  const dbArticles = await db.article.findMany({
    where: { isPublished: true },
    orderBy: { createdAt: "desc" },
  });

  const articles: ArticleItem[] = dbArticles.map((a) => ({
    id: a.id,
    title: a.title,
    slug: a.slug,
    excerpt: (() => {
      const text = a.content.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
      return text.length > 120 ? text.slice(0, 120) + "..." : text;
    })(),
    category: a.category,
    tags: a.tags,
    date: a.createdAt.toISOString().split("T")[0],
    readCount: a.viewCount,
  }));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `帮助中心 - ${SITE_NAME}`,
    description: "浏览公告、教程和常见问题，快速找到您需要的帮助",
    url: `${SITE_URL}/articles`,
    isPartOf: {
      "@type": "WebSite",
      name: SITE_NAME,
      url: SITE_URL,
    },
    numberOfItems: articles.length,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Suspense fallback={
        <div className="mx-auto max-w-4xl animate-pulse space-y-4 px-4 py-8">
          <div className="h-7 w-32 rounded bg-[var(--muted)]" />
          <div className="h-4 w-56 rounded bg-[var(--muted)]" />
          <div className="mt-6 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-[var(--radius-lg)] border border-[var(--border)] p-5 space-y-2">
                <div className="h-5 w-2/3 rounded bg-[var(--muted)]" />
                <div className="h-3 w-full rounded bg-[var(--muted)]" />
                <div className="h-3 w-1/3 rounded bg-[var(--muted)]" />
              </div>
            ))}
          </div>
        </div>
      }>
        <ArticlesPageContent articles={articles} />
      </Suspense>
    </>
  );
}
