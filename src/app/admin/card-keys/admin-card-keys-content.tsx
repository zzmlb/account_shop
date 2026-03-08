"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Key,
  Upload,
  Download,
  Search,
  Eye,
  EyeOff,
  Ban,
  CheckCircle,
  Package,
  Trash2,
  Loader2,
  AlertTriangle,
  FileUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Pagination from "@/components/shared/pagination";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { cn, formatDateTime } from "@/lib/utils";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CardKeyProduct {
  name: string;
  slug: string;
}

interface ApiCardKey {
  id: string;
  content: string;
  productId: string;
  product: CardKeyProduct;
  status: "AVAILABLE" | "SOLD" | "DISABLED";
  orderItemId: string | null;
  orderNo: string | null;
  soldAt: string | null;
  createdAt: string;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface ProductOption {
  id: string;
  name: string;
}

interface Stats {
  total: number;
  available: number;
  sold: number;
  disabled: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 20;

const statusTabs = [
  { value: "all", label: "全部" },
  { value: "AVAILABLE", label: "可用" },
  { value: "SOLD", label: "已售" },
  { value: "DISABLED", label: "已禁用" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function statusLabel(status: string): string {
  switch (status) {
    case "AVAILABLE":
      return "可用";
    case "SOLD":
      return "已售";
    case "DISABLED":
      return "已禁用";
    default:
      return status;
  }
}

function statusVariant(
  status: string
): "success" | "default" | "destructive" | "secondary" {
  switch (status) {
    case "AVAILABLE":
      return "success";
    case "SOLD":
      return "default";
    case "DISABLED":
      return "destructive";
    default:
      return "secondary";
  }
}

function maskContent(content: string): string {
  const parts = content.split("-");
  if (parts.length >= 4) {
    return `${parts[0]}-****-****-${parts[parts.length - 1]}`;
  }
  if (content.length > 8) {
    return `${content.slice(0, 4)}****${content.slice(-4)}`;
  }
  return "****";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AdminCardKeysPageContent() {
  // Data state
  const [cardKeys, setCardKeys] = useState<ApiCardKey[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: PAGE_SIZE,
    total: 0,
    totalPages: 1,
  });
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    available: 0,
    sold: 0,
    disabled: 0,
  });
  const [loading, setLoading] = useState(true);
  const [mutating, setMutating] = useState(false);

  // Filter state
  const [activeTab, setActiveTab] = useState<string>("all");
  const [productFilter, setProductFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Reveal state
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());

  // Import dialog state
  const [importOpen, setImportOpen] = useState(false);
  const [importProduct, setImportProduct] = useState("");
  const [importContent, setImportContent] = useState("");
  const [importLoading, setImportLoading] = useState(false);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // Batch selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchAction, setBatchAction] = useState<string | null>(null);
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);

  // File upload ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Track whether initial load is done
  const initialized = useRef(false);

  // ---------------------------------------------------------------------------
  // Debounce search input
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      if (initialized.current) {
        setCurrentPage(1);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  const fetchCardKeys = useCallback(
    async (page?: number) => {
      try {
        const params = new URLSearchParams();
        params.set("page", String(page ?? currentPage));
        params.set("pageSize", String(PAGE_SIZE));

        if (activeTab !== "all") {
          params.set("status", activeTab);
        }
        if (productFilter !== "all") {
          params.set("productId", productFilter);
        }
        if (debouncedSearch.trim()) {
          params.set("search", debouncedSearch.trim());
        }

        const res = await fetch(`/api/admin/card-keys?${params.toString()}`);
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.message || `请求失败 (${res.status})`);
        }
        const data = await res.json();
        if (data.success) {
          setCardKeys(data.cardKeys);
          setPagination(data.pagination);
        } else {
          throw new Error(data.message || "获取卡密列表失败");
        }
      } catch (err) {
        toast.error("加载卡密失败", {
          description: err instanceof Error ? err.message : "未知错误",
        });
      }
    },
    [activeTab, productFilter, debouncedSearch, currentPage]
  );

