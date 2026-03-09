"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  Search,
  AlertTriangle,
  Download,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { apiMutate } from "@/lib/api-fetch";

interface FilteredProduct {
  name: string;
  category: string;
  price: number;
  originalPrice: number;
  stock: number;
  sales: number;
  views: number;
  status: string;
  slug: string;
}

interface AdminProductsToolbarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  categoryFilter: string;
  onCategoryFilterChange: (v: string) => void;
  statusFilter: string;
  onStatusFilterChange: (v: string) => void;
  categoryNames: string[];
  filteredProducts: FilteredProduct[];
  onRefreshProducts: () => Promise<void>;
}

export function AdminProductsToolbar({
  searchQuery,
  onSearchChange,
  categoryFilter,
  onCategoryFilterChange,
  statusFilter,
  onStatusFilterChange,
  categoryNames,
  filteredProducts,
  onRefreshProducts,
}: AdminProductsToolbarProps) {
  const [reconciling, setReconciling] = useState(false);

  const reconcileStock = useCallback(async () => {
    setReconciling(true);
    try {
      const data = await apiMutate<{
        success: boolean;
        message: string;
        fixedCount: number;
        fixes: { name: string; oldStock: number; newStock: number }[];
      }>("/api/admin/products", "PATCH", { action: "reconcile-stock" });
      if (data.fixedCount > 0) {
        toast.success(data.message, {
          description: data.fixes
            .map((f) => `${f.name}: ${f.oldStock} → ${f.newStock}`)
            .join("\n"),
        });
        await onRefreshProducts();
      } else {
        toast.success(data.message);
      }
    } catch (err) {
      toast.error("库存校准失败", {
        description: err instanceof Error ? err.message : "未知错误",
      });
    } finally {
      setReconciling(false);
    }
  }, [onRefreshProducts]);

  function exportProductsCSV() {
    const header = "商品名称,分类,价格,原价,库存,销量,浏览量,状态,Slug\n";
    const rows = filteredProducts
      .map((p) =>
        [
          `"${p.name.replace(/"/g, '""')}"`,
          `"${p.category}"`,
          p.price,
          p.originalPrice,
          p.stock,
          p.sales,
          p.views,
          p.status,
          p.slug,
        ].join(",")
      )
      .join("\n");

    const blob = new Blob(["\uFEFF" + header + rows], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `products_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("导出成功", {
      description: `已导出 ${filteredProducts.length} 件商品`,
    });
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
            <Input
              className="pl-9"
              placeholder="搜索商品名称、编号..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>

          <Select value={categoryFilter} onValueChange={onCategoryFilterChange}>
            <SelectTrigger className="w-full md:w-[160px]">
              <SelectValue placeholder="全部分类" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部分类</SelectItem>
              {categoryNames.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={onStatusFilterChange}>
            <SelectTrigger className="w-full md:w-[140px]">
              <SelectValue placeholder="全部状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="上架">上架</SelectItem>
              <SelectItem value="下架">下架</SelectItem>
              <SelectItem value="low-stock">
                <span className="flex items-center gap-1.5">
                  <AlertTriangle className="h-3 w-3 text-orange-500" />库存不足
                </span>
              </SelectItem>
              <SelectItem value="out-of-stock">
                <span className="flex items-center gap-1.5">
                  <AlertTriangle className="h-3 w-3 text-red-500" />已售罄
                </span>
              </SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" onClick={reconcileStock} disabled={reconciling} className="shrink-0">
            <RefreshCw className={cn("h-4 w-4", reconciling && "animate-spin")} />库存校准
          </Button>

          <Button variant="outline" size="sm" onClick={exportProductsCSV} className="shrink-0">
            <Download className="h-4 w-4" />导出
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
