export default function ShopLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Breadcrumb skeleton */}
      <div className="mb-6 flex items-center gap-2">
        <div className="h-4 w-12 animate-pulse rounded bg-[var(--muted)]" />
        <div className="h-4 w-4 animate-pulse rounded bg-[var(--muted)]" />
        <div className="h-4 w-20 animate-pulse rounded bg-[var(--muted)]" />
      </div>
      {/* Title skeleton */}
      <div className="mb-8 h-8 w-48 animate-pulse rounded bg-[var(--muted)]" />
      {/* Product grid skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] overflow-hidden"
          >
            <div className="aspect-[4/3] bg-[var(--muted)]" />
            <div className="p-4">
              <div className="mb-2 h-4 w-3/4 rounded bg-[var(--muted)]" />
              <div className="mb-3 h-3 w-1/2 rounded bg-[var(--muted)]" />
              <div className="flex items-center justify-between">
                <div className="h-5 w-16 rounded bg-[var(--muted)]" />
                <div className="h-3 w-12 rounded bg-[var(--muted)]" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
