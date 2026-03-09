"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  Edit,
  Trash2,
  ArrowUpDown,
  Package,
  Eye,
  EyeOff,
  Copy,
} from "lucide-react";

interface Product {
  id: string;
  name: string;
  slug: string;
  category: string;
  categoryId: string;
  price: number;
  originalPrice: number;
  image: string | null;
  images: string[];
  stock: number;
  status: "上架" | "下架";
  sales: number;
  views: number;
  description: string;
  tags: string[];
  afterSaleHours: number | null;
  sortOrder: number;
}

interface ProductsTableProps {
  products: Product[];
  selectedIds: Set<string>;
  allPageSelected: boolean;
  sortField: keyof Product | null;
  sortDir: "asc" | "desc";
  mutating: boolean;
  onSort: (field: keyof Product) => void;
  onSelectRow: (id: string) => void;
  onSelectAll: () => void;
  onEdit: (product: Product) => void;
  onDuplicate: (id: string) => void;
  onToggleStatus: (id: string) => void;
  onDelete: (id: string) => void;
}

function SortIcon({ field, sortField }: { field: keyof Product; sortField: keyof Product | null }) {
  return (
    <ArrowUpDown
      className={cn(
        "ml-1 h-3.5 w-3.5 inline-block",
        sortField === field ? "text-[var(--primary)]" : "text-[var(--muted-foreground)]"
      )}
    />
  );
}

