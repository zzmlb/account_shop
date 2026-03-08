"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  originalPrice: number;
  stock: number;
  status: "上架" | "下架";
  sales: number;
  description: string;
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const CATEGORIES = [
  "邮箱账号",
  "流媒体",
  "VPN服务",
  "社交媒体",
  "云存储",
  "软件许可",
];

const initialProducts: Product[] = [
  {
    id: "P001",
    name: "Gmail 邮箱账号 - 全新注册",
    category: "邮箱账号",
    price: 8.9,
    originalPrice: 15.0,
    stock: 350,
    status: "上架",
    sales: 1247,
    description: "全新注册 Gmail 邮箱，支持 POP3/IMAP，稳定可靠",
  },
  {
    id: "P002",
    name: "Netflix 高级会员 - 月卡",
    category: "流媒体",
    price: 25.0,
    originalPrice: 45.0,
    stock: 128,
    status: "上架",
    sales: 862,
    description: "Netflix Premium 独享账号，支持4K超高清，可同时4屏观看",
  },
  {
    id: "P003",
    name: "ExpressVPN 一年订阅",
    category: "VPN服务",
    price: 68.0,
    originalPrice: 120.0,
    stock: 75,
    status: "上架",
    sales: 534,
    description: "全球94个国家服务器节点，无限流量，极速连接",
  },
  {
    id: "P004",
    name: "Spotify Premium 季卡",
    category: "流媒体",
    price: 35.0,
    originalPrice: 60.0,
    stock: 200,
    status: "上架",
    sales: 723,
    description: "Spotify 高级会员3个月，无广告畅听，支持离线下载",
  },
  {
    id: "P005",
    name: "Outlook 企业邮箱",
    category: "邮箱账号",
    price: 12.0,
    originalPrice: 20.0,
    stock: 0,
    status: "下架",
    sales: 389,
    description: "Microsoft 365 企业邮箱，50GB存储空间",
  },
  {
    id: "P006",
    name: "NordVPN 两年套餐",
    category: "VPN服务",
    price: 99.0,
    originalPrice: 180.0,
    stock: 45,
    status: "上架",
    sales: 412,
    description: "双重VPN加密，5500+服务器，支持6台设备同时连接",
  },
  {
    id: "P007",
    name: "Twitter/X 蓝标认证账号",
    category: "社交媒体",
    price: 150.0,
    originalPrice: 220.0,
    stock: 15,
    status: "上架",
    sales: 98,
    description: "已认证蓝标 X Premium 账号，含所有高级功能",
  },
  {
    id: "P008",
    name: "Google Drive 2TB 年卡",
    category: "云存储",
    price: 45.0,
    originalPrice: 69.0,
    stock: 180,
    status: "上架",
    sales: 567,
    description: "Google One 2TB云存储空间，支持全家共享",
  },
  {
    id: "P009",
    name: "Disney+ 高级会员 - 年卡",
    category: "流媒体",
    price: 88.0,
    originalPrice: 150.0,
    stock: 92,
    status: "上架",
    sales: 345,
    description: "Disney Plus 年度会员，包含所有迪士尼、漫威、星战内容",
  },
  {
    id: "P010",
    name: "Instagram 万粉老号",
    category: "社交媒体",
    price: 280.0,
    originalPrice: 400.0,
    stock: 8,
    status: "下架",
    sales: 56,
    description: "Instagram 活跃老号，10000+真实粉丝，高互动率",
  },
  {
    id: "P011",
    name: "iCloud 200GB 年度方案",
    category: "云存储",
    price: 32.0,
    originalPrice: 50.0,
    stock: 220,
    status: "上架",
    sales: 678,
    description: "Apple iCloud 200GB 年度存储方案，自动续期",
  },
  {
    id: "P012",
    name: "Windows 11 Pro 激活密钥",
    category: "软件许可",
    price: 58.0,
    originalPrice: 128.0,
    stock: 500,
    status: "上架",
    sales: 1523,
    description: "正版 Windows 11 专业版永久激活密钥，支持在线激活",
  },
];

