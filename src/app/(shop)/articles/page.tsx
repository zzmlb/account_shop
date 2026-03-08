import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { db } from "@/server/db";
import { SITE_NAME, SITE_URL } from "@/lib/constants";
import ArticlesPageContent, { type ArticleItem } from "./articles-page-content";

export const revalidate = 120; // ISR: revalidate every 2 minutes

export const metadata = {
  title: "帮助中心 - PJ37 数字商品交易平台",
  description: "浏览公告、教程和常见问题，快速找到您需要的帮助",
  openGraph: {
    title: "帮助中心 - PJ37 Digital",
    description: "浏览公告、教程和常见问题，快速找到您需要的帮助",
    type: "website" as const,
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
      <Suspense fallback={<div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" /></div>}>
        <ArticlesPageContent articles={articles} />
      </Suspense>
    </>
  );
}