  const fetchStats = useCallback(async () => {
    try {
      const [allRes, availRes, soldRes, disRes] = await Promise.all([
        fetch("/api/admin/card-keys?pageSize=1"),
        fetch("/api/admin/card-keys?pageSize=1&status=AVAILABLE"),
        fetch("/api/admin/card-keys?pageSize=1&status=SOLD"),
        fetch("/api/admin/card-keys?pageSize=1&status=DISABLED"),
      ]);
      const [allData, availData, soldData, disData] = await Promise.all([
        allRes.json(),
        availRes.json(),
        soldRes.json(),
        disRes.json(),
      ]);
      setStats({
        total: allData.pagination?.total ?? 0,
        available: availData.pagination?.total ?? 0,
        sold: soldData.pagination?.total ?? 0,
        disabled: disData.pagination?.total ?? 0,
      });
    } catch {
      // Stats are non-critical; silently ignore
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/products");
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || `请求失败 (${res.status})`);
      }
      const data = await res.json();
      if (data.success && Array.isArray(data.products)) {
        setProducts(
          data.products.map((p: { id: string; name: string }) => ({
            id: p.id,
            name: p.name,
          }))
        );
      }
    } catch (err) {
      toast.error("加载商品列表失败", {
        description: err instanceof Error ? err.message : "未知错误",
      });
    }
  }, []);

  // Initial load
  useEffect(() => {
    async function init() {
      setLoading(true);
      await Promise.all([fetchCardKeys(1), fetchProducts(), fetchStats()]);
      setLoading(false);
      initialized.current = true;
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refetch when filters or page change (skip initial load)
  useEffect(() => {
    if (initialized.current) {
      fetchCardKeys();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, productFilter, debouncedSearch, currentPage]);

  // Refresh both list + stats after a mutation
  const refreshAfterMutation = useCallback(async () => {
    await Promise.all([fetchCardKeys(), fetchStats()]);
  }, [fetchCardKeys, fetchStats]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleTabChange = (val: string) => {
    setActiveTab(val);
    setCurrentPage(1);
  };

  const handleProductFilterChange = (val: string) => {
    setProductFilter(val);
    setCurrentPage(1);
  };

  const handleSearch = (val: string) => {
    setSearch(val);
  };

  const toggleReveal = (id: string) => {
    setRevealedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    if (currentStatus === "SOLD") return;
    const newStatus =
      currentStatus === "AVAILABLE" ? "DISABLED" : "AVAILABLE";

    setMutating(true);
    try {
      const res = await fetch(`/api/admin/card-keys?id=${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "操作失败");
      }
      toast.success(
        newStatus === "AVAILABLE" ? "卡密已启用" : "卡密已禁用"
      );
      await refreshAfterMutation();
    } catch (err) {
      toast.error("切换状态失败", {
        description: err instanceof Error ? err.message : "未知错误",
      });
    } finally {
      setMutating(false);
    }
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
      const res = await fetch("/api/admin/card-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: importProduct,
          keys: lines,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "导入失败");
      }
      const dupInfo = data.duplicates;
      const dupDesc = dupInfo && (dupInfo.batch > 0 || dupInfo.existing > 0)
        ? `跳过 ${dupInfo.batch > 0 ? `${dupInfo.batch} 个批内重复` : ""}${dupInfo.batch > 0 && dupInfo.existing > 0 ? "、" : ""}${dupInfo.existing > 0 ? `${dupInfo.existing} 个已存在` : ""}`
        : undefined;
      toast.success(data.message || `成功导入 ${data.count} 个卡密`, {
        ...(dupDesc && { description: dupDesc }),
      });
      setImportProduct("");
      setImportContent("");
      setImportOpen(false);
      setCurrentPage(1);
      await refreshAfterMutation();
    } catch (err) {
      toast.error("导入卡密失败", {
        description: err instanceof Error ? err.message : "未知错误",
      });
    } finally {
      setImportLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    setMutating(true);
    try {
      const res = await fetch(`/api/admin/card-keys?id=${deleteTarget}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "删除失败");
      }
      toast.success("卡密已删除");
      setDeleteTarget(null);
      setDeleteDialogOpen(false);
      await refreshAfterMutation();
    } catch (err) {
      toast.error("删除卡密失败", {
        description: err instanceof Error ? err.message : "未知错误",
      });
    } finally {
      setMutating(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Batch selection handlers
  // ---------------------------------------------------------------------------

  const toggleSelectAll = () => {
    const selectableIds = cardKeys
      .filter((k) => k.status !== "SOLD")
      .map((k) => k.id);
    if (selectableIds.length === 0) return;
    const allSelected = selectableIds.every((id) => selectedIds.has(id));
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(selectableIds));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleBatchAction = async () => {
    if (!batchAction || selectedIds.size === 0) return;
    setMutating(true);
    try {
      const res = await fetch("/api/admin/card-keys", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: batchAction,
          ids: Array.from(selectedIds),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "批量操作失败");
      }
      toast.success(data.message);
      setSelectedIds(new Set());
      setBatchDialogOpen(false);
      setBatchAction(null);
      await refreshAfterMutation();
    } catch (err) {
      toast.error("批量操作失败", {
        description: err instanceof Error ? err.message : "未知错误",
      });
    } finally {
      setMutating(false);
    }
  };

  // ---------------------------------------------------------------------------
  // File upload handler
  // ---------------------------------------------------------------------------

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
    // Reset input so the same file can be uploaded again
    e.target.value = "";
  };

  // ---------------------------------------------------------------------------
  // Export handler
  // ---------------------------------------------------------------------------

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      params.set("pageSize", "10000");
      if (activeTab !== "all") params.set("status", activeTab);
      if (productFilter !== "all") params.set("productId", productFilter);
      if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());

      const res = await fetch(`/api/admin/card-keys?${params.toString()}`);
      const data = await res.json();
      if (!data.success || !Array.isArray(data.cardKeys)) {
        throw new Error(data.message || "导出失败");
      }

      const rows = [
        ["商品", "卡密内容", "状态", "订单号", "添加时间", "售出时间"].join(","),
        ...data.cardKeys.map((ck: ApiCardKey) =>
          [
            `"${ck.product.name}"`,
            `"${ck.content}"`,
            statusLabel(ck.status),
            ck.orderNo || "",
            ck.createdAt.slice(0, 16).replace("T", " "),
            ck.soldAt ? ck.soldAt.slice(0, 16).replace("T", " ") : "",
          ].join(",")
        ),
      ];

      const bom = "\uFEFF";
      const blob = new Blob([bom + rows.join("\n")], {
        type: "text/csv;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `卡密导出_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`已导出 ${data.cardKeys.length} 条卡密`);
    } catch (err) {
      toast.error("导出失败", {
        description: err instanceof Error ? err.message : "未知错误",
      });
    }
  };

  // Clear selection when filters change
  useEffect(() => {
    setSelectedIds(new Set());
  }, [activeTab, productFilter, debouncedSearch, currentPage]);

  // ---------------------------------------------------------------------------
  // Render: Loading skeleton
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-10 w-28" />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-[var(--radius-lg)]" />
          ))}
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 flex-1" />
        </div>
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)]">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3">
              <Skeleton className="h-5 flex-1" />
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-8 w-32" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: Main content
  // ---------------------------------------------------------------------------

  const importLineCount = importContent
    .split("\n")
    .filter((l) => l.trim()).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">卡密管理</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            管理所有商品的卡密库存
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            导出
          </Button>
          <Dialog open={importOpen} onOpenChange={setImportOpen}>
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
                  onClick={() => setImportOpen(false)}
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
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          {
            label: "总卡密数",
            value: stats.total.toLocaleString(),
            icon: Key,
            color: "text-[var(--foreground)]",
            bg: "bg-[var(--muted)]",
          },
          {
            label: "可用",
            value: stats.available.toLocaleString(),
            icon: CheckCircle,
            color: "text-[var(--success)]",
            bg: "bg-[var(--success)]/10",
          },
          {
            label: "已售",
            value: stats.sold.toLocaleString(),
            icon: Package,
            color: "text-[var(--primary)]",
            bg: "bg-[var(--primary)]/10",
          },
          {
            label: "已禁用",
            value: stats.disabled.toLocaleString(),
            icon: Ban,
            color: "text-[var(--destructive)]",
            bg: "bg-[var(--destructive)]/10",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-4"
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)]",
                  stat.bg
                )}
              >
                <stat.icon className={cn("h-5 w-5", stat.color)} />
              </div>
              <div>
                <p className="text-sm text-[var(--muted-foreground)]">
                  {stat.label}
                </p>
                <p className="text-xl font-bold">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList>
              {statusTabs.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <Select
            value={productFilter}
            onValueChange={handleProductFilterChange}
          >
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="全部商品" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部商品</SelectItem>
              {products.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <Input
            placeholder="搜索卡密内容..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-9 sm:w-72"
          />
        </div>
      </div>

      {/* Batch action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--primary)]/30 bg-[var(--primary)]/5 px-4 py-3">
          <span className="text-sm font-medium">
            已选择 {selectedIds.size} 项
          </span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setBatchAction("enable");
                setBatchDialogOpen(true);
              }}
            >
              <CheckCircle className="mr-1 h-3.5 w-3.5" />
              批量启用
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setBatchAction("disable");
                setBatchDialogOpen(true);
              }}
            >
              <Ban className="mr-1 h-3.5 w-3.5" />
              批量禁用
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => {
                setBatchAction("delete");
                setBatchDialogOpen(true);
              }}
            >
              <Trash2 className="mr-1 h-3.5 w-3.5" />
              批量删除
            </Button>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelectedIds(new Set())}
            className="ml-auto"
          >
            取消选择
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)]">
        <table className="w-full text-sm" aria-label="卡密管理列表">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--muted)]/50">
              <th className="w-10 px-4 py-3">
                <Checkbox
                  checked={
                    cardKeys.filter((k) => k.status !== "SOLD").length > 0 &&
                    cardKeys
                      .filter((k) => k.status !== "SOLD")
                      .every((k) => selectedIds.has(k.id))
                  }
                  onCheckedChange={toggleSelectAll}
                  aria-label="全选"
                />
              </th>
              <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">
                商品
              </th>
              <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">
                卡密内容
              </th>
              <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">
                状态
              </th>
              <th className="hidden px-4 py-3 text-left font-medium text-[var(--muted-foreground)] md:table-cell">
                添加时间
              </th>
              <th className="hidden px-4 py-3 text-left font-medium text-[var(--muted-foreground)] lg:table-cell">
                售出时间
              </th>
              <th className="hidden px-4 py-3 text-left font-medium text-[var(--muted-foreground)] lg:table-cell">
                订单号
              </th>
              <th className="px-4 py-3 text-right font-medium text-[var(--muted-foreground)]">
                操作
              </th>
            </tr>
          </thead>
          <tbody>
            {cardKeys.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-16 text-center">
                  <div className="flex flex-col items-center">
                    <div className="mb-4 rounded-full bg-[var(--muted)] p-4">
                      <Key className="h-10 w-10 text-[var(--muted-foreground)]" />
                    </div>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      暂无卡密数据
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              cardKeys.map((key) => (
                <tr
                  key={key.id}
                  className="border-b border-[var(--border)] last:border-b-0 transition-colors hover:bg-[var(--card-hover)]"
                >
                  <td className="w-10 px-4 py-3">
                    {key.status !== "SOLD" ? (
                      <Checkbox
                        checked={selectedIds.has(key.id)}
                        onCheckedChange={() => toggleSelect(key.id)}
                        aria-label={`选择 ${key.product.name} 卡密`}
                      />
                    ) : (
                      <div className="h-4 w-4" />
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {key.product.name}
                  </td>
                  <td className="px-4 py-3">
                    <code className="rounded-[var(--radius-sm)] bg-[var(--muted)] px-2 py-1 font-mono text-xs">
                      {revealedKeys.has(key.id)
                        ? key.content
                        : maskContent(key.content)}
                    </code>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={statusVariant(key.status)}>
                      {statusLabel(key.status)}
                    </Badge>
                  </td>
                  <td className="hidden px-4 py-3 text-[var(--muted-foreground)] md:table-cell">
                    {formatDateTime(key.createdAt)}
                  </td>
                  <td className="hidden px-4 py-3 text-[var(--muted-foreground)] lg:table-cell">
                    {key.soldAt ? formatDateTime(key.soldAt) : "-"}
                  </td>
                  <td className="hidden px-4 py-3 text-[var(--muted-foreground)] lg:table-cell">
                    {key.orderNo ? (
                      <code className="rounded-[var(--radius-sm)] bg-[var(--muted)] px-1.5 py-0.5 font-mono text-xs">
                        {key.orderNo}
                      </code>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleReveal(key.id)}
                        title={
                          revealedKeys.has(key.id)
                            ? "隐藏卡密"
                            : "查看卡密"
                        }
                      >
                        {revealedKeys.has(key.id) ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                        <span className="ml-1 hidden sm:inline">
                          {revealedKeys.has(key.id) ? "隐藏" : "查看"}
                        </span>
                      </Button>
                      {key.status !== "SOLD" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={mutating}
                          onClick={() =>
                            toggleStatus(key.id, key.status)
                          }
                          className={cn(
                            key.status === "AVAILABLE"
                              ? "text-[var(--destructive)] hover:text-[var(--destructive)]"
                              : "text-[var(--success)] hover:text-[var(--success)]"
                          )}
                        >
                          {key.status === "AVAILABLE" ? (
                            <Ban className="h-4 w-4" />
                          ) : (
                            <CheckCircle className="h-4 w-4" />
                          )}
                          <span className="ml-1 hidden sm:inline">
                            {key.status === "AVAILABLE"
                              ? "禁用"
                              : "启用"}
                          </span>
                        </Button>
                      )}
                      {key.status !== "SOLD" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={mutating}
                          className="text-[var(--destructive)] hover:text-[var(--destructive)]"
                          onClick={() => {
                            setDeleteTarget(key.id);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="ml-1 hidden sm:inline">
                            删除
                          </span>
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <Pagination
        page={pagination.page}
        totalPages={pagination.totalPages}
        total={pagination.total}
        onPageChange={setCurrentPage}
      />

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-[var(--destructive)]" />
              确认删除
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[var(--muted-foreground)]">
            确定要删除该卡密吗？此操作不可撤销。
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteTarget(null);
                setDeleteDialogOpen(false);
              }}
              disabled={mutating}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              disabled={mutating}
              onClick={confirmDelete}
            >
              {mutating && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch action confirmation dialog */}
      <Dialog open={batchDialogOpen} onOpenChange={setBatchDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className={cn(
                "h-5 w-5",
                batchAction === "delete"
                  ? "text-[var(--destructive)]"
                  : "text-[var(--primary)]"
              )} />
              确认批量{batchAction === "enable" ? "启用" : batchAction === "disable" ? "禁用" : "删除"}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[var(--muted-foreground)]">
            确定要{batchAction === "enable" ? "启用" : batchAction === "disable" ? "禁用" : "删除"}{" "}
            {selectedIds.size} 个卡密吗？
            {batchAction === "delete" && "此操作不可撤销。"}
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setBatchDialogOpen(false);
                setBatchAction(null);
              }}
              disabled={mutating}
            >
              取消
            </Button>
            <Button
              variant={batchAction === "delete" ? "destructive" : "default"}
              disabled={mutating}
              onClick={handleBatchAction}
            >
              {mutating && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              确认
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
