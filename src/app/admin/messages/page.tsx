import type { Metadata } from "next";
import AdminMessagesContent from "./admin-messages-content";

export const metadata: Metadata = {
  title: "留言管理",
};

export default function AdminMessagesPage() {
  return <AdminMessagesContent />;
}
