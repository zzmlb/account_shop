import type { Metadata } from "next";
import AuditLogsContent from "./audit-logs-content";

export const metadata: Metadata = {
  title: "操作日志",
};

export default function AuditLogsPage() {
  return <AuditLogsContent />;
}
