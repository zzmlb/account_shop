import { db } from "@/server/db";
import { notFound } from "next/navigation";
import ArticleDetailContent from "./article-detail-content";
import type { Metadata } from "next";
import { SITE_NAME, SITE_URL } from "@/lib/constants";

export const revalidate = 120; // ISR: revalidate every 2 minutes

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const articles = await db.article.findMany({
    where: { isPublished: true },
    select: { slug: true },
    take: 50,
  });
  return articles.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = await db.article.findUnique({
    where: { slug },
    select: { title: true, content: true, category: true },
  });

  if (!article) {
    return { title: "文章未找到" };
  }

  const excerpt = article.content.length > 160
    ? article.content.replace(/<[^>]*>/g, "").slice(0, 160) + "..."
    : article.content.replace(/<[^>]*>/g, "");

  const articleUrl = `${SITE_URL}/articles/${slug}`;
  const ogImageMatch = article.content.match(/<img[^>]+src=["']([^"']+)["']/);
  const ogImage = ogImageMatch ? ogImageMatch[1] : undefined;

  return {
    title: article.title,
    description: excerpt,
    openGraph: {
      title: article.title,
      description: excerpt,
      url: articleUrl,
      type: "article",
      siteName: SITE_NAME,
      ...(ogImage && { images: [{ url: ogImage }] }),
    },
    twitter: {
      card: ogImage ? "summary_large_image" : "summary",
      title: article.title,
      description: excerpt,
      ...(ogImage && { images: [ogImage] }),
    },
    alternates: { canonical: articleUrl },
  };
}

export default async function ArticleDetailPage({ params }: Props) {
  const { slug } = await params;

  const article = await db.article.findUnique({
    where: { slug, isPublished: true },
  });

  if (!article) {
    notFound();
  }

  // Increment view count (fire-and-forget)
  db.article.update({
    where: { id: article.id },
    data: { viewCount: { increment: 1 } },
  }).catch(() => {
    // View count increment is non-critical, silently ignore
  });

  // Fetch related articles (same category, different slug)
  const related = await db.article.findMany({
    where: {
      isPublished: true,
      category: article.category,
      slug: { not: slug },
    },
    orderBy: { viewCount: "desc" },
    take: 3,
    select: {
      title: true,
      slug: true,
      category: true,
      createdAt: true,
    },
  });

  // Extract description and first image for structured data / social sharing
  const plainText = article.content.replace(/<[^>]*>/g, "");
  const articleDescription = plainText.length > 200 ? plainText.slice(0, 200) + "..." : plainText;
  const imageMatch = article.content.match(/<img[^>]+src=["']([^"']+)["']/);
  const articleImage = imageMatch ? imageMatch[1] : undefined;

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: articleDescription,
    ...(articleImage && { image: articleImage, thumbnailUrl: articleImage }),
    datePublished: article.createdAt.toISOString(),
    dateModified: article.updatedAt.toISOString(),
    url: `${SITE_URL}/articles/${article.slug}`,
    author: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
    articleSection: article.category,
    keywords: article.tags,
    wordCount: plainText.split(/\s+/).length,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
    <ArticleDetailContent
      article={{
        id: article.id,
        title: article.title,
        slug: article.slug,
        category: article.category,
        date: article.createdAt.toISOString().split("T")[0],
        readCount: article.viewCount,
        content: article.content,
      }}
      relatedArticles={related.map((r) => ({
        title: r.title,
        slug: r.slug,
        category: r.category,
        date: r.createdAt.toISOString().split("T")[0],
      }))}
    />
    </>
  );
}
