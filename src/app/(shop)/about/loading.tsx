import { Skeleton } from "@/components/ui/skeleton";

export default function AboutLoading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      {/* Hero */}
      <div className="mb-16 text-center">
        <Skeleton className="mx-auto mb-4 h-10 w-48" />
        <Skeleton className="mx-auto h-5 w-80" />
        <Skeleton className="mx-auto mt-2 h-5 w-64" />
      </div>

      {/* Mission */}
      <div className="mb-16 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-8 space-y-4">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>

      {/* Features */}
      <div className="mb-16">
        <Skeleton className="mx-auto mb-8 h-7 w-40" />
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-6 space-y-3"
            >
              <Skeleton className="h-10 w-10 rounded-[var(--radius-md)]" />
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ))}
        </div>
      </div>

      {/* Contact */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-8 text-center space-y-4">
        <Skeleton className="mx-auto h-7 w-24" />
        <Skeleton className="mx-auto h-4 w-48" />
        <Skeleton className="mx-auto h-4 w-36" />
      </div>
    </div>
  );
}
