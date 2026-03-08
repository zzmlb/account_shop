import type { Metadata } from "next";
import BalancePageContent from "./balance-content";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "余额管理 - 个人中心",
};

export default function BalancePage() {
  return <BalancePageContent />;
}
