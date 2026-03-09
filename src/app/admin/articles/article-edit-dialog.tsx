"use client";

import { useState, useEffect } from "react";
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

interface ArticleForEdit {
  id: string;
  title: string;
  category: string;
  content: string;
  isPublished: boolean;
}

interface ArticleEditDialogProps {
  article: ArticleForEdit | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ArticleEditDialog({
  article,
  open,
  onOpenChange,
  onSuccess,
}: ArticleEditDialogProps) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<string>("草稿");
  const [saving, setSaving] = useState(false);

  // Sync form state when article changes
  useEffect(() => {
    if (article) {
      setTitle(article.title);
      setCategory(article.category);
      setContent(article.content);
      setStatus(article.isPublished ? "已发布" : "草稿");
    }
  }, [article]);

  const handleSave = async () => {
    if (!article || !title.trim() || !category) return;
    setSaving(true);
    try {
      await apiMutate<{ success: boolean }>(
        `/api/admin/articles?id=${article.id}`,
        "PUT",
        {
          title: title.trim(),
          content: content.trim(),
          category,
          isPublished: status === "已发布",
        }
      );

      toast.success("文章更新成功");
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "更新文章失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>编辑文章</DialogTitle>
          <DialogDescription>
            修改文章信息，保存后立即生效
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="editArticleTitle">标题</Label>
            <Input
              id="editArticleTitle"
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
            onClick={handleSave}
            disabled={!title.trim() || !category || saving}
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            保存修改
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
