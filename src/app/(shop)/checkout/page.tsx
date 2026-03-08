import CheckoutContent from "./checkout-content";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "确认订单",
  description: "确认订单信息并选择支付方式",
};

export default function CheckoutPage() {
  return <CheckoutContent />;
}
