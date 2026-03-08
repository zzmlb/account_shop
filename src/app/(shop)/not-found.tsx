import Link from "next/link";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ShopNotFound() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center justify-center px-4 py-24 text-center">
      <div className="mb-6 rounded-full bg-[var(--muted)] p-6">
        <SearchX className="h-12 w-12 text-[var(--muted-foreground)]" />
      </div>
      <h1 className="mb-2 text-4xl font-bold text-[var(--foreground)]">404</h1>
      <h2 className="mb-4 text-lg font-semibold text-[var(--foreground)]">
        页面未找到
      </h2>
      <p className="mb-8 text-[var(--muted-foreground)]">
        您访问的页面不存在，可能已被移除或链接有误
      </p>
      <div className="flex gap-3">
        <Button asChild variant="outline">
          <Link href="/">返回首页</Link>
        </Button>
        <Button asChild>
          <Link href="/products">浏览商品</Link>
        </Button>
      </div>
    </div>
  );
}