export function ProductsDesktopTable({
  products,
  selectedIds,
  allPageSelected,
  sortField,
  mutating,
  onSort,
  onSelectRow,
  onSelectAll,
  onEdit,
  onDuplicate,
  onToggleStatus,
  onDelete,
}: ProductsTableProps) {
  return (
    <div className="hidden md:block">
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" aria-label="商品管理列表">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th scope="col" className="px-4 py-3 text-left">
                  <Checkbox checked={allPageSelected} onCheckedChange={onSelectAll} />
                </th>
                <th scope="col" className="cursor-pointer px-4 py-3 text-left font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)]" onClick={() => onSort("name")}>
                  商品名称<SortIcon field="name" sortField={sortField} />
                </th>
                <th scope="col" className="cursor-pointer px-4 py-3 text-left font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)]" onClick={() => onSort("category")}>
                  分类<SortIcon field="category" sortField={sortField} />
                </th>
                <th scope="col" className="cursor-pointer px-4 py-3 text-right font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)]" onClick={() => onSort("price")}>
                  价格<SortIcon field="price" sortField={sortField} />
                </th>
                <th scope="col" className="cursor-pointer px-4 py-3 text-right font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)]" onClick={() => onSort("stock")}>
                  库存<SortIcon field="stock" sortField={sortField} />
                </th>
                <th scope="col" className="px-4 py-3 text-center font-medium text-[var(--muted-foreground)]">状态</th>
                <th scope="col" className="cursor-pointer px-4 py-3 text-right font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)]" onClick={() => onSort("sales")}>
                  销量<SortIcon field="sales" sortField={sortField} />
                </th>
                <th scope="col" className="cursor-pointer px-4 py-3 text-right font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)]" onClick={() => onSort("views")}>
                  浏览<SortIcon field="views" sortField={sortField} />
                </th>
                <th scope="col" className="px-4 py-3 text-right font-medium text-[var(--muted-foreground)]">操作</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-[var(--muted-foreground)]">
                    <Package className="mx-auto mb-2 h-10 w-10 opacity-40" />
                    暂无商品数据
                  </td>
                </tr>
              )}
              {products.map((product) => (
                <tr
                  key={product.id}
                  className={cn(
                    "border-b border-[var(--border)] transition-colors hover:bg-[var(--muted)]/50",
                    selectedIds.has(product.id) && "bg-[var(--muted)]/30"
                  )}
                >
                  <td className="px-4 py-3">
                    <Checkbox checked={selectedIds.has(product.id)} onCheckedChange={() => onSelectRow(product.id)} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="font-medium text-[var(--foreground)]">{product.name}</span>
                      {product.tags.length > 0 && (
                        <div className="mt-0.5 flex flex-wrap gap-1">
                          {product.tags.slice(0, 3).map((tag) => (
                            <span key={tag} className="inline-block rounded bg-[var(--primary)]/10 px-1.5 py-0 text-[10px] text-[var(--primary)]">{tag}</span>
                          ))}
                          {product.tags.length > 3 && (
                            <span className="text-[10px] text-[var(--muted-foreground)]">+{product.tags.length - 3}</span>
                          )}
                        </div>
                      )}
                      <span className="text-xs text-[var(--muted-foreground)]">{product.id}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[var(--muted-foreground)]">{product.category}</td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-semibold text-[var(--foreground)]">¥{product.price.toFixed(2)}</span>
                    {product.originalPrice > product.price && (
                      <span className="ml-1.5 text-xs text-[var(--muted-foreground)] line-through">¥{product.originalPrice.toFixed(2)}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={cn(
                      product.stock === 0 ? "text-[var(--destructive)]" : product.stock < 20 ? "text-[var(--warning)]" : "text-[var(--foreground)]"
                    )}>
                      {product.stock}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={product.status === "上架" ? "success" : "secondary"}>{product.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right text-[var(--muted-foreground)]">{product.sales.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-[var(--muted-foreground)]">{product.views.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" disabled={mutating} onClick={() => onEdit(product)}>
                        <Edit className="h-3.5 w-3.5" />编辑
                      </Button>
                      <Button variant="ghost" size="sm" disabled={mutating} title="复制商品" onClick={() => onDuplicate(product.id)}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" disabled={mutating} onClick={() => onToggleStatus(product.id)}>
                        {product.status === "上架" ? (<><EyeOff className="h-3.5 w-3.5" />下架</>) : (<><Eye className="h-3.5 w-3.5" />上架</>)}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={mutating}
                        className="text-[var(--destructive)] hover:text-[var(--destructive)]"
                        onClick={() => onDelete(product.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />删除
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

export function ProductsMobileCards({
  products,
  selectedIds,
  allPageSelected,
  mutating,
  onSelectRow,
  onSelectAll,
  onEdit,
  onDuplicate,
  onToggleStatus,
  onDelete,
}: Omit<ProductsTableProps, "sortField" | "sortDir" | "onSort">) {
  return (
    <div className="grid gap-3 md:hidden">
      <div className="flex items-center gap-2 px-1">
        <Checkbox checked={allPageSelected} onCheckedChange={onSelectAll} />
        <span className="text-sm text-[var(--muted-foreground)]">全选</span>
      </div>

      {products.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <Package className="mb-2 h-10 w-10 text-[var(--muted-foreground)] opacity-40" />
            <span className="text-sm text-[var(--muted-foreground)]">暂无商品数据</span>
          </CardContent>
        </Card>
      )}

      {products.map((product) => (
        <Card
          key={product.id}
          className={cn("transition-colors", selectedIds.has(product.id) && "ring-1 ring-[var(--primary)]")}
        >
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Checkbox className="mt-1" checked={selectedIds.has(product.id)} onCheckedChange={() => onSelectRow(product.id)} />
              <div className="flex-1 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-[var(--foreground)]">{product.name}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">{product.id} &middot; {product.category}</p>
                  </div>
                  <Badge variant={product.status === "上架" ? "success" : "secondary"}>{product.status}</Badge>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  <span className="text-[var(--foreground)]">
                    <strong>¥{product.price.toFixed(2)}</strong>
                    {product.originalPrice > product.price && (
                      <span className="ml-1 text-xs text-[var(--muted-foreground)] line-through">¥{product.originalPrice.toFixed(2)}</span>
                    )}
                  </span>
                  <span className="text-[var(--muted-foreground)]">
                    库存:{" "}
                    <span className={cn(
                      product.stock === 0 ? "text-[var(--destructive)]" : product.stock < 20 ? "text-[var(--warning)]" : "text-[var(--foreground)]"
                    )}>
                      {product.stock}
                    </span>
                  </span>
                  <span className="text-[var(--muted-foreground)]">销量: {product.sales.toLocaleString()}</span>
                  <span className="text-[var(--muted-foreground)]">浏览: {product.views.toLocaleString()}</span>
                </div>
                <div className="flex gap-1 pt-1">
                  <Button variant="ghost" size="sm" disabled={mutating} onClick={() => onEdit(product)}>
                    <Edit className="h-3.5 w-3.5" />编辑
                  </Button>
                  <Button variant="ghost" size="sm" disabled={mutating} title="复制商品" onClick={() => onDuplicate(product.id)}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" disabled={mutating} onClick={() => onToggleStatus(product.id)}>
                    {product.status === "上架" ? (<><EyeOff className="h-3.5 w-3.5" />下架</>) : (<><Eye className="h-3.5 w-3.5" />上架</>)}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={mutating}
                    className="text-[var(--destructive)] hover:text-[var(--destructive)]"
                    onClick={() => onDelete(product.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />删除
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
