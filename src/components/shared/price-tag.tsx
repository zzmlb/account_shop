import { cn } from "@/lib/utils";

interface PriceTagProps {
  price: number;
  originalPrice?: number;
  className?: string;
}

export default function PriceTag({
  price,
  originalPrice,
  className,
}: PriceTagProps) {
  const discount =
    originalPrice && originalPrice > price
      ? Math.round(((originalPrice - price) / originalPrice) * 100)
      : null;

  return (
    <div className={cn("flex items-baseline gap-2", className)}>
      <span className="text-2xl font-bold text-[var(--primary)]">
        <span className="text-base">¥</span>
        {price.toFixed(2)}
      </span>
      {originalPrice && originalPrice > price && (
        <span className="text-sm text-[var(--muted-foreground)] line-through">
          ¥{originalPrice.toFixed(2)}
        </span>
      )}
      {discount && (
        <span className="rounded-[var(--radius-sm)] bg-[var(--destructive)] px-1.5 py-0.5 text-xs font-semibold text-[var(--destructive-foreground)]">
          -{discount}%
        </span>
      )}
    </div>
  );
}
