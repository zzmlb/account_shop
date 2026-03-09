import type { Metadata } from "next";
import OrdersPageContent from "./orders-content";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "我的订单 - 个人中心",
  description: "查看和管理您的全部订单",
  robots: { index: false },
};

export default function OrdersPage() {
  return <OrdersPageContent />;
}
