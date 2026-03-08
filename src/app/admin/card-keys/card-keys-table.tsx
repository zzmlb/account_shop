"use client";

import {
  Key,
  Eye,
  EyeOff,
  Ban,
  CheckCircle,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { cn, formatDateTime } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types (local re-definitions)
// ---------------------------------------------------------------------------

interface CardKeyProduct {
  name: string;
  slug: string;
}

interface ApiCardKey {
  id: string;
  content: string;
  productId: string;
  product: CardKeyProduct;
  status: "AVAILABLE" | "SOLD" | "DISABLED";
  orderItemId: string | null;
  orderNo: string | null;
  soldAt: string | null;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function statusLabel(status: string): string {
  switch (status) {
    case "AVAILABLE":
      return "可用";
    case "SOLD":
      return "已售";
    case "DISABLED":
      return "已禁用";
    default:
      return status;
  }
}

function statusVariant(
  status: string
): "success" | "default" | "destructive" | "secondary" {
  switch (status) {
    case "AVAILABLE":
      return "success";
    case "SOLD":
      return "default";
    case "DISABLED":
      return "destructive";
    default:
      return "secondary";
  }
}

function maskContent(content: string): string {
  const parts = content.split("-");
  if (parts.length >= 4) {
    return `${parts[0]}-****-****-${parts[parts.length - 1]}`;
  }
  if (content.length > 8) {
    return `${content.slice(0, 4)}****${content.slice(-4)}`;
  }
  return "****";
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface CardKeysTableProps {
  cardKeys: ApiCardKey[];
  selectedIds: Set<string>;
  revealedKeys: Set<string>;
  mutating: boolean;
  onToggleSelectAll: () => void;
  onToggleSelect: (id: string) => void;
  onToggleReveal: (id: string) => void;
  onToggleStatus: (id: string, currentStatus: string) => void;
  onDelete: (id: string) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CardKeysTable({
  cardKeys,
  selectedIds,
  revealedKeys,
  mutating,
  onToggleSelectAll,
  onToggleSelect,
  onToggleReveal,
  onToggleStatus,
  onDelete,
}: CardKeysTableProps) {
  return (
    <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)]">
      <table className="w-full text-sm" aria-label="卡密管理列表">
        <thead>
          <tr className="border-b border-[var(--border)] bg-[var(--muted)]/50">
            <th className="w-10 px-4 py-3">
              <Checkbox
                checked={
                  cardKeys.filter((k) => k.status !== "SOLD").length > 0 &&
                  cardKeys
                    .filter((k) => k.status !== "SOLD")
                    .every((k) => selectedIds.has(k.id))
                }
                onCheckedChange={onToggleSelectAll}
                aria-label="全选"
              />
            </th>
            <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">
              商品
            </th>
            <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">
              卡密内容
            </th>
            <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">
              状态
            </th>
            <th className="hidden px-4 py-3 text-left font-medium text-[var(--muted-foreground)] md:table-cell">
              添加时间
            </th>
            <th className="hidden px-4 py-3 text-left font-medium text-[var(--muted-foreground)] lg:table-cell">
              售出时间
            </th>
            <th className="hidden px-4 py-3 text-left font-medium text-[var(--muted-foreground)] lg:table-cell">
              订单号
            </th>
            <th className="px-4 py-3 text-right font-medium text-[var(--muted-foreground)]">
              操作
            </th>
          </tr>
        </thead>
        <tbody>
          {cardKeys.length === 0 ? (
            <tr>
              <td colSpan={8} className="py-16 text-center">
                <div className="flex flex-col items-center">
                  <div className="mb-4 rounded-full bg-[var(--muted)] p-4">
                    <Key className="h-10 w-10 text-[var(--muted-foreground)]" />
                  </div>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    暂无卡密数据
                  </p>
                </div>
              </td>
            </tr>
          ) : (
            cardKeys.map((key) => (
              <tr
                key={key.id}
                className="border-b border-[var(--border)] last:border-b-0 transition-colors hover:bg-[var(--card-hover)]"
              >
                <td className="w-10 px-4 py-3">
                  {key.status !== "SOLD" ? (
                    <Checkbox
                      checked={selectedIds.has(key.id)}
                      onCheckedChange={() => onToggleSelect(key.id)}
                      aria-label={`选择 ${key.product.name} 卡密`}
                    />
                  ) : (
                    <div className="h-4 w-4" />
                  )}
                </td>
                <td className="px-4 py-3 font-medium">
                  {key.product.name}
                </td>
                <td className="px-4 py-3">
                  <code className="rounded-[var(--radius-sm)] bg-[var(--muted)] px-2 py-1 font-mono text-xs">
                    {revealedKeys.has(key.id)
                      ? key.content
                      : maskContent(key.content)}
                  </code>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={statusVariant(key.status)}>
                    {statusLabel(key.status)}
                  </Badge>
                </td>
                <td className="hidden px-4 py-3 text-[var(--muted-foreground)] md:table-cell">
                  {formatDateTime(key.createdAt)}
                </td>
                <td className="hidden px-4 py-3 text-[var(--muted-foreground)] lg:table-cell">
                  {key.soldAt ? formatDateTime(key.soldAt) : "-"}
                </td>
                <td className="hidden px-4 py-3 text-[var(--muted-foreground)] lg:table-cell">
                  {key.orderNo ? (
                    <code className="rounded-[var(--radius-sm)] bg-[var(--muted)] px-1.5 py-0.5 font-mono text-xs">
                      {key.orderNo}
                    </code>
                  ) : (
                    "-"
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onToggleReveal(key.id)}
                      title={
                        revealedKeys.has(key.id)
                          ? "隐藏卡密"
                          : "查看卡密"
                      }
                    >
                      {revealedKeys.has(key.id) ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                      <span className="ml-1 hidden sm:inline">
                        {revealedKeys.has(key.id) ? "隐藏" : "查看"}
                      </span>
                    </Button>
                    {key.status !== "SOLD" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={mutating}
                        onClick={() =>
                          onToggleStatus(key.id, key.status)
                        }
                        className={cn(
                          key.status === "AVAILABLE"
                            ? "text-[var(--destructive)] hover:text-[var(--destructive)]"
                            : "text-[var(--success)] hover:text-[var(--success)]"
                        )}
                      >
                        {key.status === "AVAILABLE" ? (
                          <Ban className="h-4 w-4" />
                        ) : (
                          <CheckCircle className="h-4 w-4" />
                        )}
                        <span className="ml-1 hidden sm:inline">
                          {key.status === "AVAILABLE"
                            ? "禁用"
                            : "启用"}
                        </span>
                      </Button>
                    )}
                    {key.status !== "SOLD" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={mutating}
                        className="text-[var(--destructive)] hover:text-[var(--destructive)]"
                        onClick={() => onDelete(key.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="ml-1 hidden sm:inline">
                          删除
                        </span>
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
