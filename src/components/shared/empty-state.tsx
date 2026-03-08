import { PackageOpen, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export default function EmptyState({
  icon: Icon = PackageOpen,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 text-center",
        className
      )}
    >
      <div className="mb-4 rounded-full bg-[var(--muted)] p-4">
        <Icon className="h-10 w-10 text-[var(--muted-foreground)]" />
      </div>
      <h3 className="mb-1 text-lg font-semibold text-[var(--foreground)]">
        {title}
      </h3>
      {description && (
        <p className="mb-4 max-w-sm text-sm text-[var(--muted-foreground)]">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <Button onClick={onAction} variant="outline">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
