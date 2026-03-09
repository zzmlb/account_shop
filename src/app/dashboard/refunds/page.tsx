import type { Metadata } from "next";
import RefundsContent from "./refunds-content";

export const metadata: Metadata = {
  title: "退款申请 - 个人中心",
  description: "查看和管理退款申请",
  robots: { index: false },
};

export default function RefundsPage() {
  return <RefundsContent />;
}
