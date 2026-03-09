import type { Metadata } from "next";
import OrderDetailContent from "./order-detail-content";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "订单详情",
  description: "查看您的订单详细信息",
  robots: { index: false, follow: false },
};

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <OrderDetailContent id={id} />;
}
