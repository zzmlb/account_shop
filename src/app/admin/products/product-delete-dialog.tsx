"use client";

import { useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { apiMutate } from "@/lib/api-fetch";

interface ProductDeleteDialogProps {
  target: string | string[] | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  onClearSelection?: (ids: string[]) => void;
}

export function ProductDeleteDialog({
  target,
  open,
  onOpenChange,
  onSuccess,
  onClearSelection,
}: ProductDeleteDialogProps) {
  const [deleting, setDeleting] = useState(false);

  async function handleConfirm() {
    if (!target) return;
    const idsToDelete = Array.isArray(target) ? target : [target];

    setDeleting(true);
    try {
      const results = await Promise.allSettled(
        idsToDelete.map((id) =>
          apiMutate(`/api/admin/products?id=${id}`, "DELETE")
        )
      );
      const failures = results.filter((r) => r.status === "rejected");
      if (failures.length > 0) {
        toast.warning(
          `部分删除失败: ${failures.length}/${idsToDelete.length} 件商品未能删除`
        );
      } else {
        toast.success(
          idsToDelete.length === 1
            ? "商品已删除(下架)"
            : `已删除(下架) ${idsToDelete.length} 件商品`
        );
      }
      onClearSelection?.(idsToDelete);
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      toast.error("删除失败", {
        description: err instanceof Error ? err.message : "未知错误",
      });
    } finally {
      setDeleting(false);
    }
  }

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
          {Array.isArray(target)
            ? `确定要删除选中的 ${target.length} 件商品吗？商品将被下架处理。`
            : "确定要删除该商品吗？商品将被下架处理。"}
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            variant="destructive"
            disabled={deleting}
            onClick={handleConfirm}
          >
            {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
            确认删除
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
