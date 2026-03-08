import type { Metadata } from "next";
import nextDynamic from "next/dynamic";

const AdminOverviewPageContent = nextDynamic(
  () => import("./admin-overview-content")
);

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "管理后台 - 概览",
};

export default function AdminOverviewPage() {
  return <AdminOverviewPageContent />;
}
