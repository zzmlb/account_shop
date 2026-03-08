import { Skeleton } from "@/components/ui/skeleton";

export default function ProductsLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Heading skeleton */}
      <div className="mb-8">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="mt-2 h-5 w-72" />
      </div>

      {/* Filters skeleton row */}
      <div className="mb-6 flex flex-wrap gap-3">
        <Skeleton className="h-10 w-32 rounded-[var(--radius-md)]" />
        <Skeleton className="h-10 w-40 rounded-[var(--radius-md)]" />
        <Skeleton className="h-10 w-28 rounded-[var(--radius-md)]" />
      </div>

      {/* Product grid skeleton: 8 cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)]"
          >
            {/* Image area */}
            <Skeleton className="aspect-[4/3] w-full rounded-none" />
            {/* Content area */}
            <div className="p-4">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="mt-2 h-4 w-1/2" />
              <Skeleton className="mt-3 h-6 w-24" />
              <div className="mt-3 flex items-center justify-between">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-8 w-8 rounded-[var(--radius-md)]" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
