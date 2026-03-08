import { Suspense } from "react";
import type { Metadata } from "next";
import { Loader2 } from "lucide-react";
import ProductsPageContent from "./products-page-content";
import { SITE_URL } from "@/lib/constants";

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
    <div className="flex items-center justify-center py-32">
      <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<ProductsLoadingFallback />}>
      <ProductsPageContent />
    </Suspense>
  );
}
