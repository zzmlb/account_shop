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

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "购买后多久可以收到商品？",
      acceptedAnswer: {
        "@type": "Answer",
        text: "大部分数字商品在支付成功后即时自动发货，卡密信息将通过邮件发送并显示在订单详情页。如遇延迟，通常不超过5分钟。",
      },
    },
    {
      "@type": "Question",
      name: "支持哪些支付方式？",
      acceptedAnswer: {
        "@type": "Answer",
        text: "目前支持支付宝、微信支付和账户余额支付。所有支付通道均通过加密传输，确保资金安全。",
      },
    },
    {
      "@type": "Question",
      name: "购买的商品有售后保障吗？",
      acceptedAnswer: {
        "@type": "Answer",
        text: "所有商品均提供售后保障期，具体时长见商品详情页。保障期内如遇问题可提交退款申请，管理员审核后将及时处理。",
      },
    },
    {
      "@type": "Question",
      name: "如何查看已购买的卡密/账号信息？",
      acceptedAnswer: {
        "@type": "Answer",
        text: "登录账户后进入「我的订单」，找到对应订单展开即可查看卡密信息。同时您注册时填写的邮箱也会收到发货通知邮件。",
      },
    },
    {
      "@type": "Question",
      name: "不注册账户可以购买吗？",
      acceptedAnswer: {
        "@type": "Answer",
        text: "目前需要注册账户才能购买商品，注册过程仅需用户名和邮箱，方便您管理订单和享受售后服务。",
      },
    },
    {
      "@type": "Question",
      name: "账户余额如何使用？",
      acceptedAnswer: {
        "@type": "Answer",
        text: "账户余额可直接用于购买商品。管理员可为您充值余额，退款金额也会返还至账户余额。",
      },
    },
  ],
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
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
