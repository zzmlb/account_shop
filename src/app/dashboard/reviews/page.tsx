import type { Metadata } from "next";
import ReviewsContent from "./reviews-content";

export const metadata: Metadata = {
  title: "我的评价 - 个人中心",
  description: "查看和管理您发表的评价",
  robots: { index: false },
};

export default function ReviewsPage() {
  return <ReviewsContent />;
}
