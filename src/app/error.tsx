"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.error("[RootError]", error);
    }
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--background)] px-4">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--card)]">
          <AlertTriangle className="h-10 w-10 text-[var(--destructive)]" />
        </div>

        <h1 className="mb-2 text-2xl font-bold text-[var(--foreground)]">
          出了点问题
        </h1>
        <p className="mb-8 text-[var(--muted-foreground)]">
          页面遇到了意外错误，请稍后重试。如果问题持续存在，请联系客服。
        </p>

        <div className="flex items-center justify-center gap-3">
          <Button onClick={reset}>重试</Button>
          <Button variant="outline" asChild>
            <Link href="/">返回首页</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
