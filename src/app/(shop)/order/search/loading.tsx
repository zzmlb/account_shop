import { Skeleton } from "@/components/ui/skeleton";

export default function OrderSearchLoading() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <Skeleton className="mb-2 h-10 w-48" />
      <Skeleton className="mb-8 h-5 w-72" />
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
  );
}
