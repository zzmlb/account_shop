import { Skeleton } from "@/components/ui/skeleton";

export default function TermsLoading() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <Skeleton className="mb-8 h-9 w-28" />
      <Skeleton className="mb-8 h-4 w-48" />
      <div className="space-y-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="h-6 w-44" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ))}
      </div>
    </div>
  );
}
