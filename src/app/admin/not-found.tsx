import Link from "next/link";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminNotFound() {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-24 text-center">
      <div className="mb-6 rounded-full bg-[var(--muted)] p-6">
        <SearchX className="h-12 w-12 text-[var(--muted-foreground)]" />
      </div>
      <h1 className="mb-2 text-4xl font-bold text-[var(--foreground)]">404</h1>
      <h2 className="mb-4 text-lg font-semibold text-[var(--foreground)]">
        页面未找到
      </h2>
      <p className="mb-8 text-[var(--muted-foreground)]">
        该管理页面不存在
      </p>
      <Button asChild>
        <Link href="/admin">返回管理后台</Link>
      </Button>
    </div>
  );
}
