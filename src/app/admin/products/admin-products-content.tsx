"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
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
import { cn } from "@/lib/utils";
import {
  Search,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  AlertTriangle,
  Loader2,
  Download,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { apiFetch, apiMutate } from "@/lib/api-fetch";
import { ProductFormDialog, type ProductFormState } from "./product-form-dialog";
import { ProductsDesktopTable, ProductsMobileCards } from "./products-table";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ApiProduct {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  originalPrice: number | null;
  categoryId: string;
  category: {
    id: string;
    name: string;
    slug: string;
  };
  image: string | null;
  images: string[];
  tags: string[];
  stockCount: number;
  soldCount: number;
  viewCount: number;
  isActive: boolean;
  sortOrder: number;
  deliveryType: string | null;
  afterSaleHours: number | null;
  createdAt: string;
  updatedAt: string;
}

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

interface Category {
  id: string;
  name: string;
  slug: string;
  productCount: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mapApiProduct(p: ApiProduct): Product {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    category: p.category.name,
    categoryId: p.categoryId,
    price: p.price,
    originalPrice: p.originalPrice ?? p.price,
    image: p.image,
    images: p.images || [],
    stock: p.stockCount,
    status: p.isActive ? "上架" : "下架",
    sales: p.soldCount,
    views: p.viewCount ?? 0,
    description: p.description,
    tags: p.tags,
    afterSaleHours: p.afterSaleHours,
    sortOrder: p.sortOrder,
  };
}

const ITEMS_PER_PAGE = 6;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AdminProductsPageContent() {
  // Data state
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [mutating, setMutating] = useState(false);

  // Filter / pagination state
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<keyof Product | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | string[] | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form state for add/edit dialog
  const [formState, setFormState] = useState<ProductFormState>({
    name: "", slug: "", categoryId: "", price: "", originalPrice: "",
    stockCount: "", description: "", image: "", images: [],
    status: "上架", tags: "", afterSaleHours: "", sortOrder: "",
  });
  const [isUploading, setIsUploading] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  const fetchProducts = useCallback(async () => {
    try {
      const data = await apiFetch<{ success: boolean; products: ApiProduct[] }>("/api/admin/products");
      setProducts(data.products.map(mapApiProduct));
    } catch (err) {
      toast.error("加载商品失败", {
        description: err instanceof Error ? err.message : "未知错误",
      });
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const data = await apiFetch<{ success: boolean; categories: Category[] }>("/api/categories");
      setCategories(data.categories);
    } catch (err) {
      toast.error("加载分类失败", {
        description: err instanceof Error ? err.message : "未知错误",
      });
    }
  }, []);

  useEffect(() => {
    async function init() {
      setLoading(true);
      await Promise.all([fetchProducts(), fetchCategories()]);
      setLoading(false);
    }
    init();
  }, [fetchProducts, fetchCategories]);

  // ---------------------------------------------------------------------------
  // Derived data
  // ---------------------------------------------------------------------------

  const categoryNames = useMemo(
    () => categories.map((c) => c.name),
    [categories]
  );

  const filtered = useMemo(() => {
    let result = [...products];

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      );
    }

    if (categoryFilter !== "all") {
      result = result.filter((p) => p.category === categoryFilter);
    }

    if (statusFilter === "low-stock") {
      result = result.filter((p) => p.stock > 0 && p.stock < 10);
    } else if (statusFilter === "out-of-stock") {
      result = result.filter((p) => p.stock === 0);
    } else if (statusFilter !== "all") {
      result = result.filter((p) => p.status === statusFilter);
    }

    if (sortField) {
      result.sort((a, b) => {
        const av = a[sortField];
        const bv = b[sortField];
        if (typeof av === "number" && typeof bv === "number") {
          return sortDir === "asc" ? av - bv : bv - av;
        }
        return sortDir === "asc"
          ? String(av).localeCompare(String(bv))
          : String(bv).localeCompare(String(av));
      });
    }

    return result;
  }, [products, searchQuery, categoryFilter, statusFilter, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paged = filtered.slice(
    (safePage - 1) * ITEMS_PER_PAGE,
    safePage * ITEMS_PER_PAGE
  );

  const allPageSelected =
    paged.length > 0 && paged.every((p) => selectedIds.has(p.id));

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  function handleSort(field: keyof Product) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (allPageSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        paged.forEach((p) => next.delete(p.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        paged.forEach((p) => next.add(p.id));
        return next;
      });
    }
  }

  function exportProductsCSV() {
    const header = "商品名称,分类,价格,原价,库存,销量,浏览量,状态,Slug\n";
    const rows = filtered
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
      description: `已导出 ${filtered.length} 件商品`,
    });
  }

  const [reconciling, setReconciling] = useState(false);

  async function reconcileStock() {
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
        await fetchProducts();
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
  }

  async function toggleStatus(id: string) {
    const product = products.find((p) => p.id === id);
    if (!product) return;

    const newIsActive = product.status !== "上架";
    setMutating(true);
    try {
      await apiMutate(`/api/admin/products?id=${id}`, "PUT", { isActive: newIsActive });
      toast.success(newIsActive ? "商品已上架" : "商品已下架");
      await fetchProducts();
    } catch (err) {
      toast.error("切换状态失败", {
        description: err instanceof Error ? err.message : "未知错误",
      });
    } finally {
      setMutating(false);
    }
  }

  async function duplicateProduct(id: string) {
    setMutating(true);
    try {
      await apiMutate(`/api/admin/products?duplicateId=${id}`, "POST");
      toast.success("商品已复制", {
        description: "副本已创建为下架状态，请编辑后上架",
      });
      await fetchProducts();
    } catch (err) {
      toast.error("复制失败", {
        description: err instanceof Error ? err.message : "未知错误",
      });
    } finally {
      setMutating(false);
    }
  }

  async function bulkToggleStatus(status: "上架" | "下架") {
    const isActive = status === "上架";
    const ids = Array.from(selectedIds);
    setMutating(true);
    try {
      const results = await Promise.allSettled(
        ids.map((id) =>
          apiMutate(`/api/admin/products?id=${id}`, "PUT", { isActive })
        )
      );
      const failures = results.filter((r) => r.status === "rejected");
      if (failures.length > 0) {
        toast.warning(`部分操作失败: ${failures.length}/${ids.length} 件商品未能更新`);
      } else {
        toast.success(`已批量${status} ${ids.length} 件商品`);
      }
      setSelectedIds(new Set());
      await fetchProducts();
    } catch (err) {
      toast.error("批量操作失败", {
        description: err instanceof Error ? err.message : "未知错误",
      });
    } finally {
      setMutating(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const idsToDelete = Array.isArray(deleteTarget) ? deleteTarget : [deleteTarget];

    setMutating(true);
    try {
      const results = await Promise.allSettled(
        idsToDelete.map((id) =>
          apiMutate(`/api/admin/products?id=${id}`, "DELETE")
        )
      );
      const failures = results.filter((r) => r.status === "rejected");
      if (failures.length > 0) {
        toast.warning(`部分删除失败: ${failures.length}/${idsToDelete.length} 件商品未能删除`);
      } else {
        toast.success(
          idsToDelete.length === 1
            ? "商品已删除(下架)"
            : `已删除(下架) ${idsToDelete.length} 件商品`
        );
      }
      setSelectedIds((prev) => {
        const next = new Set(prev);
        idsToDelete.forEach((id) => next.delete(id));
        return next;
      });
      setDeleteTarget(null);
      setDeleteDialogOpen(false);
      await fetchProducts();
    } catch (err) {
      toast.error("删除失败", {
        description: err instanceof Error ? err.message : "未知错误",
      });
    } finally {
      setMutating(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Form handlers
  // ---------------------------------------------------------------------------

  function handleFormChange(field: keyof ProductFormState, value: string | string[]) {
    setFormState((prev) => ({ ...prev, [field]: value }));
  }

  function clearFormError(field: string) {
    setFormErrors((prev) => ({ ...prev, [field]: "" }));
  }

  async function handleSaveProduct() {
    const errors: Record<string, string> = {};
    const { name, categoryId, price, originalPrice, stockCount, slug, description, image, images, status, tags, afterSaleHours, sortOrder } = formState;

    if (!name.trim()) errors.name = "请输入商品名称";
    if (!categoryId) errors.category = "请选择分类";
    if (!price) errors.price = "请输入价格";

    const priceVal = parseFloat(price);
    const originalPriceVal = originalPrice ? parseFloat(originalPrice) : undefined;
    const stockVal = stockCount ? parseInt(stockCount, 10) : 0;

    if (price && (isNaN(priceVal) || priceVal < 0)) errors.price = "请输入有效的价格";
    if (isNaN(stockVal) || stockVal < 0) errors.stock = "请输入有效的库存数量";
    if (originalPriceVal !== undefined && !isNaN(originalPriceVal) && originalPriceVal < priceVal) {
      errors.originalPrice = "原价不能低于现价";
    }

    if (Object.keys(errors).length > 0) { setFormErrors(errors); return; }
    setFormErrors({});

    const parsedTags = tags.split(/[,，]/).map(t => t.trim()).filter(Boolean);
    const parsedAfterSale = afterSaleHours ? parseInt(afterSaleHours, 10) : null;
    const parsedSortOrder = sortOrder ? parseInt(sortOrder, 10) : 0;

    setMutating(true);
    try {
      const body: Record<string, unknown> = {
        name: name.trim(),
        categoryId,
        price: priceVal,
        stockCount: stockVal,
        description: description.trim(),
        image: image.trim() || null,
        images: images.filter((u) => u.trim()),
        isActive: status === "上架",
        tags: parsedTags,
        afterSaleHours: parsedAfterSale,
        sortOrder: parsedSortOrder,
      };
      if (slug.trim()) body.slug = slug.trim();
      if (originalPriceVal !== undefined) body.originalPrice = originalPriceVal;

      if (editingProduct) {
        await apiMutate(`/api/admin/products?id=${editingProduct.id}`, "PUT", body);
        toast.success("商品更新成功");
      } else {
        await apiMutate("/api/admin/products", "POST", body);
        toast.success("商品添加成功");
      }

      resetForm();
      setDialogOpen(false);
      await fetchProducts();
    } catch (err) {
      toast.error(editingProduct ? "更新商品失败" : "添加商品失败", {
        description: err instanceof Error ? err.message : "未知错误",
      });
    } finally {
      setMutating(false);
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const data = await apiFetch<{ success: boolean; url: string }>("/api/upload", { method: "POST", body: formData });
      setFormState((prev) => ({ ...prev, image: data.url }));
      toast.success("图片上传成功");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "上传失败");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  }

  async function handleAdditionalImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const data = await apiFetch<{ success: boolean; url: string }>("/api/upload", { method: "POST", body: fd });
      setFormState((prev) => ({ ...prev, images: [...prev.images, data.url] }));
      toast.success("附加图片上传成功");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "上传失败");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  }

  function removeAdditionalImage(index: number) {
    setFormState((prev) => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }));
  }

  function resetForm() {
    setFormState({
      name: "", slug: "", categoryId: "", price: "", originalPrice: "",
      stockCount: "", description: "", image: "", images: [],
      status: "上架", tags: "", afterSaleHours: "", sortOrder: "",
    });
    setEditingProduct(null);
    setFormErrors({});
  }

  function openEditDialog(product: Product) {
    setEditingProduct(product);
    setFormState({
      name: product.name,
      slug: product.slug,
      categoryId: product.categoryId,
      price: String(product.price),
      originalPrice: product.originalPrice !== product.price ? String(product.originalPrice) : "",
      stockCount: String(product.stock),
      description: product.description,
      image: product.image || "",
      images: product.images || [],
      status: product.status,
      tags: product.tags.join(", "),
      afterSaleHours: product.afterSaleHours != null ? String(product.afterSaleHours) : "",
      sortOrder: product.sortOrder ? String(product.sortOrder) : "0",
    });
    setDialogOpen(true);
  }

  function openAddDialog() {
    resetForm();
    setDialogOpen(true);
  }

  function handleDeleteRequest(id: string) {
    setDeleteTarget(id);
    setDeleteDialogOpen(true);
  }

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  function renderLoadingSkeleton() {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-10 w-28" />
        </div>
        <Card>
          <CardContent className="p-4">
            <div className="flex gap-3">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 w-[160px]" />
              <Skeleton className="h-10 w-[120px]" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <div className="p-4 space-y-4">
            {Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-5 w-5" />
                <Skeleton className="h-5 flex-1" />
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-12" />
                <Skeleton className="h-6 w-14" />
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-8 w-32" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // JSX
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--background)] p-4 md:p-8">
        <div className="mx-auto max-w-7xl">{renderLoadingSkeleton()}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* ---- Header ---- */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--foreground)]">商品管理</h1>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              管理平台所有数字商品，共 {products.length} 件商品
            </p>
          </div>

          <ProductFormDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            isEditing={!!editingProduct}
            form={formState}
            formErrors={formErrors}
            categories={categories}
            isUploading={isUploading}
            mutating={mutating}
            onFormChange={handleFormChange}
            onClearError={clearFormError}
            onSave={handleSaveProduct}
            onReset={resetForm}
            onOpenAdd={openAddDialog}
            onImageUpload={handleImageUpload}
            onAdditionalImageUpload={handleAdditionalImageUpload}
            onRemoveAdditionalImage={removeAdditionalImage}
          />
        </div>

        {/* ---- Filters ---- */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
                <Input
                  className="pl-9"
                  placeholder="搜索商品名称、编号..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                />
              </div>

              <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setCurrentPage(1); }}>
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

              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
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

        {/* ---- Bulk actions ---- */}
        {selectedIds.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--muted)] px-4 py-3">
            <span className="text-sm text-[var(--foreground)]">
              已选择 <strong>{selectedIds.size}</strong> 件商品
            </span>
            <div className="ml-auto flex gap-2">
              <Button size="sm" variant="outline" disabled={mutating} onClick={() => bulkToggleStatus("上架")}>
                <Eye className="h-3.5 w-3.5" />批量上架
              </Button>
              <Button size="sm" variant="outline" disabled={mutating} onClick={() => bulkToggleStatus("下架")}>
                <EyeOff className="h-3.5 w-3.5" />批量下架
              </Button>
              <Button size="sm" variant="destructive" disabled={mutating} onClick={() => { setDeleteTarget(Array.from(selectedIds)); setDeleteDialogOpen(true); }}>
                <Trash2 className="h-3.5 w-3.5" />批量删除
              </Button>
            </div>
          </div>
        )}

        {/* ---- Table (desktop) ---- */}
        <ProductsDesktopTable
          products={paged}
          selectedIds={selectedIds}
          allPageSelected={allPageSelected}
          sortField={sortField}
          sortDir={sortDir}
          mutating={mutating}
          onSort={handleSort}
          onSelectRow={toggleSelect}
          onSelectAll={toggleSelectAll}
          onEdit={openEditDialog}
          onDuplicate={duplicateProduct}
          onToggleStatus={toggleStatus}
          onDelete={handleDeleteRequest}
        />

        {/* ---- Cards (mobile) ---- */}
        <ProductsMobileCards
          products={paged}
          selectedIds={selectedIds}
          allPageSelected={allPageSelected}
          mutating={mutating}
          onSelectRow={toggleSelect}
          onSelectAll={toggleSelectAll}
          onEdit={openEditDialog}
          onDuplicate={duplicateProduct}
          onToggleStatus={toggleStatus}
          onDelete={handleDeleteRequest}
        />

        {/* ---- Pagination ---- */}
        {filtered.length > 0 && (
          <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
            <p className="text-sm text-[var(--muted-foreground)]">
              显示 {(safePage - 1) * ITEMS_PER_PAGE + 1}–
              {Math.min(safePage * ITEMS_PER_PAGE, filtered.length)} 条，共{" "}
              {filtered.length} 条
            </p>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" disabled={safePage <= 1} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <Button key={page} variant={page === safePage ? "default" : "outline"} size="sm" className="min-w-[36px]" onClick={() => setCurrentPage(page)}>
                  {page}
                </Button>
              ))}
              <Button variant="outline" size="sm" disabled={safePage >= totalPages} onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ---- Delete confirmation dialog ---- */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-[var(--destructive)]" />
              确认删除
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[var(--muted-foreground)]">
            {Array.isArray(deleteTarget)
              ? `确定要删除选中的 ${deleteTarget.length} 件商品吗？商品将被下架处理。`
              : "确定要删除该商品吗？商品将被下架处理。"}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteTarget(null); setDeleteDialogOpen(false); }}>
              取消
            </Button>
            <Button variant="destructive" disabled={mutating} onClick={confirmDelete}>
              {mutating && <Loader2 className="h-4 w-4 animate-spin" />}
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
