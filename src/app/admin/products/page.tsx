import type { Metadata } from "next";
import AdminProductsPageContent from "./admin-products-content";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "商品管理 - 管理后台",
};

export default function AdminProductsPage() {
  return <AdminProductsPageContent />;
}
