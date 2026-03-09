"use client";

import { useState, useRef } from "react";
import { Upload, FileUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProductOption {
  id: string;
  name: string;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ImportCardKeysDialogProps {
  products: ProductOption[];
  onSuccess: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ImportCardKeysDialog({
  products,
  onSuccess,
}: ImportCardKeysDialogProps) {
  const [open, setOpen] = useState(false);
  const [importProduct, setImportProduct] = useState("");
  const [importContent, setImportContent] = useState("");
  const [importLoading, setImportLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const importLineCount = importContent
    .split("\n")
    .filter((l) => l.trim()).length;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      if (text) {
        setImportContent((prev) => (prev ? prev + "\n" + text : text));
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleImport = async () => {
    if (!importProduct || !importContent.trim()) return;

    const lines = importContent
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      toast.error("请输入至少一个卡密");
      return;
    }

    setImportLoading(true);
    try {
      const data = await apiMutate<{
        success: boolean;
        message?: string;
        count?: number;
        duplicates?: { batch: number; existing: number };
      }>("/api/admin/card-keys", "POST", {
        productId: importProduct,
        keys: lines,
      });
      const dupInfo = data.duplicates;
      const dupDesc =
        dupInfo && (dupInfo.batch > 0 || dupInfo.existing > 0)
          ? `跳过 ${dupInfo.batch > 0 ? `${dupInfo.batch} 个批内重复` : ""}${dupInfo.batch > 0 && dupInfo.existing > 0 ? "、" : ""}${dupInfo.existing > 0 ? `${dupInfo.existing} 个已存在` : ""}`
          : undefined;
      toast.success(data.message || `成功导入 ${data.count} 个卡密`, {
        ...(dupDesc && { description: dupDesc }),
      });
      setImportProduct("");
      setImportContent("");
      setOpen(false);
      onSuccess();
    } catch (err) {
      toast.error("导入卡密失败", {
        description: err instanceof Error ? err.message : "未知错误",
      });
    } finally {
      setImportLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Upload className="mr-2 h-4 w-4" />
          导入卡密
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>批量导入卡密</DialogTitle>
          <DialogDescription>
            每行粘贴一个卡密，选择对应的商品后导入
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>选择商品</Label>
            <Select
              value={importProduct}
              onValueChange={setImportProduct}
            >
              <SelectTrigger>
                <SelectValue placeholder="请选择商品" />
              </SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>卡密内容</Label>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.csv,.text"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FileUp className="mr-1 h-3.5 w-3.5" />
                  从文件导入
                </Button>
              </div>
            </div>
            <textarea
              className="flex min-h-[160px] w-full rounded-[var(--radius-md)] border border-[var(--input)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] ring-offset-[var(--background)] placeholder:text-[var(--muted-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
              placeholder={
                "每行一个卡密，例如：\nGMAL-8K2F-J9X3-Q7WN\nGMAL-3P7R-M1D5-H8YC\n\n也可点击上方按钮从 .txt/.csv 文件导入"
              }
              value={importContent}
              onChange={(e) => setImportContent(e.target.value)}
            />
            {importContent.trim() && (
              <p className="text-xs text-[var(--muted-foreground)]">
                已输入 {importLineCount} 个卡密
              </p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={importLoading}
          >
            取消
          </Button>
          <Button
            onClick={handleImport}
            disabled={
              !importProduct || !importContent.trim() || importLoading
            }
          >
            {importLoading && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            确认导入
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
