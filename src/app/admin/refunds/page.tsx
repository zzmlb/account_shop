import type { Metadata } from "next";
import AdminRefundsContent from "./admin-refunds-content";

export const metadata: Metadata = {
  title: "退款管理 - 管理后台",
};

export default function AdminRefundsPage() {
  return <AdminRefundsContent />;
}
