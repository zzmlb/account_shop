import type { Metadata } from "next";
import AdminUserDetailContent from "./admin-user-detail-content";

export const metadata: Metadata = {
  title: "用户详情",
};

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AdminUserDetailContent userId={id} />;
}
