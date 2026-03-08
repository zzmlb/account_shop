import type { Metadata } from "next";
import DashboardSettingsPageContent from "./settings-content";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "账户设置 - 个人中心",
};

export default function SettingsPage() {
  return <DashboardSettingsPageContent />;
}
