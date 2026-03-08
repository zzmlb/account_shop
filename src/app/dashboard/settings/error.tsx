"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SettingsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") console.error("[SettingsError]", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <AlertTriangle className="mb-4 h-10 w-10 text-[var(--destructive)]" />
      <h2 className="mb-2 text-lg font-semibold">设置页面加载失败</h2>
      <p className="mb-6 text-sm text-[var(--muted-foreground)]">请稍后重试</p>
      <Button onClick={reset}>重试</Button>
    </div>
  );
}
