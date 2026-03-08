import type { Metadata } from "next";
import { SITE_NAME, SITE_URL } from "@/lib/constants";
import CheckoutContent from "./checkout-content";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `确认订单 - ${SITE_NAME}`,
  description: "确认订单信息并选择支付方式",
  openGraph: {
    title: `确认订单 - ${SITE_NAME}`,
    description: "确认订单信息并选择支付方式",
    url: `${SITE_URL}/checkout`,
    type: "website",
  },
  twitter: {
    card: "summary",
    title: `确认订单 - ${SITE_NAME}`,
    description: "确认订单信息并选择支付方式",
  },
  alternates: { canonical: `${SITE_URL}/checkout` },
  robots: { index: false, follow: false },
};

export default function CheckoutPage() {
  return <CheckoutContent />;
}
