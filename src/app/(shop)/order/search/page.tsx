import type { Metadata } from "next";
import { SITE_NAME, SITE_URL } from "@/lib/constants";
import OrderSearchPageContent from "./order-search-content";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "卡密查询",
  description: "输入订单号查询您购买的卡密信息",
  openGraph: {
    title: `卡密查询 - ${SITE_NAME}`,
    description: "输入订单号查询您购买的卡密信息",
    url: `${SITE_URL}/order/search`,
    type: "website",
  },
  twitter: {
    card: "summary",
    title: `卡密查询 - ${SITE_NAME}`,
    description: "输入订单号查询您购买的卡密信息",
  },
  alternates: { canonical: `${SITE_URL}/order/search` },
};

export default function OrderSearchPage() {
  return <OrderSearchPageContent />;
}
