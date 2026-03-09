import type { Metadata } from "next";
import BalancePageContent from "./balance-content";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "余额管理 - 个人中心",
  description: "查看余额变动记录和充值",
  robots: { index: false },
};

export default function BalancePage() {
  return <BalancePageContent />;
}
