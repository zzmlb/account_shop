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
  Shuffle,
  Eraser,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
  const [isMutating, setIsMutating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "expired" | "inactive">("all");

  // Create dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formCode, setFormCode] = useState("");
  const [formType, setFormType] = useState<"FIXED" | "PERCENTAGE">("FIXED");
  const [formValue, setFormValue] = useState("");
  const [formMinAmount, setFormMinAmount] = useState("");
  const [formMaxUses, setFormMaxUses] = useState("");
  const [formStartAt, setFormStartAt] = useState("");
  const [formExpireAt, setFormExpireAt] = useState("");

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingCoupon, setDeletingCoupon] = useState<Coupon | null>(null);
  const [cleaningExpired, setCleaningExpired] = useState(false);

  const fetchCoupons = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/coupons");
      const data = await res.json();
      if (data.success) {
        setCoupons(data.coupons);
      }
    } catch {
      toast.error("加载优惠券失败");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  const openCreateDialog = () => {
    setFormCode("");
    setFormType("FIXED");
    setFormValue("");
    setFormMinAmount("");
    setFormMaxUses("");
    setFormErrors({});
    // Default: start now, expire in 30 days
    const now = new Date();
    setFormStartAt(now.toISOString().slice(0, 16));
    const later = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    setFormExpireAt(later.toISOString().slice(0, 16));
    setDialogOpen(true);
  };

  // Validation state
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formCode.trim()) {
      errors.code = "请输入优惠码";
    } else if (!/^[A-Z0-9]+$/.test(formCode.trim())) {
      errors.code = "优惠码只能包含大写字母和数字";
    }

    const numValue = Number(formValue);
    if (!formValue || isNaN(numValue) || numValue <= 0) {
      errors.value = "请输入有效的优惠值";
    } else if (formType === "PERCENTAGE" && numValue > 100) {
      errors.value = "百分比不能超过100";
    }

    if (formMinAmount) {
      const numMin = Number(formMinAmount);
      if (isNaN(numMin) || numMin < 0) {
        errors.minAmount = "最低消费不能为负数";
      }
    }

    if (formStartAt && formExpireAt && new Date(formExpireAt) <= new Date(formStartAt)) {
      errors.expireAt = "过期时间必须晚于开始时间";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreate = async () => {
    if (!validateForm()) return;

    setIsMutating(true);
    try {
      const res = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: formCode.trim(),
          type: formType,
          value: formValue,
          minAmount: formMinAmount || undefined,
          maxUses: formMaxUses || undefined,
          startAt: formStartAt,
          expireAt: formExpireAt,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("优惠券创建成功");
        setDialogOpen(false);
        fetchCoupons();
      } else {
        toast.error(data.message || "创建失败");
      }
    } catch {
      toast.error("创建失败");
    } finally {
      setIsMutating(false);
    }
  };

  const toggleActive = async (coupon: Coupon) => {
    try {
      const res = await fetch("/api/admin/coupons", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: coupon.id, isActive: !coupon.isActive }),
      });
      const data = await res.json();
      if (data.success) {
        setCoupons((prev) =>
          prev.map((c) =>
            c.id === coupon.id ? { ...c, isActive: !c.isActive } : c
          )
        );
        toast.success(coupon.isActive ? "优惠券已停用" : "优惠券已启用");
      } else {
        toast.error(data.message || "操作失败");
      }
    } catch {
      toast.error("操作失败");
    }
  };

  const handleDelete = async () => {
    if (!deletingCoupon) return;
    setIsMutating(true);
    try {
      const res = await fetch(
        `/api/admin/coupons?id=${deletingCoupon.id}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (data.success) {
        toast.success("优惠券已删除");
        setDeleteDialogOpen(false);
        setDeletingCoupon(null);
        fetchCoupons();
      } else {
        toast.error(data.message || "删除失败");
      }
    } catch {
      toast.error("删除失败");
    } finally {
      setIsMutating(false);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("已复制优惠码");
  };

  const generateCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
    setFormCode(code);
    setFormErrors((prev) => ({ ...prev, code: "" }));
  };

  const handleCleanExpired = async () => {
    setCleaningExpired(true);
    try {
      const res = await fetch("/api/admin/coupons?mode=expired", {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || "清理完成");
        if (data.deleted > 0) fetchCoupons();
      } else {
        toast.error(data.message || "清理失败");
      }
    } catch {
      toast.error("清理失败");
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
          <Button onClick={openCreateDialog} className="gap-1.5">
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

              {/* Usage */}
              <div className="w-24 text-center text-sm text-[var(--muted-foreground)]">
                {coupon.usedCount}
                {coupon.maxUses ? `/${coupon.maxUses}` : ""} 次
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
                  disabled={coupon.usedCount > 0}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>创建优惠券</DialogTitle>
            <DialogDescription>填写优惠券信息</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="coupon-code">
                优惠码 <span className="text-[var(--destructive)]">*</span>
              </Label>
              <div className="flex gap-2">
                <Input
                  id="coupon-code"
                  placeholder="例如: WELCOME20"
                  value={formCode}
                  onChange={(e) => {
                    setFormCode(e.target.value.toUpperCase());
                    setFormErrors((prev) => ({ ...prev, code: "" }));
                  }}
                  className={`flex-1 font-mono ${formErrors.code ? "border-[var(--destructive)]" : ""}`}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={generateCode}
                  title="自动生成优惠码"
                >
                  <Shuffle className="h-4 w-4" />
                </Button>
              </div>
              {formErrors.code && (
                <p className="text-xs text-[var(--destructive)]">{formErrors.code}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>优惠类型</Label>
                <Select
                  value={formType}
                  onValueChange={(v) => setFormType(v as "FIXED" | "PERCENTAGE")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FIXED">固定金额</SelectItem>
                    <SelectItem value="PERCENTAGE">百分比</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="coupon-value">
                  优惠值 <span className="text-[var(--destructive)]">*</span>
                </Label>
                <Input
                  id="coupon-value"
                  type="number"
                  placeholder={formType === "FIXED" ? "金额 (元)" : "百分比 (1-100)"}
                  value={formValue}
                  onChange={(e) => {
                    setFormValue(e.target.value);
                    setFormErrors((prev) => ({ ...prev, value: "" }));
                  }}
                  className={formErrors.value ? "border-[var(--destructive)]" : ""}
                />
                {formErrors.value && (
                  <p className="text-xs text-[var(--destructive)]">{formErrors.value}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="coupon-min">最低消费 (可选)</Label>
                <Input
                  id="coupon-min"
                  type="number"
                  placeholder="¥0"
                  value={formMinAmount}
                  onChange={(e) => {
                    setFormMinAmount(e.target.value);
                    setFormErrors((prev) => ({ ...prev, minAmount: "" }));
                  }}
                  className={formErrors.minAmount ? "border-[var(--destructive)]" : ""}
                />
                {formErrors.minAmount && (
                  <p className="text-xs text-[var(--destructive)]">{formErrors.minAmount}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="coupon-max-uses">最大使用次数 (可选)</Label>
                <Input
                  id="coupon-max-uses"
                  type="number"
                  placeholder="不限"
                  value={formMaxUses}
                  onChange={(e) => setFormMaxUses(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="coupon-start">开始时间</Label>
                <Input
                  id="coupon-start"
                  type="datetime-local"
                  value={formStartAt}
                  onChange={(e) => setFormStartAt(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="coupon-expire">过期时间</Label>
                <Input
                  id="coupon-expire"
                  type="datetime-local"
                  value={formExpireAt}
                  onChange={(e) => {
                    setFormExpireAt(e.target.value);
                    setFormErrors((prev) => ({ ...prev, expireAt: "" }));
                  }}
                  className={formErrors.expireAt ? "border-[var(--destructive)]" : ""}
                />
                {formErrors.expireAt && (
                  <p className="text-xs text-[var(--destructive)]">{formErrors.expireAt}</p>
                )}
                {/* Quick presets */}
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: "7天", days: 7 },
                    { label: "30天", days: 30 },
                    { label: "90天", days: 90 },
                    { label: "365天", days: 365 },
                  ].map(({ label, days }) => (
                    <button
                      key={days}
                      type="button"
                      className="rounded-[var(--radius-sm)] border border-[var(--border)] px-2 py-0.5 text-xs text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                      onClick={() => {
                        const d = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
                        setFormExpireAt(d.toISOString().slice(0, 16));
                        setFormErrors((prev) => ({ ...prev, expireAt: "" }));
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={isMutating}
            >
              取消
            </Button>
            <Button onClick={handleCreate} disabled={isMutating}>
              {isMutating ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  创建中...
                </>
              ) : (
                "创建"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除优惠券「{deletingCoupon?.code}」吗？此操作无法撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isMutating}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isMutating}
            >
              {isMutating ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  删除中...
                </>
              ) : (
                "确认删除"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
