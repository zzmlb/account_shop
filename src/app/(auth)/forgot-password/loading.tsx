import { Skeleton } from "@/components/ui/skeleton";

export default function ForgotPasswordLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <Skeleton className="mx-auto h-8 w-36" />
          <Skeleton className="mx-auto h-4 w-64" />
        </div>
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-6 space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-10 w-full rounded-[var(--radius-md)]" />
          </div>
          <Skeleton className="h-10 w-full rounded-[var(--radius-md)]" />
          <Skeleton className="mx-auto h-4 w-28" />
        </div>
      </div>
    </div>
  );
}
