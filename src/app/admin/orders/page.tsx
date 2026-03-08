import type { Metadata } from "next";
import AdminOrdersPageContent from "./admin-orders-content";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "订单管理 - 管理后台",
};

export default function AdminOrdersPage() {
  return <AdminOrdersPageContent />;
}
