"use client";

import { useState, useRef } from "react";
import { Search, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface AdminOrdersSearchFiltersProps {
  onSearchChange: (query: string) => void;
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (v: string) => void;
  onDateToChange: (v: string) => void;
  paymentFilter: string;
  onPaymentFilterChange: (v: string) => void;
}

export function AdminOrdersSearchFilters({
  onSearchChange,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  paymentFilter,
  onPaymentFilterChange,
}: AdminOrdersSearchFiltersProps) {
  const [searchInput, setSearchInput] = useState("");
  const [showDateFilter, setShowDateFilter] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchInputChange = (value: string) => {
    setSearchInput(value);
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }
    searchTimerRef.current = setTimeout(() => {
      onSearchChange(value);
    }, 400);
  };

  return (
    <div className="flex items-center gap-3">
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
        <Input
          placeholder="搜索订单号或邮箱..."
          value={searchInput}
          onChange={(e) => handleSearchInputChange(e.target.value)}
          className="pl-9"
          aria-label="搜索订单"
        />
      </div>
      <div className="relative">
        <Button
          variant="outline"
          size="sm"
          className={`gap-2 ${dateFrom || dateTo ? "text-[var(--primary)] border-[var(--primary)]/50" : "text-[var(--muted-foreground)]"}`}
          onClick={() => setShowDateFilter(!showDateFilter)}
          aria-expanded={showDateFilter}
          aria-label="日期范围筛选"
        >
          <CalendarDays className="h-4 w-4" />
          {dateFrom || dateTo ? `${dateFrom || "..."}~${dateTo || "..."}` : "日期范围"}
        </Button>
        {showDateFilter && (
          <div className="absolute right-0 top-full z-20 mt-2 w-72 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-4 shadow-lg">
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--muted-foreground)]">
                  开始日期
                </label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => onDateFromChange(e.target.value)}
                  className="text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--muted-foreground)]">
                  结束日期
                </label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => onDateToChange(e.target.value)}
                  className="text-sm"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    onDateFromChange("");
                    onDateToChange("");
                    setShowDateFilter(false);
                  }}
                >
                  清除
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => setShowDateFilter(false)}
                >
                  确认
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
      {/* Payment method filter */}
      <select
        value={paymentFilter}
        onChange={(e) => onPaymentFilterChange(e.target.value)}
        className={`h-9 rounded-[var(--radius-md)] border px-3 text-sm transition-colors bg-transparent ${
          paymentFilter
            ? "border-[var(--primary)]/50 text-[var(--primary)]"
            : "border-[var(--border)] text-[var(--muted-foreground)]"
        }`}
        aria-label="支付方式筛选"
      >
        <option value="">全部支付方式</option>
        <option value="balance">余额</option>
        <option value="alipay">支付宝</option>
        <option value="wechat">微信</option>
        <option value="usdt">USDT</option>
      </select>
    </div>
  );
}
