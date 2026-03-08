import type { Metadata } from "next";
import AdminSettingsPageContent from "./admin-settings-content";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "系统设置 - 管理后台",
};

export default function AdminSettingsPage() {
  return <AdminSettingsPageContent />;
}
