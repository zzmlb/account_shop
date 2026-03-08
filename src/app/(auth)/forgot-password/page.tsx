import type { Metadata } from "next";
import ForgotPasswordContent from "./forgot-password-content";

export const metadata: Metadata = {
  title: "忘记密码",
  description: "重置您的 PJ37 Digital 账户密码",
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordContent />;
}
