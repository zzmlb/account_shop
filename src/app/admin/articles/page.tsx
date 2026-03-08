import type { Metadata } from "next";
import AdminArticlesPageContent from "./admin-articles-content";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "文章管理 - 管理后台",
};

export default function AdminArticlesPage() {
  return <AdminArticlesPageContent />;
}
