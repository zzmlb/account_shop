import type { Metadata } from "next";
import NotificationsContent from "./notifications-content";

export const metadata: Metadata = {
  title: "我的通知 - 个人中心",
  description: "查看系统通知和消息",
  robots: { index: false },
};

export default function NotificationsPage() {
  return <NotificationsContent />;
}
