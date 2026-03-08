"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
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
import { cn } from "@/lib/utils";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Package,
  Eye,
  EyeOff,
  AlertTriangle,
  Loader2,
  Download,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

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
  const [deleteTarget, setDeleteTarget] = useState<string | string[] | null>(
    null
  );
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form state for add/edit dialog
  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formCategoryId, setFormCategoryId] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formOriginalPrice, setFormOriginalPrice] = useState("");
  const [formStockCount, setFormStockCount] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formImage, setFormImage] = useState("");
  const [formImages, setFormImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [formStatus, setFormStatus] = useState<"上架" | "下架">("上架");

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/products");
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || `请求失败 (${res.status})`);
      }
      const data = await res.json();
      if (data.success && Array.isArray(data.products)) {
        setProducts(data.products.map(mapApiProduct));
      } else {
        throw new Error(data.message || "获取商品列表失败");
      }
    } catch (err) {
      toast.error("加载商品失败", {
        description: err instanceof Error ? err.message : "未知错误",
      });
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/categories");
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || `请求失败 (${res.status})`);
      }
      const data = await res.json();
      if (data.success && Array.isArray(data.categories)) {
        setCategories(data.categories);
      }
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

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      );
    }

    // Category
    if (categoryFilter !== "all") {
      result = result.filter((p) => p.category === categoryFilter);
    }

    // Status / stock filter
    if (statusFilter === "low-stock") {
      result = result.filter((p) => p.stock > 0 && p.stock < 10);
    } else if (statusFilter === "out-of-stock") {
      result = result.filter((p) => p.stock === 0);
    } else if (statusFilter !== "all") {
      result = result.filter((p) => p.status === statusFilter);
    }

    // Sort
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
      const res = await fetch("/api/admin/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reconcile-stock" }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "校准失败");
      }
      if (data.fixedCount > 0) {
        toast.success(data.message, {
          description: data.fixes
            .map((f: { name: string; oldStock: number; newStock: number }) =>
              `${f.name}: ${f.oldStock} → ${f.newStock}`
            )
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
      const res = await fetch(`/api/admin/products?id=${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: newIsActive }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "操作失败");
      }
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

  async function bulkToggleStatus(status: "上架" | "下架") {
    const isActive = status === "上架";
    const ids = Array.from(selectedIds);
    setMutating(true);
    try {
      const results = await Promise.all(
        ids.map((id) =>
          fetch(`/api/admin/products?id=${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isActive }),
          }).then((r) => r.json())
        )
      );
      const failures = results.filter((r) => !r.success);
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
    const idsToDelete = Array.isArray(deleteTarget)
      ? deleteTarget
      : [deleteTarget];

    setMutating(true);
    try {
      const results = await Promise.all(
        idsToDelete.map((id) =>
          fetch(`/api/admin/products?id=${id}`, {
            method: "DELETE",
          }).then((r) => r.json())
        )
      );
      const failures = results.filter((r) => !r.success);
      if (failures.length > 0) {
        toast.warning(
          `部分删除失败: ${failures.length}/${idsToDelete.length} 件商品未能删除`
        );
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

  async function handleSaveProduct() {
    if (!formName.trim() || !formCategoryId || !formPrice) return;

    const priceVal = parseFloat(formPrice);
    const originalPriceVal = formOriginalPrice
      ? parseFloat(formOriginalPrice)
      : undefined;
    const stockVal = formStockCount ? parseInt(formStockCount, 10) : 0;

    if (isNaN(priceVal) || priceVal < 0) {
      toast.error("请输入有效的价格");
      return;
    }

    if (isNaN(stockVal) || stockVal < 0) {
      toast.error("请输入有效的库存数量");
      return;
    }

    if (originalPriceVal !== undefined && !isNaN(originalPriceVal) && originalPriceVal < priceVal) {
      toast.error("原价不能低于现价");
      return;
    }

    setMutating(true);
    try {
      if (editingProduct) {
        // Update existing product
        const body: Record<string, unknown> = {
          name: formName.trim(),
          categoryId: formCategoryId,
          price: priceVal,
          stockCount: stockVal,
          description: formDescription.trim(),
          image: formImage.trim() || null,
          images: formImages.filter((u) => u.trim()),
          isActive: formStatus === "上架",
        };
        if (formSlug.trim()) body.slug = formSlug.trim();
        if (originalPriceVal !== undefined) body.originalPrice = originalPriceVal;

        const res = await fetch(
          `/api/admin/products?id=${editingProduct.id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }
        );
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || "更新失败");
        }
        toast.success("商品更新成功");
      } else {
        // Create new product
        const body: Record<string, unknown> = {
          name: formName.trim(),
          categoryId: formCategoryId,
          price: priceVal,
          stockCount: stockVal,
          description: formDescription.trim(),
          image: formImage.trim() || null,
          images: formImages.filter((u) => u.trim()),
          isActive: formStatus === "上架",
        };
        if (formSlug.trim()) body.slug = formSlug.trim();
        if (originalPriceVal !== undefined) body.originalPrice = originalPriceVal;

        const res = await fetch("/api/admin/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || "创建失败");
        }
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
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.success) {
        setFormImage(data.url);
        toast.success("图片上传成功");
      } else {
        toast.error(data.message || "上传失败");
      }
    } catch {
      toast.error("上传失败");
    } finally {
      setIsUploading(false);
      // Reset file input so the same file can be re-selected
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
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.success) {
        setFormImages((prev) => [...prev, data.url]);
        toast.success("附加图片上传成功");
      } else {
        toast.error(data.message || "上传失败");
      }
    } catch {
      toast.error("上传失败");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  }

  function resetForm() {
    setFormName("");
    setFormSlug("");
    setFormCategoryId("");
    setFormPrice("");
    setFormOriginalPrice("");
    setFormStockCount("");
    setFormDescription("");
    setFormImage("");
    setFormImages([]);
    setFormStatus("上架");
    setEditingProduct(null);
  }

  function openEditDialog(product: Product) {
    setEditingProduct(product);
    setFormName(product.name);
    setFormSlug(product.slug);
    setFormCategoryId(product.categoryId);
    setFormPrice(String(product.price));
    setFormOriginalPrice(
      product.originalPrice !== product.price
        ? String(product.originalPrice)
        : ""
    );
    setFormStockCount(String(product.stock));
    setFormDescription(product.description);
    setFormImage(product.image || "");
    setFormImages(product.images || []);
    setFormStatus(product.status);
    setDialogOpen(true);
  }

  function openAddDialog() {
    resetForm();
    setDialogOpen(true);
  }

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  function renderSortIcon(field: keyof Product) {
    return (
      <ArrowUpDown
        className={cn(
          "ml-1 h-3.5 w-3.5 inline-block",
          sortField === field
            ? "text-[var(--primary)]"
            : "text-[var(--muted-foreground)]"
        )}
      />
    );
  }

  function renderLoadingSkeleton() {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-10 w-28" />
        </div>
        {/* Filters skeleton */}
        <Card>
          <CardContent className="p-4">
            <div className="flex gap-3">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 w-[160px]" />
              <Skeleton className="h-10 w-[120px]" />
            </div>
          </CardContent>
        </Card>
        {/* Table skeleton */}
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
            <h1 className="text-2xl font-bold text-[var(--foreground)]">
              商品管理
            </h1>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              管理平台所有数字商品，共 {products.length} 件商品
            </p>
          </div>

          <Dialog
            open={dialogOpen}
            onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) resetForm();
            }}
          >
            <DialogTrigger asChild>
              <Button onClick={openAddDialog}>
                <Plus className="h-4 w-4" />
                添加商品
              </Button>
            </DialogTrigger>

            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingProduct ? "编辑商品" : "添加商品"}
                </DialogTitle>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                {/* 商品名称 */}
                <div className="grid gap-2">
                  <Label htmlFor="product-name">商品名称</Label>
                  <Input
                    id="product-name"
                    placeholder="输入商品名称"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                  />
                </div>

                {/* Slug */}
                <div className="grid gap-2">
                  <Label htmlFor="product-slug">
                    Slug{" "}
                    <span className="text-xs text-[var(--muted-foreground)]">
                      (可选，留空自动生成)
                    </span>
                  </Label>
                  <Input
                    id="product-slug"
                    placeholder="product-url-slug"
                    value={formSlug}
                    onChange={(e) => setFormSlug(e.target.value)}
                  />
                </div>

                {/* 分类 */}
                <div className="grid gap-2">
                  <Label>分类</Label>
                  <Select
                    value={formCategoryId}
                    onValueChange={setFormCategoryId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择分类" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                      value={formPrice}
                      onChange={(e) => setFormPrice(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="product-original-price">原价 (¥)</Label>
                    <Input
                      id="product-original-price"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={formOriginalPrice}
                      onChange={(e) => setFormOriginalPrice(e.target.value)}
                    />
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
                    value={formStockCount}
                    onChange={(e) => setFormStockCount(e.target.value)}
                  />
                </div>

                {/* 描述 */}
                <div className="grid gap-2">
                  <Label htmlFor="product-desc">描述</Label>
                  <textarea
                    id="product-desc"
                    rows={3}
                    className="flex w-full rounded-[var(--radius-md)] border border-[var(--input)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] ring-offset-[var(--background)] placeholder:text-[var(--muted-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="输入商品描述"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                  />
                </div>

                {/* 商品图片 */}
                <div className="grid gap-2">
                  <Label htmlFor="product-image">
                    商品图片{" "}
                    <span className="text-xs text-[var(--muted-foreground)]">
                      (可选，可上传或输入链接)
                    </span>
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="product-image"
                      placeholder="https://example.com/image.jpg"
                      value={formImage}
                      onChange={(e) => setFormImage(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="default"
                      disabled={isUploading}
                      onClick={() => document.getElementById("image-upload-input")?.click()}
                    >
                      {isUploading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "上传"
                      )}
                    </Button>
                    <input
                      id="image-upload-input"
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
                      className="hidden"
                      onChange={handleImageUpload}
                    />
                  </div>
                  {formImage.trim() && (
                    <div className="relative mt-1 h-32 w-full overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--muted)]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={formImage.trim()}
                        alt="预览"
                        className="h-full w-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* 附加图片 */}
                <div className="grid gap-2">
                  <Label>
                    附加图片{" "}
                    <span className="text-xs text-[var(--muted-foreground)]">
                      (可选，用于图片画廊)
                    </span>
                  </Label>
                  {formImages.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formImages.map((img, idx) => (
                        <div
                          key={idx}
                          className="group relative h-16 w-16 overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)]"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={img}
                            alt={`附加图片 ${idx + 1}`}
                            className="h-full w-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setFormImages((prev) =>
                                prev.filter((_, i) => i !== idx)
                              )
                            }
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
                    disabled={isUploading || formImages.length >= 8}
                    onClick={() =>
                      document
                        .getElementById("additional-image-upload")
                        ?.click()
                    }
                  >
                    {isUploading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="mr-2 h-4 w-4" />
                    )}
                    添加图片 ({formImages.length}/8)
                  </Button>
                  <input
                    id="additional-image-upload"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
                    className="hidden"
                    onChange={handleAdditionalImageUpload}
                  />
                </div>

                {/* 状态 */}
                <div className="grid gap-2">
                  <Label>状态</Label>
                  <Select
                    value={formStatus}
                    onValueChange={(v) =>
                      setFormStatus(v as "上架" | "下架")
                    }
                  >
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
                <Button
                  variant="outline"
                  onClick={() => {
                    setDialogOpen(false);
                    resetForm();
                  }}
                >
                  取消
                </Button>
                <Button onClick={handleSaveProduct} disabled={mutating}>
                  {mutating && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  {editingProduct ? "保存修改" : "确认添加"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* ---- Filters ---- */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
                <Input
                  className="pl-9"
                  placeholder="搜索商品名称、编号..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>

              {/* Category filter */}
              <Select
                value={categoryFilter}
                onValueChange={(v) => {
                  setCategoryFilter(v);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-full md:w-[160px]">
                  <SelectValue placeholder="全部分类" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部分类</SelectItem>
                  {categoryNames.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Status filter */}
              <Select
                value={statusFilter}
                onValueChange={(v) => {
                  setStatusFilter(v);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-full md:w-[140px]">
                  <SelectValue placeholder="全部状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  <SelectItem value="上架">上架</SelectItem>
                  <SelectItem value="下架">下架</SelectItem>
                  <SelectItem value="low-stock">
                    <span className="flex items-center gap-1.5">
                      <AlertTriangle className="h-3 w-3 text-orange-500" />
                      库存不足
                    </span>
                  </SelectItem>
                  <SelectItem value="out-of-stock">
                    <span className="flex items-center gap-1.5">
                      <AlertTriangle className="h-3 w-3 text-red-500" />
                      已售罄
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* Stock reconciliation button */}
              <Button
                variant="outline"
                size="sm"
                onClick={reconcileStock}
                disabled={reconciling}
                className="shrink-0"
              >
                <RefreshCw className={cn("h-4 w-4", reconciling && "animate-spin")} />
                库存校准
              </Button>

              {/* Export button */}
              <Button
                variant="outline"
                size="sm"
                onClick={exportProductsCSV}
                className="shrink-0"
              >
                <Download className="h-4 w-4" />
                导出
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
              <Button
                size="sm"
                variant="outline"
                disabled={mutating}
                onClick={() => bulkToggleStatus("上架")}
              >
                <Eye className="h-3.5 w-3.5" />
                批量上架
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={mutating}
                onClick={() => bulkToggleStatus("下架")}
              >
                <EyeOff className="h-3.5 w-3.5" />
                批量下架
              </Button>
              <Button
                size="sm"
                variant="destructive"
                disabled={mutating}
                onClick={() => {
                  setDeleteTarget(Array.from(selectedIds));
                  setDeleteDialogOpen(true);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
                批量删除
              </Button>
            </div>
          </div>
        )}

        {/* ---- Table (desktop) ---- */}
        <div className="hidden md:block">
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" aria-label="商品管理列表">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="px-4 py-3 text-left">
                      <Checkbox
                        checked={allPageSelected}
                        onCheckedChange={toggleSelectAll}
                      />
                    </th>
                    <th
                      className="cursor-pointer px-4 py-3 text-left font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                      onClick={() => handleSort("name")}
                    >
                      商品名称{renderSortIcon("name")}
                    </th>
                    <th
                      className="cursor-pointer px-4 py-3 text-left font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                      onClick={() => handleSort("category")}
                    >
                      分类{renderSortIcon("category")}
                    </th>
                    <th
                      className="cursor-pointer px-4 py-3 text-right font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                      onClick={() => handleSort("price")}
                    >
                      价格{renderSortIcon("price")}
                    </th>
                    <th
                      className="cursor-pointer px-4 py-3 text-right font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                      onClick={() => handleSort("stock")}
                    >
                      库存{renderSortIcon("stock")}
                    </th>
                    <th className="px-4 py-3 text-center font-medium text-[var(--muted-foreground)]">
                      状态
                    </th>
                    <th
                      className="cursor-pointer px-4 py-3 text-right font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                      onClick={() => handleSort("sales")}
                    >
                      销量{renderSortIcon("sales")}
                    </th>
                    <th
                      className="cursor-pointer px-4 py-3 text-right font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                      onClick={() => handleSort("views")}
                    >
                      浏览{renderSortIcon("views")}
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-[var(--muted-foreground)]">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paged.length === 0 && (
                    <tr>
                      <td
                        colSpan={8}
                        className="py-16 text-center text-[var(--muted-foreground)]"
                      >
                        <Package className="mx-auto mb-2 h-10 w-10 opacity-40" />
                        暂无商品数据
                      </td>
                    </tr>
                  )}
                  {paged.map((product) => (
                    <tr
                      key={product.id}
                      className={cn(
                        "border-b border-[var(--border)] transition-colors hover:bg-[var(--muted)]/50",
                        selectedIds.has(product.id) && "bg-[var(--muted)]/30"
                      )}
                    >
                      <td className="px-4 py-3">
                        <Checkbox
                          checked={selectedIds.has(product.id)}
                          onCheckedChange={() => toggleSelect(product.id)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-medium text-[var(--foreground)]">
                            {product.name}
                          </span>
                          <span className="text-xs text-[var(--muted-foreground)]">
                            {product.id}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[var(--muted-foreground)]">
                        {product.category}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-semibold text-[var(--foreground)]">
                          ¥{product.price.toFixed(2)}
                        </span>
                        {product.originalPrice > product.price && (
                          <span className="ml-1.5 text-xs text-[var(--muted-foreground)] line-through">
                            ¥{product.originalPrice.toFixed(2)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={cn(
                            product.stock === 0
                              ? "text-[var(--destructive)]"
                              : product.stock < 20
                              ? "text-[var(--warning)]"
                              : "text-[var(--foreground)]"
                          )}
                        >
                          {product.stock}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge
                          variant={
                            product.status === "上架" ? "success" : "secondary"
                          }
                        >
                          {product.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right text-[var(--muted-foreground)]">
                        {product.sales.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-[var(--muted-foreground)]">
                        {product.views.toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={mutating}
                            onClick={() => openEditDialog(product)}
                          >
                            <Edit className="h-3.5 w-3.5" />
                            编辑
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={mutating}
                            onClick={() => toggleStatus(product.id)}
                          >
                            {product.status === "上架" ? (
                              <>
                                <EyeOff className="h-3.5 w-3.5" />
                                下架
                              </>
                            ) : (
                              <>
                                <Eye className="h-3.5 w-3.5" />
                                上架
                              </>
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={mutating}
                            className="text-[var(--destructive)] hover:text-[var(--destructive)]"
                            onClick={() => {
                              setDeleteTarget(product.id);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            删除
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

        {/* ---- Cards (mobile) ---- */}
        <div className="grid gap-3 md:hidden">
          {/* Select all for mobile */}
          <div className="flex items-center gap-2 px-1">
            <Checkbox
              checked={allPageSelected}
              onCheckedChange={toggleSelectAll}
            />
            <span className="text-sm text-[var(--muted-foreground)]">全选</span>
          </div>

          {paged.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center py-12">
                <Package className="mb-2 h-10 w-10 text-[var(--muted-foreground)] opacity-40" />
                <span className="text-sm text-[var(--muted-foreground)]">
                  暂无商品数据
                </span>
              </CardContent>
            </Card>
          )}

          {paged.map((product) => (
            <Card
              key={product.id}
              className={cn(
                "transition-colors",
                selectedIds.has(product.id) && "ring-1 ring-[var(--primary)]"
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    className="mt-1"
                    checked={selectedIds.has(product.id)}
                    onCheckedChange={() => toggleSelect(product.id)}
                  />
                  <div className="flex-1 space-y-2">
                    {/* Name + Status */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-[var(--foreground)]">
                          {product.name}
                        </p>
                        <p className="text-xs text-[var(--muted-foreground)]">
                          {product.id} &middot; {product.category}
                        </p>
                      </div>
                      <Badge
                        variant={
                          product.status === "上架" ? "success" : "secondary"
                        }
                      >
                        {product.status}
                      </Badge>
                    </div>

                    {/* Stats row */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                      <span className="text-[var(--foreground)]">
                        <strong>¥{product.price.toFixed(2)}</strong>
                        {product.originalPrice > product.price && (
                          <span className="ml-1 text-xs text-[var(--muted-foreground)] line-through">
                            ¥{product.originalPrice.toFixed(2)}
                          </span>
                        )}
                      </span>
                      <span className="text-[var(--muted-foreground)]">
                        库存:{" "}
                        <span
                          className={cn(
                            product.stock === 0
                              ? "text-[var(--destructive)]"
                              : product.stock < 20
                              ? "text-[var(--warning)]"
                              : "text-[var(--foreground)]"
                          )}
                        >
                          {product.stock}
                        </span>
                      </span>
                      <span className="text-[var(--muted-foreground)]">
                        销量: {product.sales.toLocaleString()}
                      </span>
                      <span className="text-[var(--muted-foreground)]">
                        浏览: {product.views.toLocaleString()}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-1 pt-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={mutating}
                        onClick={() => openEditDialog(product)}
                      >
                        <Edit className="h-3.5 w-3.5" />
                        编辑
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={mutating}
                        onClick={() => toggleStatus(product.id)}
                      >
                        {product.status === "上架" ? (
                          <>
                            <EyeOff className="h-3.5 w-3.5" />
                            下架
                          </>
                        ) : (
                          <>
                            <Eye className="h-3.5 w-3.5" />
                            上架
                          </>
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={mutating}
                        className="text-[var(--destructive)] hover:text-[var(--destructive)]"
                        onClick={() => {
                          setDeleteTarget(product.id);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        删除
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ---- Pagination ---- */}
        {filtered.length > 0 && (
          <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
            <p className="text-sm text-[var(--muted-foreground)]">
              显示 {(safePage - 1) * ITEMS_PER_PAGE + 1}–
              {Math.min(safePage * ITEMS_PER_PAGE, filtered.length)} 条，共{" "}
              {filtered.length} 条
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={safePage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (page) => (
                  <Button
                    key={page}
                    variant={page === safePage ? "default" : "outline"}
                    size="sm"
                    className="min-w-[36px]"
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </Button>
                )
              )}
              <Button
                variant="outline"
                size="sm"
                disabled={safePage >= totalPages}
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
              >
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
            <Button
              variant="outline"
              onClick={() => {
                setDeleteTarget(null);
                setDeleteDialogOpen(false);
              }}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              disabled={mutating}
              onClick={confirmDelete}
            >
              {mutating && <Loader2 className="h-4 w-4 animate-spin" />}
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
