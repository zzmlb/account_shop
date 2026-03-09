"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
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
import dynamic from "next/dynamic";

const RichTextEditor = dynamic(
  () => import("@/components/shared/rich-text-editor"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[300px] animate-pulse rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--muted)]" />
    ),
  }
);

const CATEGORIES = ["公告", "教程", "帮助"];

interface ArticleCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ArticleCreateDialog({
  open,
  onOpenChange,
  onSuccess,
}: ArticleCreateDialogProps) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<string>("草稿");
  const [creating, setCreating] = useState(false);

  const resetForm = () => {
    setTitle("");
    setCategory("");
    setContent("");
    setStatus("草稿");
  };

  const handleCreate = async () => {
    if (!title.trim() || !category) return;
    setCreating(true);
    try {
      await apiMutate<{ success: boolean }>("/api/admin/articles", "POST", {
        title: title.trim(),
        content: content.trim(),
        category,
        excerpt: "",
        isPublished: status === "已发布",
      });

      toast.success("文章创建成功");
      resetForm();
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "创建文章失败");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>新建文章</DialogTitle>
          <DialogDescription>
            填写文章信息，保存后可在文章列表中查看
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="articleTitle">标题</Label>
            <Input
              id="articleTitle"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="请输入文章标题"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>分类</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="选择分类" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>状态</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="草稿">草稿</SelectItem>
                  <SelectItem value="已发布">已发布</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>内容</Label>
            <RichTextEditor
              content={content}
              onChange={setContent}
              placeholder="开始编辑文章内容..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!title.trim() || !category || creating}
          >
            {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            保存文章
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
