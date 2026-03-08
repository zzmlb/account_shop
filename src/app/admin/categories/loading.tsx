import { Skeleton } from "@/components/ui/skeleton";

export default function AdminCategoriesLoading() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-9 w-32" />
          <Skeleton className="mt-2 h-5 w-48" />
        </div>
        <Skeleton className="h-10 w-28" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] px-4 py-4"
          >
            <Skeleton className="h-10 w-10 rounded-[var(--radius-md)]" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-48 hidden sm:block" />
            <Skeleton className="ml-auto h-6 w-16 rounded-full" />
            <Skeleton className="h-8 w-8 rounded-[var(--radius-md)]" />
            <Skeleton className="h-8 w-8 rounded-[var(--radius-md)]" />
          </div>
        ))}
      </div>
    </div>
  );
}
