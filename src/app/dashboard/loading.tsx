import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-8 p-6">
      {/* Heading skeleton */}
      <div>
        <Skeleton className="h-9 w-36" />
        <Skeleton className="mt-2 h-5 w-56" />
      </div>

      {/* Stat card grid skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-6"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-8 rounded-[var(--radius-md)]" />
            </div>
            <Skeleton className="mt-3 h-8 w-24" />
            <Skeleton className="mt-2 h-3 w-32" />
          </div>
        ))}
      </div>

      {/* Recent orders table skeleton */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-6">
        <Skeleton className="mb-4 h-6 w-28" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 rounded-[var(--radius-md)] border border-[var(--border)] p-3"
            >
              <Skeleton className="h-10 w-10 rounded-[var(--radius-md)]" />
              <div className="flex-1">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="mt-1 h-3 w-1/3" />
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-5 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
