import { Suspense } from "react";
import type { Metadata } from "next";
import ProductsPageContent from "./products-page-content";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "全部商品 - PJ37 数字商品交易平台",
  description: "浏览全部数字商品，包括邮箱账号、社交媒体、流媒体会员、游戏账号等",
  openGraph: {
    title: "全部商品 - PJ37 Digital",
    description: "浏览全部数字商品，包括邮箱账号、社交媒体、流媒体会员、游戏账号等",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "全部商品 - PJ37 Digital",
    description: "浏览全部数字商品，包括邮箱账号、社交媒体、流媒体会员、游戏账号等",
  },
};

export default function ProductsPage() {
  return (
    <Suspense>
      <ProductsPageContent />
    </Suspense>
  );
}
