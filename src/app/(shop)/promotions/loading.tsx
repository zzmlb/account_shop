import { Skeleton } from "@/components/ui/skeleton";

export default function PromotionsLoading() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <Skeleton className="mx-auto mb-4 h-14 w-14 rounded-full" />
        <Skeleton className="mx-auto h-8 w-32" />
        <Skeleton className="mx-auto mt-2 h-4 w-48" />
      </div>

      {/* Manual code input */}
      <div className="mx-auto mb-10 max-w-lg">
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-5 space-y-3">
          <Skeleton className="h-4 w-20" />
          <div className="flex gap-2">
            <Skeleton className="h-10 flex-1 rounded-[var(--radius-md)]" />
            <Skeleton className="h-10 w-16 rounded-[var(--radius-md)]" />
          </div>
        </div>
      </div>

      {/* Section title */}
      <Skeleton className="mb-6 h-6 w-40" />

      {/* Coupon cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] overflow-hidden"
          >
            <Skeleton className="h-1 w-full" />
            <div className="p-5 space-y-3">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-9 w-full rounded-[var(--radius-md)]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
