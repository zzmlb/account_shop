"use client";

import { useState, useEffect, useCallback } from "react";
import { useMemo } from "react";
import {
  Ticket,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
  Copy,
  Search,
  AlertTriangle,
  Eraser,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { apiFetch, apiMutate } from "@/lib/api-fetch";
import { cn } from "@/lib/utils";
import { CouponCreateDialog } from "./coupon-create-dialog";
import { CouponDeleteDialog } from "./coupon-delete-dialog";

interface Coupon {
  id: string;
  code: string;
  type: "FIXED" | "PERCENTAGE";
  value: number;
  minAmount: number | null;
  maxUses: number | null;
  usedCount: number;
  startAt: string;
  expireAt: string;
  isActive: boolean;
  createdAt: string;
  claimedCount: number;
}

export default function AdminCouponsContent() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "expired" | "inactive">("all");

  // Dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingCoupon, setDeletingCoupon] = useState<Coupon | null>(null);
  const [cleaningExpired, setCleaningExpired] = useState(false);

  const fetchCoupons = useCallback(async () => {
    try {
      const data = await apiFetch<{ coupons: Coupon[] }>("/api/admin/coupons");
      setCoupons(data.coupons);
    } catch {
      toast.error("加载优惠券失败");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);


  const toggleActive = async (coupon: Coupon) => {
    try {
      await apiMutate("/api/admin/coupons", "PUT", { id: coupon.id, isActive: !coupon.isActive });
      setCoupons((prev) =>
        prev.map((c) =>
          c.id === coupon.id ? { ...c, isActive: !c.isActive } : c
        )
      );
      toast.success(coupon.isActive ? "优惠券已停用" : "优惠券已启用");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "操作失败");
    }
  };


  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("已复制优惠码");
  };

  const handleCleanExpired = async () => {
    setCleaningExpired(true);
    try {
      const data = await apiMutate<{ message: string; deleted: number }>("/api/admin/coupons?mode=expired", "DELETE");
      toast.success(data.message || "清理完成");
      if (data.deleted > 0) fetchCoupons();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "清理失败");
    } finally {
      setCleaningExpired(false);
    }
  };

  const isExpired = (expireAt: string) => new Date(expireAt) < new Date();

  // Computed stats
  const stats = useMemo(() => {
    const now = new Date();
    const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const active = coupons.filter((c) => c.isActive && new Date(c.expireAt) > now).length;
    const expired = coupons.filter((c) => new Date(c.expireAt) <= now).length;
    const expiringSoon = coupons.filter(
      (c) => c.isActive && new Date(c.expireAt) > now && new Date(c.expireAt) <= sevenDays
    ).length;
    return { active, expired, expiringSoon };
  }, [coupons]);

  // Filtered coupons (by status tab + search query)
  const filteredCoupons = useMemo(() => {
    const now = new Date();
    let result = coupons;

    // Status filter
    if (statusFilter === "active") {
      result = result.filter((c) => c.isActive && new Date(c.expireAt) > now);
    } else if (statusFilter === "expired") {
      result = result.filter((c) => new Date(c.expireAt) <= now);
    } else if (statusFilter === "inactive") {
      result = result.filter((c) => !c.isActive && new Date(c.expireAt) > now);
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toUpperCase();
      result = result.filter((c) => c.code.toUpperCase().includes(q));
    }

    return result;
  }, [coupons, searchQuery, statusFilter]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-28" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-[var(--radius-md)]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-[var(--foreground)]">
            <Ticket className="h-6 w-6 text-[var(--primary)]" />
            优惠券管理
          </h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            共 {coupons.length} 张优惠券
          </p>
        </div>
        <div className="flex items-center gap-2">
          {stats.expired > 0 && (
            <Button
              variant="outline"
              onClick={handleCleanExpired}
              disabled={cleaningExpired}
              className="gap-1.5 text-[var(--muted-foreground)]"
            >
              {cleaningExpired ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Eraser className="h-4 w-4" />
              )}
              {cleaningExpired ? "清理中..." : "清理过期"}
            </Button>
          )}
          <Button onClick={() => setCreateDialogOpen(true)} className="gap-1.5">
            <Plus className="h-4 w-4" />
            创建优惠券
          </Button>
        </div>
      </div>

      {/* Stats badges */}
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant="secondary" className="gap-1.5 px-3 py-1.5">
          <Ticket className="h-3.5 w-3.5" />
          有效 {stats.active}
        </Badge>
        {stats.expiringSoon > 0 && (
          <Badge variant="outline" className="gap-1.5 border-[var(--warning)] text-[var(--warning)] px-3 py-1.5">
            <AlertTriangle className="h-3.5 w-3.5" />
            即将过期 {stats.expiringSoon}
          </Badge>
        )}
        <Badge variant="outline" className="gap-1.5 px-3 py-1.5">
          已过期 {stats.expired}
        </Badge>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1 rounded-[var(--radius-md)] bg-[var(--muted)] p-1">
        {([
          { key: "all" as const, label: "全部", count: coupons.length },
          { key: "active" as const, label: "有效", count: stats.active },
          { key: "expired" as const, label: "已过期", count: stats.expired },
          { key: "inactive" as const, label: "已停用", count: coupons.filter((c) => !c.isActive && new Date(c.expireAt) > new Date()).length },
        ]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={cn(
              "flex items-center gap-1.5 rounded-[var(--radius-sm)] px-3 py-1.5 text-sm font-medium transition-colors",
              statusFilter === tab.key
                ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm"
                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            )}
          >
            {tab.label}
            <span className={cn(
              "text-xs",
              statusFilter === tab.key ? "text-[var(--primary)]" : "text-[var(--muted-foreground)]"
            )}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      {coupons.length > 0 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <Input
            placeholder="搜索优惠码..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      {/* Coupon list */}
      {filteredCoupons.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-12 text-center">
          <Ticket className="mx-auto h-12 w-12 text-[var(--muted-foreground)]" />
          <p className="mt-4 text-[var(--muted-foreground)]">
            {searchQuery ? "未找到匹配的优惠券" : "暂无优惠券，点击上方按钮创建"}
          </p>
          {searchQuery && (
            <Button variant="ghost" size="sm" className="mt-2" onClick={() => setSearchQuery("")}>
              清除搜索
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] overflow-hidden">
          <div className="hidden sm:grid sm:grid-cols-[1fr_auto_auto_auto_auto_auto_auto] gap-4 border-b border-[var(--border)] bg-[var(--secondary)]/50 px-4 py-3 text-xs font-medium text-[var(--muted-foreground)]">
            <span>优惠券信息</span>
            <span className="w-20 text-center">类型</span>
            <span className="w-28 text-center">使用/领取</span>
            <span className="w-24 text-center">创建时间</span>
            <span className="w-28 text-center">有效期</span>
            <span className="w-16 text-center">状态</span>
            <span className="w-20 text-center">操作</span>
          </div>

          {filteredCoupons.map((coupon) => (
            <div
              key={coupon.id}
              className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto_auto_auto_auto] gap-3 sm:gap-4 items-center border-b last:border-b-0 border-[var(--border)] px-4 py-3 hover:bg-[var(--secondary)]/30 transition-colors"
            >
              {/* Code & value */}
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] bg-[var(--primary)]/10">
                  <Ticket className="h-4 w-4 text-[var(--primary)]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-[var(--foreground)]">
                      {coupon.code}
                    </span>
                    <button
                      onClick={() => copyCode(coupon.code)}
                      className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="text-xs text-[var(--muted-foreground)]">
                    {coupon.type === "FIXED"
                      ? `减 ¥${coupon.value}`
                      : `${coupon.value}% 折扣`}
                    {coupon.minAmount && ` (满 ¥${coupon.minAmount})`}
                  </div>
                </div>
              </div>

              {/* Type badge */}
              <div className="w-20 flex justify-center">
                <Badge variant={coupon.type === "FIXED" ? "default" : "secondary"}>
                  {coupon.type === "FIXED" ? "固定金额" : "百分比"}
                </Badge>
              </div>

              {/* Usage & claimed */}
              <div className="w-28 text-center">
                <div className="text-sm text-[var(--muted-foreground)]">
                  {coupon.usedCount}
                  {coupon.maxUses ? `/${coupon.maxUses}` : ""} 次
                </div>
                {coupon.claimedCount > 0 && (
                  <div className="flex items-center justify-center gap-1 text-xs text-[var(--muted-foreground)]/70">
                    <Users className="h-3 w-3" />
                    {coupon.claimedCount} 领取
                  </div>
                )}
              </div>

              {/* Creation date */}
              <div className="w-24 text-center">
                <span className="text-xs text-[var(--muted-foreground)]">
                  {new Date(coupon.createdAt).toLocaleDateString("zh-CN")}
                </span>
              </div>

              {/* Expiry */}
              <div className="w-28 text-center">
                <span className={`text-xs ${isExpired(coupon.expireAt) ? "text-[var(--destructive)]" : "text-[var(--muted-foreground)]"}`}>
                  {new Date(coupon.expireAt).toLocaleDateString("zh-CN")}
                </span>
              </div>

              {/* Status toggle */}
              <div className="w-16 flex justify-center">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 sm:h-8 sm:w-8"
                  onClick={() => toggleActive(coupon)}
                  title={coupon.isActive ? "点击停用" : "点击启用"}
                  aria-label={coupon.isActive ? "停用优惠券" : "启用优惠券"}
                >
                  {coupon.isActive && !isExpired(coupon.expireAt) ? (
                    <Eye className="h-4 w-4 text-[var(--success)]" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-[var(--muted-foreground)]" />
                  )}
                </Button>
              </div>

              {/* Actions */}
              <div className="w-20 flex justify-center">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 sm:h-8 sm:w-8 text-[var(--destructive)] hover:text-[var(--destructive)]"
                  onClick={() => {
                    setDeletingCoupon(coupon);
                    setDeleteDialogOpen(true);
                  }}
                  title="删除"
                  aria-label="删除优惠券"
                  disabled={coupon.usedCount > 0}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <CouponCreateDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={fetchCoupons}
      />

      <CouponDeleteDialog
        coupon={deletingCoupon}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onSuccess={() => {
          setDeletingCoupon(null);
          fetchCoupons();
        }}
      />
    </div>
  );
}
