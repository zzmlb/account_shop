"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { apiMutate } from "@/lib/api-fetch";

interface CouponDeleteDialogProps {
  coupon: { id: string; code: string } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CouponDeleteDialog({
  coupon,
  open,
  onOpenChange,
  onSuccess,
}: CouponDeleteDialogProps) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!coupon) return;
    setDeleting(true);
    try {
      await apiMutate(`/api/admin/coupons?id=${coupon.id}`, "DELETE");
      toast.success("优惠券已删除");
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "删除失败");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>确认删除</DialogTitle>
          <DialogDescription>
            确定要删除优惠券「{coupon?.code}」吗？此操作无法撤销。
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleting}
          >
            取消
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? (
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
  );
}
