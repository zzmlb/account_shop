import { MetadataRoute } from 'next'
import { db } from '@/server/db'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, articles, categories] = await Promise.all([
    db.product.findMany({
      where: { isActive: true },
      select: { slug: true, updatedAt: true },
    }),
    db.article.findMany({
      where: { isPublished: true },
      select: { slug: true, updatedAt: true },
    }),
    db.category.findMany({
      where: { isActive: true },
      select: { name: true, createdAt: true },
    }),
  ])

  const productUrls = products.map((p) => ({
    url: `${SITE_URL}/products/${p.slug}`,
    lastModified: p.updatedAt,
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }))

  const articleUrls = articles.map((a) => ({
    url: `${SITE_URL}/articles/${a.slug}`,
    lastModified: a.updatedAt,
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }))

  const categoryUrls = categories.map((c) => ({
    url: `${SITE_URL}/products?category=${encodeURIComponent(c.name)}`,
    lastModified: c.createdAt,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  return [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/products`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/articles`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE_URL}/about`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/terms`, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${SITE_URL}/privacy`, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${SITE_URL}/order/search`, changeFrequency: 'monthly', priority: 0.3 },
    ...productUrls,
    ...categoryUrls,
    ...articleUrls,
  ]
}
