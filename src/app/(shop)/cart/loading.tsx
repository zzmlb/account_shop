export default function CartLoading() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <div className="h-8 w-32 animate-pulse rounded bg-[var(--muted)]" />
          <div className="mt-2 h-4 w-20 animate-pulse rounded bg-[var(--muted)]" />
        </div>
        <div className="h-9 w-24 animate-pulse rounded bg-[var(--muted)]" />
      </div>
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex gap-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-4"
            >
              <div className="h-24 w-24 animate-pulse rounded-[var(--radius-md)] bg-[var(--muted)]" />
              <div className="flex-1 space-y-3">
                <div className="h-5 w-2/3 animate-pulse rounded bg-[var(--muted)]" />
                <div className="h-4 w-24 animate-pulse rounded bg-[var(--muted)]" />
                <div className="flex items-center justify-between">
                  <div className="h-8 w-28 animate-pulse rounded bg-[var(--muted)]" />
                  <div className="h-6 w-20 animate-pulse rounded bg-[var(--muted)]" />
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="lg:col-span-1">
          <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-6">
            <div className="mb-4 h-6 w-24 animate-pulse rounded bg-[var(--muted)]" />
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="h-4 w-32 animate-pulse rounded bg-[var(--muted)]" />
                  <div className="h-4 w-16 animate-pulse rounded bg-[var(--muted)]" />
                </div>
              ))}
            </div>
            <div className="my-4 h-px bg-[var(--border)]" />
            <div className="flex items-center justify-between">
              <div className="h-5 w-12 animate-pulse rounded bg-[var(--muted)]" />
              <div className="h-8 w-24 animate-pulse rounded bg-[var(--muted)]" />
            </div>
            <div className="mt-6 h-12 w-full animate-pulse rounded-[var(--radius-md)] bg-[var(--muted)]" />
          </div>
        </div>
      </div>
    </div>
  );
}
