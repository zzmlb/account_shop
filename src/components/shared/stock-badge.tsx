import { cn } from "@/lib/utils";

interface StockBadgeProps {
  stockCount: number;
  className?: string;
}

export default function StockBadge({ stockCount, className }: StockBadgeProps) {
  let label: string;
  let colorClasses: string;

  if (stockCount <= 0) {
    label = "缺货";
    colorClasses =
      "bg-[var(--destructive)]/15 text-[var(--destructive)] border-[var(--destructive)]/30";
  } else if (stockCount <= 5) {
    label = "库存紧张";
    colorClasses =
      "bg-[var(--warning)]/15 text-[var(--warning)] border-[var(--warning)]/30";
  } else {
    label = "有货";
    colorClasses =
      "bg-[var(--success)]/15 text-[var(--success)] border-[var(--success)]/30";
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        colorClasses,
        className
      )}
    >
      <span
        className={cn(
          "mr-1.5 h-1.5 w-1.5 rounded-full",
          stockCount <= 0
            ? "bg-[var(--destructive)]"
            : stockCount <= 5
              ? "bg-[var(--warning)]"
              : "bg-[var(--success)]"
        )}
      />
      {label}
    </span>
  );
}
