"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
  /** Show clickable page number buttons with ellipsis */
  showPageNumbers?: boolean;
  /** Custom label for total, e.g. "条订单" or "件商品". Default "条" */
  totalLabel?: string;
  /** Extra wrapper className */
  className?: string;
}

function getPageNumbers(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages: (number | "ellipsis")[] = [1];
  if (current > 3) pages.push("ellipsis");
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
    pages.push(i);
  }
  if (current < total - 2) pages.push("ellipsis");
  pages.push(total);
  return pages;
}

export default function Pagination({
  page,
  totalPages,
  total,
  onPageChange,
  showPageNumbers = false,
  totalLabel = "条",
  className,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className={`flex items-center justify-between pt-2 ${className ?? ""}`}>
      <p className="text-sm text-[var(--muted-foreground)]">
        共 {total} {totalLabel}，第 {page}/{totalPages} 页
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
        >
          <ChevronLeft className="h-4 w-4" />
          上一页
        </Button>
        {showPageNumbers &&
          getPageNumbers(page, totalPages).map((item, idx) =>
            item === "ellipsis" ? (
              <span
                key={`ellipsis-${idx}`}
                className="px-1 text-sm text-[var(--muted-foreground)]"
              >
                ...
              </span>
            ) : (
              <Button
                key={item}
                variant={item === page ? "default" : "outline"}
                size="sm"
                onClick={() => onPageChange(item)}
                className="h-8 w-8 p-0"
              >
                {item}
              </Button>
            )
          )}
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        >
          下一页
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
