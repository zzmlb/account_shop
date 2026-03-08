import type { Metadata } from "next";
import LoginContent from "./login-content";

export const metadata: Metadata = {
  title: "登录",
  description: "登录您的 PJ37 Digital 账户",
};

export default function LoginPage() {
  return <LoginContent />;
}
