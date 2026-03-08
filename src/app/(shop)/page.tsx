import { Suspense } from "react";
import type { Metadata } from "next";
import { Skeleton } from "@/components/ui/skeleton";
import HeroSection from "@/components/home/hero-section";
import CategoryGrid from "@/components/home/category-grid";
import FeaturedProducts from "@/components/home/featured-products";
import NewArrivals from "@/components/home/new-arrivals";
import TrustSection from "@/components/home/trust-section";
import Testimonials from "@/components/home/testimonials";
import FaqSection from "@/components/home/faq-section";
import RecentlyViewed from "@/components/home/recently-viewed";
import { SITE_NAME, SITE_DESCRIPTION, SITE_URL } from "@/lib/constants";

export const revalidate = 60; // ISR: revalidate every 60 seconds

export const metadata: Metadata = {
  title: `${SITE_NAME} — ${SITE_DESCRIPTION}`,
  description: SITE_DESCRIPTION,
  openGraph: {
    title: `${SITE_NAME} — ${SITE_DESCRIPTION}`,
    description: "安全可靠的数字商品交易平台，即时交付、AES-256加密保护、7×24客服支持",
    url: SITE_URL,
    siteName: SITE_NAME,
    type: "website",
    locale: "zh_CN",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — ${SITE_DESCRIPTION}`,
    description: "安全可靠的数字商品交易平台，即时交付、AES-256加密保护、7×24客服支持",
  },
  alternates: {
    canonical: SITE_URL,
  },
};

/* ------------------------------------------------------------------ */
/*  Inline skeleton fallbacks for Suspense boundaries                 */
/* ------------------------------------------------------------------ */

function CategoryGridSkeleton() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
      <div className="mb-10 text-center">
        <Skeleton className="mx-auto h-8 w-32" />
        <Skeleton className="mx-auto mt-3 h-5 w-64" />
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-6"
          >
            <Skeleton className="h-12 w-12 rounded-[var(--radius-md)]" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-3 w-12" />
          </div>
        ))}
      </div>
    </section>
  );
}

function FeaturedProductsSkeleton() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
      <div className="mb-10 flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-32" />
          <Skeleton className="mt-2 h-5 w-48" />
        </div>
        <Skeleton className="hidden h-5 w-20 sm:block" />
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)]"
          >
            <Skeleton className="h-36 w-full rounded-none" />
            <div className="p-4">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="mt-1 h-3 w-1/3" />
              <Skeleton className="mt-3 h-6 w-24" />
              <Skeleton className="mt-3 h-9 w-full rounded-[var(--radius-md)]" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE_NAME,
  url: SITE_URL,
  description: SITE_DESCRIPTION,
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: SITE_URL,
  potentialAction: {
    "@type": "SearchAction",
    target: `${SITE_URL}/products?search={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
      <HeroSection />
      <Suspense fallback={<CategoryGridSkeleton />}>
        <CategoryGrid />
      </Suspense>
      <Suspense fallback={<FeaturedProductsSkeleton />}>
        <FeaturedProducts />
      </Suspense>
      <Suspense fallback={<FeaturedProductsSkeleton />}>
        <NewArrivals />
      </Suspense>
      <RecentlyViewed />
      <Testimonials />
      <FaqSection />
      <TrustSection />
    </>
  );
}
