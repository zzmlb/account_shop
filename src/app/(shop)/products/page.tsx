import { Suspense } from "react";
import ProductsPageContent from "./products-page-content";

export const metadata = {
  title: "全部商品 - PJ37 数字商品交易平台",
  description: "浏览全部数字商品，包括邮箱账号、社交媒体、流媒体会员、游戏账号等",
};

export default function ProductsPage() {
  return (
    <Suspense>
      <ProductsPageContent />
    </Suspense>
  );
}
