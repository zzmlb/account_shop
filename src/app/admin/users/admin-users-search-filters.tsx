"use client";

import { useState } from "react";
import { Search, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface AdminUsersSearchFiltersProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  roleFilter: string;
  onRoleFilterChange: (v: string) => void;
  statusFilter: string;
  onStatusFilterChange: (v: string) => void;
  sortBy: string;
  onSortByChange: (v: string) => void;
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (v: string) => void;
  onDateToChange: (v: string) => void;
}

export function AdminUsersSearchFilters({
  searchQuery,
  onSearchChange,
  roleFilter,
  onRoleFilterChange,
  statusFilter,
  onStatusFilterChange,
  sortBy,
  onSortByChange,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
}: AdminUsersSearchFiltersProps) {
  const [showDateFilter, setShowDateFilter] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative max-w-sm flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
        <Input
          placeholder="搜索用户名或邮箱..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>
      <select
        value={roleFilter}
        onChange={(e) => onRoleFilterChange(e.target.value)}
        aria-label="按角色筛选"
        className="h-9 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)]"
      >
        <option value="">全部角色</option>
        <option value="USER">用户</option>
        <option value="ADMIN">管理员</option>
        <option value="SUPER_ADMIN">超级管理员</option>
      </select>
      <select
        value={statusFilter}
        onChange={(e) => onStatusFilterChange(e.target.value)}
        aria-label="按状态筛选"
        className="h-9 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)]"
      >
        <option value="">全部状态</option>
        <option value="ACTIVE">正常</option>
        <option value="BANNED">已封禁</option>
      </select>
      <select
        value={sortBy}
        onChange={(e) => onSortByChange(e.target.value)}
        aria-label="排序方式"
        className="h-9 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)]"
      >
        <option value="">最新注册</option>
        <option value="oldest">最早注册</option>
        <option value="balance-desc">余额最高</option>
        <option value="balance-asc">余额最低</option>
      </select>
      <div className="relative">
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "gap-2",
            dateFrom || dateTo
              ? "text-[var(--primary)] border-[var(--primary)]/50"
              : "text-[var(--muted-foreground)]"
          )}
          onClick={() => setShowDateFilter(!showDateFilter)}
        >
          <CalendarDays className="h-4 w-4" />
          {dateFrom || dateTo ? `${dateFrom || "..."}~${dateTo || "..."}` : "注册日期"}
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
    </div>
  );
}
