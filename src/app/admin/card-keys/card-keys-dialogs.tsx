"use client";

import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// DeleteCardKeyDialog
// ---------------------------------------------------------------------------

export interface DeleteCardKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mutating: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteCardKeyDialog({
  open,
  onOpenChange,
  mutating,
  onConfirm,
  onCancel,
}: DeleteCardKeyDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-[var(--destructive)]" />
            确认删除
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-[var(--muted-foreground)]">
          确定要删除该卡密吗？此操作不可撤销。
        </p>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={mutating}
          >
            取消
          </Button>
          <Button
            variant="destructive"
            disabled={mutating}
            onClick={onConfirm}
          >
            {mutating && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            确认删除
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// BatchActionDialog
// ---------------------------------------------------------------------------

export interface BatchActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  batchAction: string | null;
  selectedCount: number;
  mutating: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function BatchActionDialog({
  open,
  onOpenChange,
  batchAction,
  selectedCount,
  mutating,
  onConfirm,
  onCancel,
}: BatchActionDialogProps) {
  const actionLabel =
    batchAction === "enable"
      ? "启用"
      : batchAction === "disable"
        ? "禁用"
        : "删除";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle
              className={cn(
                "h-5 w-5",
                batchAction === "delete"
                  ? "text-[var(--destructive)]"
                  : "text-[var(--primary)]"
              )}
            />
            确认批量{actionLabel}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-[var(--muted-foreground)]">
          确定要{actionLabel} {selectedCount} 个卡密吗？
          {batchAction === "delete" && "此操作不可撤销。"}
        </p>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={mutating}
          >
            取消
          </Button>
          <Button
            variant={batchAction === "delete" ? "destructive" : "default"}
            disabled={mutating}
            onClick={onConfirm}
          >
            {mutating && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            确认
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
