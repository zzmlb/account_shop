import type { Metadata } from "next";
import AdminCardKeysPageContent from "./admin-card-keys-content";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "卡密管理 - 管理后台",
};

export default function AdminCardKeysPage() {
  return <AdminCardKeysPageContent />;
}
