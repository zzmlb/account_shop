"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ArticlesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.error("[ArticlesError]", error);
    }
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--card)]">
          <AlertTriangle className="h-10 w-10 text-[var(--destructive)]" />
        </div>
        <h1 className="mb-2 text-2xl font-bold text-[var(--foreground)]">
          帮助中心加载失败
        </h1>
        <p className="mb-8 text-[var(--muted-foreground)]">
          文章列表遇到了意外错误，请稍后重试。
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
