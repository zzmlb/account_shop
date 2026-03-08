import { Skeleton } from "@/components/ui/skeleton";

export default function AdminOrderDetailLoading() {
  return (
    <div className="space-y-6 p-6">
      {/* Back link */}
      <Skeleton className="h-4 w-24" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-32" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>

      {/* Status timeline */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-6">
        <div className="flex items-center justify-between">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex flex-1 items-center">
              <div className="flex flex-col items-center gap-2">
                <Skeleton className="h-10 w-10 rounded-full" />
                <Skeleton className="h-3 w-12" />
              </div>
              {i < 2 && <Skeleton className="mx-2 h-0.5 flex-1" />}
            </div>
          ))}
        </div>
      </div>

      {/* Two column layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Order info */}
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-6 space-y-4">
          <Skeleton className="h-6 w-24" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-32" />
            </div>
          ))}
        </div>

        {/* Order items */}
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-6 space-y-4">
          <Skeleton className="h-6 w-28" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between gap-3">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/3" />
              </div>
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>

      {/* Card keys section */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-6 space-y-3">
        <Skeleton className="h-6 w-32" />
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border)] px-4 py-3">
            <Skeleton className="h-6 w-6 rounded-full" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-8 w-8" />
          </div>
        ))}
      </div>
    </div>
  );
}
