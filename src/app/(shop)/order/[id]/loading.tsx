import { Skeleton } from "@/components/ui/skeleton";

export default function OrderDetailLoading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <Skeleton className="mb-6 h-4 w-24" />
      <Skeleton className="mb-8 h-9 w-48" />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <div className="rounded-lg border border-[var(--border)] p-6 space-y-4">
            <Skeleton className="h-6 w-24" />
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-16 w-16 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-[var(--border)] p-6 space-y-3">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-20 w-full rounded-lg" />
          </div>
        </div>
        <Skeleton className="h-64 rounded-lg" />
      </div>
    </div>
  );
}
