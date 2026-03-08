import Link from "next/link";
import { FileSearch } from "lucide-react";

export default function AdminOrderNotFound() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-24 text-center">
      <div className="mb-6 rounded-full bg-[var(--muted)] p-6">
        <FileSearch className="h-12 w-12 text-[var(--muted-foreground)]" />
      </div>
      <h1 className="text-2xl font-bold text-[var(--foreground)]">订单未找到</h1>
      <p className="mt-2 text-[var(--muted-foreground)]">
        该订单不存在或已被删除
      </p>
      <div className="mt-6">
        <Link
          href="/admin/orders"
          className="inline-flex items-center rounded-[var(--radius-md)] bg-[var(--primary)] px-6 py-2.5 text-sm font-medium text-[var(--primary-foreground)] transition-colors hover:bg-[var(--primary-hover)]"
        >
          返回订单管理
        </Link>
      </div>
    </div>
  );
}
