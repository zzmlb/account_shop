import type { Metadata } from "next";
import ReviewsContent from "./reviews-content";

export const metadata: Metadata = {
  title: "我的评价",
};

export default function ReviewsPage() {
  return <ReviewsContent />;
}
