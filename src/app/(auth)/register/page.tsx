import type { Metadata } from "next";
import RegisterContent from "./register-content";

export const metadata: Metadata = {
  title: "注册",
  description: "创建 PJ37 Digital 账户，开始您的数字商品之旅",
};

export default function RegisterPage() {
  return <RegisterContent />;
}
