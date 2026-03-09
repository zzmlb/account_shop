import type { Metadata } from "next";
import nextDynamic from "next/dynamic";

const DashboardPageContent = nextDynamic(
  () => import("./dashboard-content")
);

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "个人中心 - PJ37 Digital",
  description: "管理您的账户、查看订单、余额和收藏",
  robots: { index: false },
};

export default function DashboardPage() {
  return <DashboardPageContent />;
}
