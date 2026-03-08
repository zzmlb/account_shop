import type { Metadata } from "next";
import AdminCategoriesContent from "./admin-categories-content";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "分类管理 - 管理后台",
};

export default function AdminCategoriesPage() {
  return <AdminCategoriesContent />;
}
