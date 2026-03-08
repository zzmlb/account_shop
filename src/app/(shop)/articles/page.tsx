import { Suspense } from "react";
import { db } from "@/server/db";
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

  return (
    <Suspense>
      <ArticlesPageContent articles={articles} />
    </Suspense>
  );
}
