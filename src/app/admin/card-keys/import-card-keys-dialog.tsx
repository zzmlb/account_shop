"use client";

import { useRef } from "react";
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

// ---------------------------------------------------------------------------
// Types (local re-definitions)
// ---------------------------------------------------------------------------

interface ProductOption {
  id: string;
  name: string;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ImportCardKeysDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: ProductOption[];
  importProduct: string;
  onImportProductChange: (value: string) => void;
  importContent: string;
  onImportContentChange: (value: string) => void;
  importLoading: boolean;
  onImport: () => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ImportCardKeysDialog({
  open,
  onOpenChange,
  products,
  importProduct,
  onImportProductChange,
  importContent,
  onImportContentChange,
  importLoading,
  onImport,
  onFileUpload,
}: ImportCardKeysDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const importLineCount = importContent
    .split("\n")
    .filter((l) => l.trim()).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
              onValueChange={onImportProductChange}
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
                  onChange={onFileUpload}
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
              onChange={(e) => onImportContentChange(e.target.value)}
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
            onClick={() => onOpenChange(false)}
            disabled={importLoading}
          >
            取消
          </Button>
          <Button
            onClick={onImport}
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
