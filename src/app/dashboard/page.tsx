import type { Metadata } from "next";
import DashboardPageContent from "./dashboard-content";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "个人中心 - PJ37 Digital",
};

export default function DashboardPage() {
  return <DashboardPageContent />;
}
