import Link from "next/link";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AuthNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <div className="mb-6 rounded-full bg-[var(--muted)] p-6">
        <SearchX className="h-12 w-12 text-[var(--muted-foreground)]" />
      </div>
      <h1 className="mb-2 text-4xl font-bold text-[var(--foreground)]">404</h1>
      <h2 className="mb-4 text-lg font-semibold text-[var(--foreground)]">
        页面未找到
      </h2>
      <p className="mb-8 text-[var(--muted-foreground)]">
        您访问的页面不存在，请检查链接是否正确
      </p>
      <div className="flex gap-3">
        <Button asChild>
          <Link href="/login">前往登录</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/">返回首页</Link>
        </Button>
      </div>
    </div>
  );
}
