import type { Metadata } from "next";
import RefundsContent from "./refunds-content";

export const metadata: Metadata = {
  title: "退款申请",
};

export default function RefundsPage() {
  return <RefundsContent />;
}
