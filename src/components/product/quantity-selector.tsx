"use client";

import { memo } from "react";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface QuantitySelectorProps {
  value: number;
  onChange: (value: number) => void;
  max: number;
  className?: string;
}

function QuantitySelectorInner({
  value,
  onChange,
  max,
  className,
}: QuantitySelectorProps) {
  const decrease = () => {
    if (value > 1) {
      onChange(value - 1);
    }
  };

  const increase = () => {
    if (value < max) {
      onChange(value + 1);
    }
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-[var(--radius-md)] border border-[var(--border)]",
        className
      )}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-9 w-9 rounded-none rounded-l-[var(--radius-md)]"
        onClick={decrease}
        disabled={value <= 1}
      >
        <Minus className="h-4 w-4" />
        <span className="sr-only">减少数量</span>
      </Button>
      <div className="flex h-9 w-12 items-center justify-center border-x border-[var(--border)] text-sm font-medium tabular-nums">
        {value}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-9 w-9 rounded-none rounded-r-[var(--radius-md)]"
        onClick={increase}
        disabled={value >= max}
      >
        <Plus className="h-4 w-4" />
        <span className="sr-only">增加数量</span>
      </Button>
    </div>
  );
}

const QuantitySelector = memo(QuantitySelectorInner);
export default QuantitySelector;
