import type { Metadata } from "next";
import OrdersPageContent from "./orders-content";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "我的订单 - 个人中心",
};

export default function OrdersPage() {
  return <OrdersPageContent />;
}
