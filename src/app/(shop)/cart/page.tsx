import type { Metadata } from "next";
import CartPageContent from "./cart-content";

export const metadata: Metadata = {
  title: "购物车",
  description: "查看和管理您的购物车商品",
};

export default function CartPage() {
  return <CartPageContent />;
}
