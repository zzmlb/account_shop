import type { Metadata } from "next";
import { SITE_NAME, SITE_URL } from "@/lib/constants";
import PromotionsContent from "./promotions-content";

export const metadata: Metadata = {
  title: "优惠活动",
  description: `${SITE_NAME} 优惠券领取中心，领取专属优惠券享受更多折扣`,
  openGraph: {
    title: `优惠活动 - ${SITE_NAME}`,
    description: `${SITE_NAME} 优惠券领取中心，领取专属优惠券享受更多折扣`,
    url: `${SITE_URL}/promotions`,
    type: "website",
  },
  alternates: { canonical: `${SITE_URL}/promotions` },
};

export default function PromotionsPage() {
  return <PromotionsContent />;
}
