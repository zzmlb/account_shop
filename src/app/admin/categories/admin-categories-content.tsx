"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FolderTree,
  Plus,
  Edit3,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
  GripVertical,
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
import { toast } from "sonner";
import { apiFetch, apiMutate } from "@/lib/api-fetch";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  sortOrder: number;
  isActive: boolean;
  productCount: number;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AdminCategoriesContent() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Form fields
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formIcon, setFormIcon] = useState("");
  const [formSortOrder, setFormSortOrder] = useState(0);

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);

  // ----- Fetch categories -----
  const fetchCategories = useCallback(async () => {
    try {
      const data = await apiFetch<{ categories: Category[] }>("/api/admin/categories");
      setCategories(data.categories);
    } catch {
      toast.error("加载分类失败");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // ----- Open create dialog -----
  const openCreateDialog = () => {
    setEditingCategory(null);
    setFormName("");
    setFormDescription("");
    setFormIcon("");
    setFormSortOrder(categories.length);
    setDialogOpen(true);
  };

  // ----- Open edit dialog -----
  const openEditDialog = (cat: Category) => {
    setEditingCategory(cat);
    setFormName(cat.name);
    setFormDescription(cat.description || "");
    setFormIcon(cat.icon || "");
    setFormSortOrder(cat.sortOrder);
    setDialogOpen(true);
  };

  // ----- Save (create or update) -----
  const handleSave = async () => {
    if (!formName.trim()) {
      toast.error("请输入分类名称");
      return;
    }

    setIsMutating(true);
    try {
      const payload = {
        ...(editingCategory ? { id: editingCategory.id } : {}),
        name: formName.trim(),
        description: formDescription.trim(),
        icon: formIcon.trim(),
        sortOrder: formSortOrder,
      };
      await apiMutate("/api/admin/categories", editingCategory ? "PUT" : "POST", payload);
      toast.success(editingCategory ? "分类更新成功" : "分类创建成功");
      setDialogOpen(false);
      fetchCategories();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "操作失败");
    } finally {
      setIsMutating(false);
    }
  };

  // ----- Toggle active status -----
  const toggleActive = async (cat: Category) => {
    try {
      await apiMutate("/api/admin/categories", "PUT", { id: cat.id, isActive: !cat.isActive });
      setCategories((prev) =>
        prev.map((c) =>
          c.id === cat.id ? { ...c, isActive: !c.isActive } : c
        )
      );
      toast.success(cat.isActive ? "分类已隐藏" : "分类已启用");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "操作失败");
    }
  };

  // ----- Delete -----
  const handleDelete = async () => {
    if (!deletingCategory) return;

    setIsMutating(true);
    try {
      await apiMutate(`/api/admin/categories?id=${deletingCategory.id}`, "DELETE");
      toast.success("分类已删除");
      setDeleteDialogOpen(false);
      setDeletingCategory(null);
      fetchCategories();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "删除失败");
    } finally {
      setIsMutating(false);
    }
  };

  // ----- Loading skeleton -----
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
            <FolderTree className="h-6 w-6 text-[var(--primary)]" />
            分类管理
          </h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            共 {categories.length} 个分类
          </p>
        </div>
        <Button onClick={openCreateDialog} className="gap-1.5">
          <Plus className="h-4 w-4" />
          新建分类
        </Button>
      </div>

      {/* Category list */}
      {categories.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-12 text-center">
          <FolderTree className="mx-auto h-12 w-12 text-[var(--muted-foreground)]" />
          <p className="mt-4 text-[var(--muted-foreground)]">
            暂无分类，点击上方按钮创建
          </p>
        </div>
      ) : (
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] overflow-hidden">
          <div className="hidden sm:grid sm:grid-cols-[1fr_auto_auto_auto_auto] gap-4 border-b border-[var(--border)] bg-[var(--secondary)]/50 px-4 py-3 text-xs font-medium text-[var(--muted-foreground)]">
            <span>分类信息</span>
            <span className="w-20 text-center">排序</span>
            <span className="w-20 text-center">商品数</span>
            <span className="w-16 text-center">状态</span>
            <span className="w-24 text-center">操作</span>
          </div>

          {categories.map((cat) => (
            <div
              key={cat.id}
              className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto_auto] gap-3 sm:gap-4 items-center border-b last:border-b-0 border-[var(--border)] px-4 py-3 hover:bg-[var(--secondary)]/30 transition-colors"
            >
              {/* Name & info */}
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] bg-[var(--primary)]/10 text-lg">
                  {cat.icon || "📁"}
                </div>
                <div>
                  <div className="font-medium text-[var(--foreground)]">
                    {cat.name}
                  </div>
                  <div className="text-xs text-[var(--muted-foreground)]">
                    /{cat.slug}
                    {cat.description && (
                      <span className="ml-2">{cat.description}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Sort order */}
              <div className="flex items-center gap-1 w-20 justify-center">
                <GripVertical className="h-3 w-3 text-[var(--muted-foreground)]" />
                <span className="text-sm text-[var(--muted-foreground)]">
                  {cat.sortOrder}
                </span>
              </div>

              {/* Product count */}
              <div className="w-20 text-center">
                <Badge variant="secondary" className="text-xs">
                  {cat.productCount} 商品
                </Badge>
              </div>

              {/* Status toggle */}
              <div className="w-16 flex justify-center">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 sm:h-8 sm:w-8"
                  onClick={() => toggleActive(cat)}
                  title={cat.isActive ? "点击隐藏" : "点击启用"}
                  aria-label={cat.isActive ? "隐藏分类" : "启用分类"}
                >
                  {cat.isActive ? (
                    <Eye className="h-4 w-4 text-[var(--success)]" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-[var(--muted-foreground)]" />
                  )}
                </Button>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 w-24 justify-center">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 sm:h-8 sm:w-8"
                  onClick={() => openEditDialog(cat)}
                  title="编辑"
                  aria-label="编辑分类"
                >
                  <Edit3 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 sm:h-8 sm:w-8 text-[var(--destructive)] hover:text-[var(--destructive)]"
                  onClick={() => {
                    setDeletingCategory(cat);
                    setDeleteDialogOpen(true);
                  }}
                  title="删除"
                  aria-label="删除分类"
                  disabled={cat.productCount > 0}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "编辑分类" : "新建分类"}
            </DialogTitle>
            <DialogDescription>
              {editingCategory
                ? "修改分类信息后点击保存"
                : "填写分类信息以创建新分类"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="cat-name">
                分类名称 <span className="text-[var(--destructive)]">*</span>
              </Label>
              <Input
                id="cat-name"
                placeholder="例如: 软件工具"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cat-desc">描述</Label>
              <Input
                id="cat-desc"
                placeholder="简短描述该分类"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cat-icon">图标 (emoji)</Label>
                <Input
                  id="cat-icon"
                  placeholder="例如: 💻"
                  value={formIcon}
                  onChange={(e) => setFormIcon(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cat-order">排序</Label>
                <Input
                  id="cat-order"
                  type="number"
                  value={formSortOrder}
                  onChange={(e) =>
                    setFormSortOrder(parseInt(e.target.value) || 0)
                  }
                />
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
            <Button onClick={handleSave} disabled={isMutating}>
              {isMutating ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  保存中...
                </>
              ) : (
                "保存"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除分类「{deletingCategory?.name}」吗？此操作无法撤销。
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
