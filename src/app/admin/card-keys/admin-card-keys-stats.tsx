"use client";

import { Key, CheckCircle, Package, Ban } from "lucide-react";
import { cn } from "@/lib/utils";

interface Stats {
  total: number;
  available: number;
  sold: number;
  disabled: number;
}

const STAT_CONFIG = [
  {
    key: "total" as const,
    label: "总卡密数",
    icon: Key,
    color: "text-[var(--foreground)]",
    bg: "bg-[var(--muted)]",
  },
  {
    key: "available" as const,
    label: "可用",
    icon: CheckCircle,
    color: "text-[var(--success)]",
    bg: "bg-[var(--success)]/10",
  },
  {
    key: "sold" as const,
    label: "已售",
    icon: Package,
    color: "text-[var(--primary)]",
    bg: "bg-[var(--primary)]/10",
  },
  {
    key: "disabled" as const,
    label: "已禁用",
    icon: Ban,
    color: "text-[var(--destructive)]",
    bg: "bg-[var(--destructive)]/10",
  },
];

interface AdminCardKeysStatsProps {
  stats: Stats;
}

export function AdminCardKeysStats({ stats }: AdminCardKeysStatsProps) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {STAT_CONFIG.map((stat) => (
        <div
          key={stat.label}
          className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-4"
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)]",
                stat.bg
              )}
            >
              <stat.icon className={cn("h-5 w-5", stat.color)} />
            </div>
            <div>
              <p className="text-sm text-[var(--muted-foreground)]">
                {stat.label}
              </p>
              <p className="text-xl font-bold">
                {stats[stat.key].toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
