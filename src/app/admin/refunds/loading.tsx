import { Skeleton } from "@/components/ui/skeleton";

export default function AdminRefundsLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Skeleton className="h-8 w-36" />
        <Skeleton className="mt-2 h-5 w-56" />
      </div>

      {/* Filters: tabs + search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-16 rounded-[var(--radius-md)]" />
          ))}
        </div>
        <Skeleton className="h-9 w-64" />
      </div>

      {/* Refund cards */}
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)]"
        >
          <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
          <div className="px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-16 w-full rounded-[var(--radius-md)]" />
              </div>
              <div className="flex flex-col items-end gap-2">
                <Skeleton className="h-6 w-20" />
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-8 w-16" />
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
