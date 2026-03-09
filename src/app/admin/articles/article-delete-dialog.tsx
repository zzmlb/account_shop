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

interface ArticleDeleteDialogProps {
  article: { id: string; title: string } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ArticleDeleteDialog({
  article,
  open,
  onOpenChange,
  onSuccess,
}: ArticleDeleteDialogProps) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!article) return;
    setDeleting(true);
    try {
      await apiMutate<{ success: boolean }>(
        `/api/admin/articles?id=${article.id}`,
        "DELETE"
      );

      toast.success("文章已删除");
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "删除文章失败");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>确认删除</DialogTitle>
          <DialogDescription>
            确定要删除文章「{article?.title}」吗？此操作无法撤销。
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            确认删除
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
