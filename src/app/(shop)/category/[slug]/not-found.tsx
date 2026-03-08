import Link from "next/link";
import { FolderX } from "lucide-react";

export default function CategoryNotFound() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-24 text-center">
      <div className="mb-6 rounded-full bg-[var(--muted)] p-6">
        <FolderX className="h-12 w-12 text-[var(--muted-foreground)]" />
      </div>
      <h1 className="text-2xl font-bold text-[var(--foreground)]">分类未找到</h1>
      <p className="mt-2 text-[var(--muted-foreground)]">
        该分类不存在或已被移除，请浏览其他分类
      </p>
      <div className="mt-6 flex gap-3">
        <Link
          href="/categories"
          className="inline-flex items-center rounded-[var(--radius-md)] bg-[var(--primary)] px-6 py-2.5 text-sm font-medium text-[var(--primary-foreground)] transition-colors hover:bg-[var(--primary-hover)]"
        >
          浏览全部分类
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