const ITEMS_PER_PAGE = 6;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------


export default function AdminProductsPageContent() {
  // State
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | string[] | null>(null);
  const [sortField, setSortField] = useState<keyof Product | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Form state for add dialog
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formOriginalPrice, setFormOriginalPrice] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formStatus, setFormStatus] = useState<"上架" | "下架">("上架");

  // ---------------------------------------------------------------------------
  // Derived data
  // ---------------------------------------------------------------------------

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

    // Status
    if (statusFilter !== "all") {
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

  function toggleStatus(id: string) {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, status: p.status === "上架" ? "下架" : "上架" }
          : p
      )
    );
  }

  function bulkToggleStatus(status: "上架" | "下架") {
    setProducts((prev) =>
      prev.map((p) => (selectedIds.has(p.id) ? { ...p, status } : p))
    );
    setSelectedIds(new Set());
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    const idsToDelete = Array.isArray(deleteTarget)
      ? deleteTarget
      : [deleteTarget];
    setProducts((prev) => prev.filter((p) => !idsToDelete.includes(p.id)));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      idsToDelete.forEach((id) => next.delete(id));
      return next;
    });
    setDeleteTarget(null);
    setDeleteDialogOpen(false);
  }

  function handleAddProduct() {
    if (!formName.trim() || !formCategory || !formPrice) return;
    const newProduct: Product = {
      id: `P${String(products.length + 1).padStart(3, "0")}`,
      name: formName.trim(),
      category: formCategory,
      price: parseFloat(formPrice) || 0,
      originalPrice: parseFloat(formOriginalPrice) || parseFloat(formPrice) || 0,
      stock: 0,
      status: formStatus,
      sales: 0,
      description: formDescription.trim(),
    };
    setProducts((prev) => [newProduct, ...prev]);
    resetForm();
    setDialogOpen(false);
  }

  function resetForm() {
    setFormName("");
    setFormCategory("");
    setFormPrice("");
    setFormOriginalPrice("");
    setFormDescription("");
    setFormStatus("上架");
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

  // ---------------------------------------------------------------------------
  // JSX
  // ---------------------------------------------------------------------------

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

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => resetForm()}>
                <Plus className="h-4 w-4" />
                添加商品
              </Button>
            </DialogTrigger>

            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>添加商品</DialogTitle>
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

                {/* 分类 */}
                <div className="grid gap-2">
                  <Label>分类</Label>
                  <Select value={formCategory} onValueChange={setFormCategory}>
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

                {/* 状态 */}
                <div className="grid gap-2">
                  <Label>状态</Label>
                  <Select
                    value={formStatus}
                    onValueChange={(v) => setFormStatus(v as "上架" | "下架")}
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
                  onClick={() => setDialogOpen(false)}
                >
                  取消
                </Button>
                <Button onClick={handleAddProduct}>确认添加</Button>
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
                  {CATEGORIES.map((c) => (
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
                <SelectTrigger className="w-full md:w-[120px]">
                  <SelectValue placeholder="全部状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  <SelectItem value="上架">上架</SelectItem>
                  <SelectItem value="下架">下架</SelectItem>
                </SelectContent>
              </Select>
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
                onClick={() => bulkToggleStatus("上架")}
              >
                <Eye className="h-3.5 w-3.5" />
                批量上架
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => bulkToggleStatus("下架")}
              >
                <EyeOff className="h-3.5 w-3.5" />
                批量下架
              </Button>
              <Button
                size="sm"
                variant="destructive"
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
              <table className="w-full text-sm">
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
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm">
                            <Edit className="h-3.5 w-3.5" />
                            编辑
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
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
                    </div>

                    {/* Actions */}
                    <div className="flex gap-1 pt-1">
                      <Button variant="ghost" size="sm">
                        <Edit className="h-3.5 w-3.5" />
                        编辑
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
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
              ? `确定要删除选中的 ${deleteTarget.length} 件商品吗？此操作无法撤销。`
              : "确定要删除该商品吗？此操作无法撤销。"}
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
            <Button variant="destructive" onClick={confirmDelete}>
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
