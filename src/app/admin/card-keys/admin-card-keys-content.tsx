"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Key,
  Download,
  Search,
  Ban,
  CheckCircle,
  Package,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Pagination from "@/components/shared/pagination";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { apiFetch, apiMutate } from "@/lib/api-fetch";
import { CardKeysTable } from "./card-keys-table";
import { ImportCardKeysDialog } from "./import-card-keys-dialog";
import { DeleteCardKeyDialog, BatchActionDialog } from "./card-keys-dialogs";

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

interface PaginationData {
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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AdminCardKeysPageContent() {
  // Data state
  const [cardKeys, setCardKeys] = useState<ApiCardKey[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({
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

        const data = await apiFetch<{
          success: boolean;
          cardKeys: ApiCardKey[];
          pagination: PaginationData;
        }>(`/api/admin/card-keys?${params.toString()}`);
        setCardKeys(data.cardKeys);
        setPagination(data.pagination);
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
      type StatsRes = { success: boolean; pagination: { total: number } };
      const [allData, availData, soldData, disData] = await Promise.all([
        apiFetch<StatsRes>("/api/admin/card-keys?pageSize=1"),
        apiFetch<StatsRes>("/api/admin/card-keys?pageSize=1&status=AVAILABLE"),
        apiFetch<StatsRes>("/api/admin/card-keys?pageSize=1&status=SOLD"),
        apiFetch<StatsRes>("/api/admin/card-keys?pageSize=1&status=DISABLED"),
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
      const data = await apiFetch<{
        success: boolean;
        products: { id: string; name: string }[];
      }>("/api/admin/products");
      if (Array.isArray(data.products)) {
        setProducts(
          data.products.map((p) => ({
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
      await apiMutate(`/api/admin/card-keys?id=${id}`, "PUT", { status: newStatus });
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
      await apiMutate(`/api/admin/card-keys?id=${deleteTarget}`, "DELETE");
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
      const data = await apiMutate<{ success: boolean; message: string }>(
        "/api/admin/card-keys",
        "PATCH",
        {
          action: batchAction,
          ids: Array.from(selectedIds),
        }
      );
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

      const data = await apiFetch<{
        success: boolean;
        cardKeys: ApiCardKey[];
      }>(`/api/admin/card-keys?${params.toString()}`);

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
          <ImportCardKeysDialog
            open={importOpen}
            onOpenChange={setImportOpen}
            products={products}
            importProduct={importProduct}
            onImportProductChange={setImportProduct}
            importContent={importContent}
            onImportContentChange={setImportContent}
            importLoading={importLoading}
            onImport={handleImport}
            onFileUpload={handleFileUpload}
          />
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
      <CardKeysTable
        cardKeys={cardKeys}
        selectedIds={selectedIds}
        revealedKeys={revealedKeys}
        mutating={mutating}
        onToggleSelectAll={toggleSelectAll}
        onToggleSelect={toggleSelect}
        onToggleReveal={toggleReveal}
        onToggleStatus={toggleStatus}
        onDelete={(id) => {
          setDeleteTarget(id);
          setDeleteDialogOpen(true);
        }}
      />

      {/* Pagination */}
      <Pagination
        page={pagination.page}
        totalPages={pagination.totalPages}
        total={pagination.total}
        onPageChange={setCurrentPage}
      />

      {/* Delete confirmation dialog */}
      <DeleteCardKeyDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        mutating={mutating}
        onConfirm={confirmDelete}
        onCancel={() => {
          setDeleteTarget(null);
          setDeleteDialogOpen(false);
        }}
      />

      {/* Batch action confirmation dialog */}
      <BatchActionDialog
        open={batchDialogOpen}
        onOpenChange={setBatchDialogOpen}
        batchAction={batchAction}
        selectedCount={selectedIds.size}
        mutating={mutating}
        onConfirm={handleBatchAction}
        onCancel={() => {
          setBatchDialogOpen(false);
          setBatchAction(null);
        }}
      />
    </div>
  );
}
