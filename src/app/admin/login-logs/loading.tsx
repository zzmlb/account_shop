import { Skeleton } from "@/components/ui/skeleton";

export default function AdminLoginLogsLoading() {
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
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-16 rounded-[var(--radius-md)]" />
          ))}
        </div>
        <Skeleton className="h-9 w-64" />
      </div>

      {/* Table */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)]">
        {/* Table header */}
        <div className="border-b border-[var(--border)] px-4 py-3">
          <div className="flex gap-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-20" />
            ))}
          </div>
        </div>
        {/* Table rows */}
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-6 border-b border-[var(--border)] px-4 py-3 last:border-0"
          >
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-14 rounded-full" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>
    </div>
  );
}
