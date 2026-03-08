"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw, Home, MessageCircle } from "lucide-react";
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
        <p className="mb-4 text-[var(--muted-foreground)]">
          页面遇到了意外错误，请稍后重试。
        </p>

        {/* Recovery suggestions */}
        <div className="mb-6 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card)] p-4 text-left text-sm text-[var(--muted-foreground)]">
          <p className="mb-2 font-medium text-[var(--foreground)]">可以尝试：</p>
          <ul className="list-inside list-disc space-y-1">
            <li>刷新页面重试</li>
            <li>清除浏览器缓存后再试</li>
            <li>如问题持续存在，请联系客服</li>
          </ul>
        </div>

        {/* Error reference ID */}
        {error.digest && (
          <p className="mb-6 text-xs text-[var(--muted-foreground)]">
            错误参考码：<code className="rounded bg-[var(--muted)] px-1.5 py-0.5 font-mono">{error.digest}</code>
          </p>
        )}

        <div className="flex items-center justify-center gap-3">
          <Button onClick={reset} className="gap-1.5">
            <RotateCcw className="h-4 w-4" />
            重试
          </Button>
          <Button variant="outline" asChild className="gap-1.5">
            <Link href="/">
              <Home className="h-4 w-4" />
              返回首页
            </Link>
          </Button>
          <Button variant="ghost" asChild className="gap-1.5">
            <Link href="/contact">
              <MessageCircle className="h-4 w-4" />
              联系客服
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
