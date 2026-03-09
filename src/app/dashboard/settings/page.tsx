import type { Metadata } from "next";
import DashboardSettingsPageContent from "./settings-content";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "账户设置 - 个人中心",
  description: "修改个人信息、密码和安全设置",
  robots: { index: false },
};

export default function SettingsPage() {
  return <DashboardSettingsPageContent />;
}
