"use client";

import { Package, CreditCard, Truck, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const TIMELINE_STEPS = [
  { key: "created", label: "创建订单", icon: Package },
  { key: "paid", label: "支付完成", icon: CreditCard },
  { key: "delivered", label: "发货完成", icon: Truck },
];

interface OrderTimelineProps {
  status: "PENDING" | "PAID" | "DELIVERED" | "CANCELLED" | "REFUNDED" | "EXPIRED";
  createdAt: string;
  paidAt?: string | null;
}

export function OrderTimeline({ status, createdAt, paidAt }: OrderTimelineProps) {
  const activeStepIndex =
    status === "DELIVERED"
      ? 2
      : status === "PAID"
        ? 1
        : status === "CANCELLED" || status === "REFUNDED"
          ? -1
          : 0;

  if (activeStepIndex < 0) return null;

  return (
    <div className="mb-8 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-6">
      <div className="flex items-center justify-between">
        {TIMELINE_STEPS.map((step, index) => {
          const isCompleted = index <= activeStepIndex;
          const isCurrent = index === activeStepIndex;
          const stepTime =
            index === 0
              ? createdAt
              : index === 1
                ? paidAt
                : index === 2 && status === "DELIVERED"
                  ? paidAt
                  : null;
          return (
            <div key={step.key} className="flex flex-1 items-center">
              <div className="flex flex-col items-center gap-2">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all",
                    isCompleted
                      ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]"
                      : "border-[var(--border)] text-[var(--muted-foreground)]",
                    isCurrent && "animate-glow"
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <step.icon className="h-5 w-5" />
                  )}
                </div>
                <span
                  className={cn(
                    "text-xs font-medium",
                    isCompleted
                      ? "text-[var(--foreground)]"
                      : "text-[var(--muted-foreground)]"
                  )}
                >
                  {step.label}
                </span>
                {isCompleted && stepTime && (
                  <span className="text-[10px] text-[var(--muted-foreground)]">
                    {new Date(stepTime).toLocaleString("zh-CN", {
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                )}
              </div>
              {index < TIMELINE_STEPS.length - 1 && (
                <div
                  className={cn(
                    "mx-2 h-0.5 flex-1 rounded-full",
                    index < activeStepIndex
                      ? "bg-[var(--primary)]"
                      : "bg-[var(--border)]"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
