"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Trash2,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import { apiFetch, apiMutate } from "@/lib/api-fetch";
import Pagination from "@/components/shared/pagination";
import { ProductDeleteDialog } from "./product-delete-dialog";
import { ProductFormDialog, type ProductFormState } from "./product-form-dialog";
import { ProductsDesktopTable, ProductsMobileCards } from "./products-table";
import { AdminProductsSkeleton } from "./admin-products-skeleton";
import { AdminProductsToolbar } from "./admin-products-toolbar";
import { type ApiProduct, type Product, type Category, mapApiProduct } from "./product-types";

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
  // JSX
  // ---------------------------------------------------------------------------

  if (loading) {
    return <AdminProductsSkeleton />;
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
        <AdminProductsToolbar
          searchQuery={searchQuery}
          onSearchChange={(q) => { setSearchQuery(q); setCurrentPage(1); }}
          categoryFilter={categoryFilter}
          onCategoryFilterChange={(v) => { setCategoryFilter(v); setCurrentPage(1); }}
          statusFilter={statusFilter}
          onStatusFilterChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}
          categoryNames={categoryNames}
          filteredProducts={filtered}
          onRefreshProducts={fetchProducts}
        />

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
        <Pagination
          page={safePage}
          totalPages={totalPages}
          total={filtered.length}
          onPageChange={setCurrentPage}
          showPageNumbers
          totalLabel="件商品"
        />
      </div>

      {/* ---- Delete confirmation dialog ---- */}
      <ProductDeleteDialog
        target={deleteTarget}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onSuccess={fetchProducts}
        onClearSelection={(ids) => {
          setSelectedIds((prev) => {
            const next = new Set(prev);
            ids.forEach((id) => next.delete(id));
            return next;
          });
        }}
      />
    </div>
  );
}
