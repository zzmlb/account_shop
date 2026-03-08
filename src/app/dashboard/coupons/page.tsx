import type { Metadata } from "next";
import CouponsPageContent from "./coupons-content";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "我的优惠券 - 个人中心",
};

export default function CouponsPage() {
  return <CouponsPageContent />;
}
