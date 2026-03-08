import { Skeleton } from "@/components/ui/skeleton";

export default function AdminBroadcastLoading() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <Skeleton className="h-8 w-36" />
        <Skeleton className="mt-2 h-5 w-64" />
      </div>
      {/* Compose form card */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-6 space-y-4">
        <Skeleton className="h-5 w-24" />
        <div className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-28 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="flex items-center gap-3 pt-2">
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      </div>
      {/* Tips card */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-6">
        <div className="flex gap-3">
          <Skeleton className="h-5 w-5 shrink-0 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        </div>
      </div>
    </div>
  );
}
