import type { Metadata } from "next";
import OrderSearchPageContent from "./order-search-content";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "卡密查询",
  description: "输入订单号查询您购买的卡密信息",
};

export default function OrderSearchPage() {
  return <OrderSearchPageContent />;
}
