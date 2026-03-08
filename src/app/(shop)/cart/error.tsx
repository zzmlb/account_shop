"use client";

import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CartError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-16">
      <div className="flex flex-col items-center justify-center text-center">
        <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-[var(--destructive)]/10">
          <ShoppingCart className="h-10 w-10 text-[var(--destructive)]" />
        </div>
        <h2 className="mb-2 text-xl font-bold text-[var(--foreground)]">
          加载购物车出错
        </h2>
        <p className="mb-6 text-[var(--muted-foreground)]">
          抱歉，加载购物车时出现问题，请重试
        </p>
        <Button onClick={reset}>重试</Button>
      </div>
    </div>
  );
}
