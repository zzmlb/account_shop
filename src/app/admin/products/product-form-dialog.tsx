"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { type Category } from "./product-types";

export interface ProductFormState {
  name: string;
  slug: string;
  categoryId: string;
  price: string;
  originalPrice: string;
  stockCount: string;
  description: string;
  image: string;
  images: string[];
  status: "上架" | "下架";
  tags: string;
  afterSaleHours: string;
  sortOrder: string;
}

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isEditing: boolean;
  form: ProductFormState;
  formErrors: Record<string, string>;
  categories: Category[];
  isUploading: boolean;
  mutating: boolean;
  onFormChange: (field: keyof ProductFormState, value: string | string[]) => void;
  onClearError: (field: string) => void;
  onSave: () => void;
  onReset: () => void;
  onOpenAdd: () => void;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAdditionalImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveAdditionalImage: (index: number) => void;
}

export function ProductFormDialog({
  open,
  onOpenChange,
  isEditing,
  form,
  formErrors,
  categories,
  isUploading,
  mutating,
  onFormChange,
  onClearError,
  onSave,
  onReset,
  onOpenAdd,
  onImageUpload,
  onAdditionalImageUpload,
  onRemoveAdditionalImage,
}: ProductFormDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) onReset();
      }}
    >
      <DialogTrigger asChild>
        <Button onClick={onOpenAdd}>
          <Plus className="h-4 w-4" />
          添加商品
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "编辑商品" : "添加商品"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* 商品名称 */}
          <div className="grid gap-2">
            <Label htmlFor="product-name">商品名称</Label>
            <Input
              id="product-name"
              placeholder="输入商品名称"
              value={form.name}
              onChange={(e) => { onFormChange("name", e.target.value); onClearError("name"); }}
              className={formErrors.name ? "border-[var(--destructive)]" : ""}
              aria-invalid={!!formErrors.name}
              aria-describedby={formErrors.name ? "product-name-error" : undefined}
            />
            {formErrors.name && <p id="product-name-error" className="text-xs text-[var(--destructive)]">{formErrors.name}</p>}
          </div>

          {/* Slug */}
          <div className="grid gap-2">
            <Label htmlFor="product-slug">
              Slug{" "}
              <span className="text-xs text-[var(--muted-foreground)]">(可选，留空自动生成)</span>
            </Label>
            <Input
              id="product-slug"
              placeholder="product-url-slug"
              value={form.slug}
              onChange={(e) => onFormChange("slug", e.target.value)}
            />
          </div>

          {/* 分类 */}
          <div className="grid gap-2">
            <Label>分类</Label>
            <Select
              value={form.categoryId}
              onValueChange={(v) => { onFormChange("categoryId", v); onClearError("category"); }}
            >
              <SelectTrigger
                className={formErrors.category ? "border-[var(--destructive)]" : ""}
                aria-invalid={!!formErrors.category}
                aria-label="选择商品分类"
              >
                <SelectValue placeholder="选择分类" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formErrors.category && <p className="text-xs text-[var(--destructive)]">{formErrors.category}</p>}
          </div>

          {/* 价格 + 原价 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="product-price">价格 (¥)</Label>
              <Input
                id="product-price"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.price}
                onChange={(e) => { onFormChange("price", e.target.value); onClearError("price"); }}
                className={formErrors.price ? "border-[var(--destructive)]" : ""}
                aria-invalid={!!formErrors.price}
                aria-describedby={formErrors.price ? "product-price-error" : undefined}
              />
              {formErrors.price && <p id="product-price-error" className="text-xs text-[var(--destructive)]">{formErrors.price}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="product-original-price">原价 (¥)</Label>
              <Input
                id="product-original-price"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.originalPrice}
                onChange={(e) => { onFormChange("originalPrice", e.target.value); onClearError("originalPrice"); }}
                className={formErrors.originalPrice ? "border-[var(--destructive)]" : ""}
                aria-invalid={!!formErrors.originalPrice}
                aria-describedby={formErrors.originalPrice ? "product-oprice-error" : undefined}
              />
              {formErrors.originalPrice && <p id="product-oprice-error" className="text-xs text-[var(--destructive)]">{formErrors.originalPrice}</p>}
            </div>
          </div>

          {/* 库存 */}
          <div className="grid gap-2">
            <Label htmlFor="product-stock">库存数量</Label>
            <Input
              id="product-stock"
              type="number"
              min="0"
              step="1"
              placeholder="0"
              value={form.stockCount}
              onChange={(e) => { onFormChange("stockCount", e.target.value); onClearError("stock"); }}
              className={formErrors.stock ? "border-[var(--destructive)]" : ""}
              aria-invalid={!!formErrors.stock}
              aria-describedby={formErrors.stock ? "product-stock-error" : undefined}
            />
            {formErrors.stock && <p id="product-stock-error" className="text-xs text-[var(--destructive)]">{formErrors.stock}</p>}
          </div>

          {/* 描述 */}
          <div className="grid gap-2">
            <Label htmlFor="product-desc">描述</Label>
            <textarea
              id="product-desc"
              rows={3}
              className="flex w-full rounded-[var(--radius-md)] border border-[var(--input)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] ring-offset-[var(--background)] placeholder:text-[var(--muted-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="输入商品描述"
              value={form.description}
              onChange={(e) => onFormChange("description", e.target.value)}
            />
          </div>

          {/* 标签 */}
          <div className="grid gap-2">
            <Label htmlFor="product-tags">
              标签{" "}
              <span className="text-xs text-[var(--muted-foreground)]">(用逗号分隔，如：热销, 限时, 推荐)</span>
            </Label>
            <Input
              id="product-tags"
              placeholder="热销, 限时, 推荐"
              value={form.tags}
              onChange={(e) => onFormChange("tags", e.target.value)}
            />
          </div>

          {/* 售后时长 */}
          <div className="grid gap-2">
            <Label htmlFor="product-aftersale">
              售后时长（小时）{" "}
              <span className="text-xs text-[var(--muted-foreground)]">(可选，留空为默认)</span>
            </Label>
            <Input
              id="product-aftersale"
              type="number"
              min="0"
              step="1"
              placeholder="如 24、48、72"
              value={form.afterSaleHours}
              onChange={(e) => onFormChange("afterSaleHours", e.target.value)}
            />
          </div>

          {/* 排序权重 */}
          <div className="grid gap-2">
            <Label htmlFor="product-sortorder">
              排序权重{" "}
              <span className="text-xs text-[var(--muted-foreground)]">(数值越小越靠前，默认0)</span>
            </Label>
            <Input
              id="product-sortorder"
              type="number"
              min="0"
              step="1"
              placeholder="0"
              value={form.sortOrder}
              onChange={(e) => onFormChange("sortOrder", e.target.value)}
            />
          </div>

          {/* 商品图片 */}
          <div className="grid gap-2">
            <Label htmlFor="product-image">
              商品图片{" "}
              <span className="text-xs text-[var(--muted-foreground)]">(可选，可上传或输入链接)</span>
            </Label>
            <div className="flex gap-2">
              <Input
                id="product-image"
                placeholder="https://example.com/image.jpg"
                value={form.image}
                onChange={(e) => onFormChange("image", e.target.value)}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="default"
                disabled={isUploading}
                onClick={() => document.getElementById("image-upload-input")?.click()}
              >
                {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : "上传"}
              </Button>
              <input
                id="image-upload-input"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
                className="hidden"
                onChange={onImageUpload}
              />
            </div>
            {form.image.trim() && (
              <div className="relative mt-1 h-32 w-full overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--muted)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={form.image.trim()}
                  alt="预览"
                  className="h-full w-full object-contain"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              </div>
            )}
          </div>

          {/* 附加图片 */}
          <div className="grid gap-2">
            <Label>
              附加图片{" "}
              <span className="text-xs text-[var(--muted-foreground)]">(可选，用于图片画廊)</span>
            </Label>
            {form.images.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {form.images.map((img, idx) => (
                  <div key={idx} className="group relative h-16 w-16 overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img} alt={`附加图片 ${idx + 1}`} className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => onRemoveAdditionalImage(idx)}
                      className="absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isUploading || form.images.length >= 8}
              onClick={() => document.getElementById("additional-image-upload")?.click()}
            >
              {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              添加图片 ({form.images.length}/8)
            </Button>
            <input
              id="additional-image-upload"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
              className="hidden"
              onChange={onAdditionalImageUpload}
            />
          </div>

          {/* 状态 */}
          <div className="grid gap-2">
            <Label>状态</Label>
            <Select value={form.status} onValueChange={(v) => onFormChange("status", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="上架">上架</SelectItem>
                <SelectItem value="下架">下架</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { onOpenChange(false); onReset(); }}>
            取消
          </Button>
          <Button onClick={onSave} disabled={mutating}>
            {mutating && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEditing ? "保存修改" : "确认添加"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
