import type { Metadata } from "next";
import NotificationsContent from "./notifications-content";

export const metadata: Metadata = {
  title: "我的通知",
};

export default function NotificationsPage() {
  return <NotificationsContent />;
}
