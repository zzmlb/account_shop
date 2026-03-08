import { Skeleton } from "@/components/ui/skeleton";

export default function CheckoutLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Skeleton className="mb-6 h-4 w-24" />
      <Skeleton className="mb-8 h-9 w-32" />
      <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
        <div className="space-y-8">
          <div className="rounded-lg border border-[var(--border)] p-6 space-y-4">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-10 w-full max-w-md" />
          </div>
          <div className="rounded-lg border border-[var(--border)] p-6 space-y-4">
            <Skeleton className="h-6 w-24" />
            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-lg" />
              ))}
            </div>
          </div>
        </div>
        <Skeleton className="h-80 rounded-lg" />
      </div>
    </div>
  );
}
