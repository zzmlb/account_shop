import { Skeleton } from "@/components/ui/skeleton";

export default function NotificationsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-32" />
          <Skeleton className="mt-2 h-4 w-48" />
        </div>
        <Skeleton className="h-9 w-28 rounded-[var(--radius-md)]" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-4"
          >
            <div className="flex items-start gap-3">
              <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="mt-2 h-3 w-full max-w-md" />
                <Skeleton className="mt-1.5 h-3 w-24" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
