import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--background)] px-4">
      <div className="text-center">
        {/* 404 Icon */}
        <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-[var(--muted)]">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-[var(--muted-foreground)]"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
            <path d="M8 11h6" />
          </svg>
        </div>

        {/* Error Code */}
        <h1 className="mb-2 text-7xl font-extrabold tracking-tight text-[var(--foreground)]">
          404
        </h1>

        {/* Heading */}
        <h2 className="mb-4 text-2xl font-semibold text-[var(--foreground)]">
          页面未找到
        </h2>

        {/* Description */}
        <p className="mx-auto mb-8 max-w-md text-[var(--muted-foreground)]">
          您访问的页面不存在或已被移除。请检查链接是否正确，或返回首页浏览更多内容。
        </p>

        {/* Actions */}
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-6 py-3 text-sm font-medium text-[var(--primary-foreground)] transition-colors hover:opacity-90"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            返回首页
          </Link>
          <Link
            href="/products"
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-6 py-3 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--muted)]"
          >
            浏览商品
          </Link>
        </div>

        {/* Quick links */}
        <div className="mt-8 flex flex-wrap justify-center gap-3 text-sm">
          <Link href="/contact" className="text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors">
            联系客服
          </Link>
          <span className="text-[var(--border)]">|</span>
          <Link href="/articles" className="text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors">
            帮助中心
          </Link>
          <span className="text-[var(--border)]">|</span>
          <Link href="/order/search" className="text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors">
            订单查询
          </Link>
        </div>
      </div>
    </div>
  );
}
