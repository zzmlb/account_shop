import { Suspense } from "react";
import type { Metadata } from "next";
import ResetPasswordContent from "./reset-password-content";

export const metadata: Metadata = {
  title: "重置密码",
  description: "设置新的账户密码",
};

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-32">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" />
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
