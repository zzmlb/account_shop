import type { Metadata } from "next";
import { Suspense } from "react";
import AdminOrderDetailContent from "./admin-order-detail-content";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "订单详情",
};

export const dynamic = "force-dynamic";

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-8 w-48" />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Skeleton className="h-48 w-full rounded-[var(--radius-lg)]" />
          <Skeleton className="h-64 w-full rounded-[var(--radius-lg)]" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-48 w-full rounded-[var(--radius-lg)]" />
          <Skeleton className="h-36 w-full rounded-[var(--radius-lg)]" />
        </div>
      </div>
    </div>
  );
}

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <AdminOrderDetailContent orderId={id} />
    </Suspense>
  );
}
