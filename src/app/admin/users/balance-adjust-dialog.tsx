"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiMutate } from "@/lib/api-fetch";

interface BalanceAdjustDialogProps {
  user: { id: string; username: string; balance: number } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function BalanceAdjustDialog({
  user,
  open,
  onOpenChange,
  onSuccess,
}: BalanceAdjustDialogProps) {
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user || !adjustAmount) return;
    const amount = parseFloat(adjustAmount);
    if (isNaN(amount)) return;

    setSubmitting(true);
    try {
      await apiMutate(`/api/admin/users?id=${user.id}`, "PUT", {
        balanceAdjust: amount,
      });
      toast.success(
        `已调整用户 ${user.username} 的余额：${amount >= 0 ? "+" : ""}${amount.toFixed(2)}`
      );
      onOpenChange(false);
      setAdjustAmount("");
      setAdjustReason("");
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "余额调整失败");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setAdjustAmount("");
      setAdjustReason("");
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>调整余额</DialogTitle>
          <DialogDescription>
            为用户{" "}
            <span className="font-medium text-[var(--foreground)]">
              {user?.username}
            </span>{" "}
            调整账户余额。 当前余额：¥
            {user ? Number(user.balance).toFixed(2) : "0.00"}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="adjust-amount">调整金额</Label>
            <Input
              id="adjust-amount"
              type="number"
              step="0.01"
              placeholder="正数为充值，负数为扣除"
              value={adjustAmount}
              onChange={(e) => setAdjustAmount(e.target.value)}
            />
            <p className="text-xs text-[var(--muted-foreground)]">
              输入正数增加余额，输入负数扣减余额
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="adjust-reason">调整原因</Label>
            <Input
              id="adjust-reason"
              placeholder="请输入调整原因..."
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value)}
            />
          </div>
          {adjustAmount && !isNaN(parseFloat(adjustAmount)) && user && (
            <div className="rounded-[var(--radius-md)] bg-[var(--muted)] p-3">
              <p className="text-sm text-[var(--muted-foreground)]">
                调整后余额：
                <span className="font-semibold text-[var(--foreground)] ml-1">
                  ¥
                  {Math.max(
                    0,
                    Number(user.balance) + parseFloat(adjustAmount)
                  ).toFixed(2)}
                </span>
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            取消
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              !adjustAmount || isNaN(parseFloat(adjustAmount)) || submitting
            }
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                处理中...
              </>
            ) : (
              "确认调整"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
