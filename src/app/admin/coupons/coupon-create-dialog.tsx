"use client";

import { useState } from "react";
import { Loader2, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { apiMutate } from "@/lib/api-fetch";

interface CouponCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CouponCreateDialog({
  open,
  onOpenChange,
  onSuccess,
}: CouponCreateDialogProps) {
  const [formCode, setFormCode] = useState("");
  const [formType, setFormType] = useState<"FIXED" | "PERCENTAGE">("FIXED");
  const [formValue, setFormValue] = useState("");
  const [formMinAmount, setFormMinAmount] = useState("");
  const [formMaxUses, setFormMaxUses] = useState("");
  const [formStartAt, setFormStartAt] = useState("");
  const [formExpireAt, setFormExpireAt] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  function resetForm() {
    setFormCode("");
    setFormType("FIXED");
    setFormValue("");
    setFormMinAmount("");
    setFormMaxUses("");
    setFormErrors({});
    const now = new Date();
    setFormStartAt(now.toISOString().slice(0, 16));
    const later = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    setFormExpireAt(later.toISOString().slice(0, 16));
  }

  function handleOpenChange(isOpen: boolean) {
    if (isOpen) resetForm();
    onOpenChange(isOpen);
  }

  function generateCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 8; i++)
      code += chars[Math.floor(Math.random() * chars.length)];
    setFormCode(code);
    setFormErrors((prev) => ({ ...prev, code: "" }));
  }

  function validate(): boolean {
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

    if (
      formStartAt &&
      formExpireAt &&
      new Date(formExpireAt) <= new Date(formStartAt)
    ) {
      errors.expireAt = "过期时间必须晚于开始时间";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleCreate() {
    if (!validate()) return;

    setSubmitting(true);
    try {
      await apiMutate("/api/admin/coupons", "POST", {
        code: formCode.trim(),
        type: formType,
        value: formValue,
        minAmount: formMinAmount || undefined,
        maxUses: formMaxUses || undefined,
        startAt: formStartAt,
        expireAt: formExpireAt,
      });
      toast.success("优惠券创建成功");
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "创建失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
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
                aria-invalid={!!formErrors.code}
                aria-describedby={
                  formErrors.code ? "coupon-code-error" : undefined
                }
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
              <p
                id="coupon-code-error"
                className="text-xs text-[var(--destructive)]"
              >
                {formErrors.code}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>优惠类型</Label>
              <Select
                value={formType}
                onValueChange={(v) =>
                  setFormType(v as "FIXED" | "PERCENTAGE")
                }
              >
                <SelectTrigger aria-label="优惠类型">
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
                placeholder={
                  formType === "FIXED" ? "金额 (元)" : "百分比 (1-100)"
                }
                value={formValue}
                onChange={(e) => {
                  setFormValue(e.target.value);
                  setFormErrors((prev) => ({ ...prev, value: "" }));
                }}
                className={
                  formErrors.value ? "border-[var(--destructive)]" : ""
                }
                aria-invalid={!!formErrors.value}
                aria-describedby={
                  formErrors.value ? "coupon-value-error" : undefined
                }
              />
              {formErrors.value && (
                <p
                  id="coupon-value-error"
                  className="text-xs text-[var(--destructive)]"
                >
                  {formErrors.value}
                </p>
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
                className={
                  formErrors.minAmount ? "border-[var(--destructive)]" : ""
                }
                aria-invalid={!!formErrors.minAmount}
                aria-describedby={
                  formErrors.minAmount ? "coupon-min-error" : undefined
                }
              />
              {formErrors.minAmount && (
                <p
                  id="coupon-min-error"
                  className="text-xs text-[var(--destructive)]"
                >
                  {formErrors.minAmount}
                </p>
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
                className={
                  formErrors.expireAt ? "border-[var(--destructive)]" : ""
                }
                aria-invalid={!!formErrors.expireAt}
                aria-describedby={
                  formErrors.expireAt ? "coupon-expire-error" : undefined
                }
              />
              {formErrors.expireAt && (
                <p
                  id="coupon-expire-error"
                  className="text-xs text-[var(--destructive)]"
                >
                  {formErrors.expireAt}
                </p>
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
                      const d = new Date(
                        Date.now() + days * 24 * 60 * 60 * 1000
                      );
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
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            取消
          </Button>
          <Button onClick={handleCreate} disabled={submitting}>
            {submitting ? (
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
  );
}
