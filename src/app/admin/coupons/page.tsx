import type { Metadata } from "next";
import AdminCouponsContent from "./admin-coupons-content";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "优惠券管理 - 管理后台",
};

export default function AdminCouponsPage() {
  return <AdminCouponsContent />;
}
