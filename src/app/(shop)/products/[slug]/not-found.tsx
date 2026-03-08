import Link from "next/link";
import { PackageX } from "lucide-react";

export default function ProductNotFound() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-24 text-center">
      <div className="mb-6 rounded-full bg-[var(--muted)] p-6">
        <PackageX className="h-12 w-12 text-[var(--muted-foreground)]" />
      </div>
      <h1 className="text-2xl font-bold text-[var(--foreground)]">商品未找到</h1>
      <p className="mt-2 text-[var(--muted-foreground)]">
        该商品可能已下架或链接无效，请浏览其他商品
      </p>
      <div className="mt-6 flex gap-3">
        <Link
          href="/products"
          className="inline-flex items-center rounded-[var(--radius-md)] bg-[var(--primary)] px-6 py-2.5 text-sm font-medium text-[var(--primary-foreground)] transition-colors hover:bg-[var(--primary-hover)]"
        >
          浏览全部商品
        </Link>
        <Link
          href="/"
          className="inline-flex items-center rounded-[var(--radius-md)] border border-[var(--border)] px-6 py-2.5 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--muted)]"
        >
          返回首页
        </Link>
      </div>
    </div>
  );
}
