export function OrderDetailSkeleton() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="animate-pulse space-y-6">
        <div className="h-4 w-24 rounded bg-[var(--muted)]" />
        <div className="flex items-center justify-between">
          <div className="h-7 w-48 rounded bg-[var(--muted)]" />
          <div className="h-6 w-20 rounded-full bg-[var(--muted)]" />
        </div>
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-5 space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="h-16 w-16 shrink-0 rounded-[var(--radius-md)] bg-[var(--muted)]" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-2/3 rounded bg-[var(--muted)]" />
                <div className="h-3 w-1/3 rounded bg-[var(--muted)]" />
              </div>
              <div className="h-5 w-16 rounded bg-[var(--muted)]" />
            </div>
          ))}
        </div>
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-5 space-y-3">
          <div className="h-4 w-1/2 rounded bg-[var(--muted)]" />
          <div className="h-4 w-1/3 rounded bg-[var(--muted)]" />
          <div className="h-5 w-1/4 rounded bg-[var(--muted)]" />
        </div>
      </div>
    </div>
  );
}
