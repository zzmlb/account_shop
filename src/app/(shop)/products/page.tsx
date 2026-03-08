import { Suspense } from "react";
import type { Metadata } from "next";
import ProductsPageContent from "./products-page-content";
import { SITE_NAME, SITE_URL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "全部商品 - PJ37 数字商品交易平台",
  description: "浏览全部数字商品，包括邮箱账号、社交媒体、流媒体会员、游戏账号等",
  openGraph: {
    title: "全部商品 - PJ37 Digital",
    description: "浏览全部数字商品，包括邮箱账号、社交媒体、流媒体会员、游戏账号等",
    url: `${SITE_URL}/products`,
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "全部商品 - PJ37 Digital",
    description: "浏览全部数字商品，包括邮箱账号、社交媒体、流媒体会员、游戏账号等",
  },
  alternates: { canonical: `${SITE_URL}/products` },
};

function ProductsLoadingFallback() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="animate-pulse space-y-6">
        <div className="h-7 w-32 rounded bg-[var(--muted)]" />
        <div className="flex gap-8">
          <div className="hidden w-64 shrink-0 lg:block">
            <div className="rounded-[var(--radius-lg)] border border-[var(--border)] p-5 space-y-4">
              <div className="h-4 w-20 rounded bg-[var(--muted)]" />
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-8 rounded bg-[var(--muted)]" />
              ))}
            </div>
          </div>
          <div className="flex-1 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-[var(--radius-lg)] border border-[var(--border)] p-4">
                <div className="mb-3 h-40 rounded-[var(--radius-md)] bg-[var(--muted)]" />
                <div className="mb-2 h-4 w-3/4 rounded bg-[var(--muted)]" />
                <div className="mb-3 h-3 w-1/2 rounded bg-[var(--muted)]" />
                <div className="flex items-center justify-between">
                  <div className="h-5 w-16 rounded bg-[var(--muted)]" />
                  <div className="h-3 w-12 rounded bg-[var(--muted)]" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `全部商品 - ${SITE_NAME}`,
    description: "浏览全部数字商品，包括邮箱账号、社交媒体、流媒体会员、游戏账号等",
    url: `${SITE_URL}/products`,
    isPartOf: {
      "@type": "WebSite",
      name: SITE_NAME,
      url: SITE_URL,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Suspense fallback={<ProductsLoadingFallback />}>
        <ProductsPageContent />
      </Suspense>
    </>
  );
}
