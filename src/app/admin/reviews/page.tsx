import type { Metadata } from "next";
import AdminReviewsContent from "./admin-reviews-content";

export const metadata: Metadata = {
  title: "评价管理 - 管理后台",
};

export default function AdminReviewsPage() {
  return <AdminReviewsContent />;
}
