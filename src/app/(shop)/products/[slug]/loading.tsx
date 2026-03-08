import { Skeleton } from "@/components/ui/skeleton";

export default function ProductDetailLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Breadcrumb skeleton */}
      <div className="mb-6 flex items-center gap-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-32" />
      </div>

      {/* Main section */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Image */}
        <Skeleton className="aspect-square rounded-[var(--radius-lg)]" />

        {/* Info */}
        <div className="flex flex-col gap-4">
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-9 w-3/4" />
          <Skeleton className="h-10 w-36" />
          <div className="flex gap-3">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-28" />
          </div>
          <Skeleton className="h-px w-full" />
          <div>
            <Skeleton className="mb-2 h-5 w-16" />
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-12 flex-1 rounded-[var(--radius-md)]" />
            <Skeleton className="h-12 flex-1 rounded-[var(--radius-md)]" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Skeleton className="h-20 rounded-[var(--radius-md)]" />
            <Skeleton className="h-20 rounded-[var(--radius-md)]" />
            <Skeleton className="h-20 rounded-[var(--radius-md)]" />
          </div>
        </div>
      </div>
    </div>
  );
}
