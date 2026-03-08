import { db } from "@/server/db";
import ArticlesPageContent, { type ArticleItem } from "./articles-page-content";

export const metadata = {
  title: "帮助中心 - PJ37 数字商品交易平台",
  description: "浏览公告、教程和常见问题，快速找到您需要的帮助",
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
    excerpt: a.content.length > 120 ? a.content.slice(0, 120) + "..." : a.content,
    category: a.category,
    date: a.createdAt.toISOString().split("T")[0],
    readCount: a.viewCount,
  }));

  return <ArticlesPageContent articles={articles} />;
}
