import type { Metadata } from "next";
import AdminLoginLogsContent from "./admin-login-logs-content";

export const metadata: Metadata = {
  title: "登录日志",
};

export default function AdminLoginLogsPage() {
  return <AdminLoginLogsContent />;
}
