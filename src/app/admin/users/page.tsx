import type { Metadata } from "next";
import AdminUsersPageContent from "./admin-users-content";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "用户管理 - 管理后台",
};

export default function AdminUsersPage() {
  return <AdminUsersPageContent />;
}
