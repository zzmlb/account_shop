import { Suspense } from "react";
import type { Metadata } from "next";
import { Loader2 } from "lucide-react";
import LoginContent from "./login-content";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "登录",
  description: "登录您的 PJ37 Digital 账户",
};

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--primary)]" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
