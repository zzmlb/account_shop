"use client";

import { useState, useMemo } from "react";
import {
  Key,
  Upload,
  Download,
  Search,
  Eye,
  EyeOff,
  Ban,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
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
import { cn } from "@/lib/utils";

type CardKeyStatus = "all" | "available" | "sold" | "disabled";

interface MockCardKey {
  id: string;
  product: string;
  content: string;
  maskedContent: string;
  status: "available" | "sold" | "disabled";
  statusLabel: string;
  statusVariant: "success" | "default" | "destructive";
  addedAt: string;
  soldAt: string | null;
}

const MOCK_CARD_KEYS: MockCardKey[] = [
  {
    id: "1",
    product: "Gmail 全新账号",
    content: "GMAL-8K2F-J9X3-Q7WN",
    maskedContent: "GMAL-****-****-Q7WN",
    status: "available",
    statusLabel: "可用",
    statusVariant: "success",
    addedAt: "2026-03-07 10:00",
    soldAt: null,
  },
  {
    id: "2",
    product: "Netflix 高级会员",
    content: "NFLX-3P7R-M1D5-H8YC",
    maskedContent: "NFLX-****-****-H8YC",
    status: "sold",
    statusLabel: "已售",
    statusVariant: "default",
    addedAt: "2026-03-06 14:20",
    soldAt: "2026-03-07 09:15",
  },
  {
    id: "3",
    product: "ChatGPT Plus 共享账号",
    content: "CGPT-5W9L-B4T2-N6KA",
    maskedContent: "CGPT-****-****-N6KA",
    status: "available",
    statusLabel: "可用",
    statusVariant: "success",
    addedAt: "2026-03-06 08:30",
    soldAt: null,
  },
  {
    id: "4",
    product: "NordVPN 2年套餐",
    content: "NVPN-7E1G-Z3X8-F2RM",
    maskedContent: "NVPN-****-****-F2RM",
    status: "disabled",
    statusLabel: "已禁用",
    statusVariant: "destructive",
    addedAt: "2026-03-05 16:45",
    soldAt: null,
  },
  {
    id: "5",
    product: "Spotify Premium 年卡",
    content: "SPTF-2J6V-K8Q1-W4PB",
    maskedContent: "SPTF-****-****-W4PB",
    status: "sold",
    statusLabel: "已售",
    statusVariant: "default",
    addedAt: "2026-03-05 11:00",
    soldAt: "2026-03-06 20:30",
  },
  {
    id: "6",
    product: "Gmail 全新账号",
    content: "GMAL-9C4H-T6Y2-A5ND",
    maskedContent: "GMAL-****-****-A5ND",
    status: "available",
    statusLabel: "可用",
    statusVariant: "success",
    addedAt: "2026-03-04 09:15",
    soldAt: null,
  },
  {
    id: "7",
    product: "Steam 余额账号 $50",
    content: "STEM-1R8U-F3L7-D9XE",
    maskedContent: "STEM-****-****-D9XE",
    status: "sold",
    statusLabel: "已售",
    statusVariant: "default",
    addedAt: "2026-03-03 15:20",
    soldAt: "2026-03-04 13:45",
  },
  {
    id: "8",
    product: "Adobe Creative Cloud",
    content: "ADBE-6M2S-P9W4-G1KC",
    maskedContent: "ADBE-****-****-G1KC",
    status: "available",
    statusLabel: "可用",
    statusVariant: "success",
    addedAt: "2026-03-02 12:00",
    soldAt: null,
  },
  {
    id: "9",
    product: "Disney+ 年卡",
    content: "DSNP-4Q7B-N2J6-V8TH",
    maskedContent: "DSNP-****-****-V8TH",
    status: "disabled",
    statusLabel: "已禁用",
    statusVariant: "destructive",
    addedAt: "2026-03-01 18:30",
    soldAt: null,
  },
  {
    id: "10",
    product: "YouTube Premium 家庭版",
    content: "YTPB-8A3F-X5R1-L7WQ",
    maskedContent: "YTPB-****-****-L7WQ",
    status: "available",
    statusLabel: "可用",
    statusVariant: "success",
    addedAt: "2026-02-28 10:45",
    soldAt: null,
  },
];

const statusTabs = [
  { value: "all", label: "全部" },
  { value: "available", label: "可用" },
  { value: "sold", label: "已售" },
  { value: "disabled", label: "已禁用" },
];

const PRODUCTS = [
  "Gmail 全新账号",
  "Netflix 高级会员",
  "ChatGPT Plus 共享账号",
  "NordVPN 2年套餐",
  "Spotify Premium 年卡",
  "Steam 余额账号 $50",
  "Adobe Creative Cloud",
  "Disney+ 年卡",
  "YouTube Premium 家庭版",
];

const PAGE_SIZE = 5;

export const dynamic = "force-dynamic";

export default function CardKeysPage() {
  const [activeTab, setActiveTab] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());
  const [cardKeys, setCardKeys] = useState(MOCK_CARD_KEYS);
  const [importOpen, setImportOpen] = useState(false);
  const [importProduct, setImportProduct] = useState("");
  const [importContent, setImportContent] = useState("");

  const stats = useMemo(() => {
    const total = cardKeys.length;
    const available = cardKeys.filter((k) => k.status === "available").length;
    const sold = cardKeys.filter((k) => k.status === "sold").length;
    const disabled = cardKeys.filter((k) => k.status === "disabled").length;
    return { total, available, sold, disabled };
  }, [cardKeys]);

  const filtered = useMemo(() => {
    return cardKeys.filter((key) => {
      if (activeTab !== "all" && key.status !== activeTab) return false;
      if (
        search &&
        !key.product.toLowerCase().includes(search.toLowerCase()) &&
        !key.content.toLowerCase().includes(search.toLowerCase())
      )
        return false;
      return true;
    });
  }, [activeTab, search, cardKeys]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice(
    (safeCurrentPage - 1) * PAGE_SIZE,
    safeCurrentPage * PAGE_SIZE
  );

  const handleTabChange = (val: string) => {
    setActiveTab(val);
    setCurrentPage(1);
  };

  const handleSearch = (val: string) => {
    setSearch(val);
    setCurrentPage(1);
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

  const toggleStatus = (id: string) => {
    setCardKeys((prev) =>
      prev.map((k) => {
        if (k.id !== id) return k;
        if (k.status === "available") {
          return {
            ...k,
            status: "disabled" as const,
            statusLabel: "已禁用",
            statusVariant: "destructive" as const,
          };
        }
        if (k.status === "disabled") {
          return {
            ...k,
            status: "available" as const,
            statusLabel: "可用",
            statusVariant: "success" as const,
          };
        }
        return k;
      })
    );
  };

  const handleImport = () => {
    if (!importProduct || !importContent.trim()) return;
    const lines = importContent
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    const newKeys: MockCardKey[] = lines.map((line, idx) => {
      const parts = line.split("-");
      const masked =
        parts.length >= 4
          ? `${parts[0]}-****-****-${parts[parts.length - 1]}`
          : `${line.slice(0, 4)}-****-****-${line.slice(-4)}`;
      return {
        id: `new-${Date.now()}-${idx}`,
        product: importProduct,
        content: line,
        maskedContent: masked,
        status: "available",
        statusLabel: "可用",
        statusVariant: "success",
        addedAt: new Date().toISOString().slice(0, 16).replace("T", " "),
        soldAt: null,
      };
    });
    setCardKeys((prev) => [...newKeys, ...prev]);
    setImportProduct("");
    setImportContent("");
    setImportOpen(false);
  };

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
          <Button variant="outline" size="sm">
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
                      {PRODUCTS.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>卡密内容</Label>
                  <textarea
                    className="flex min-h-[160px] w-full rounded-[var(--radius-md)] border border-[var(--input)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] ring-offset-[var(--background)] placeholder:text-[var(--muted-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
                    placeholder={"每行一个卡密，例如：\nGMAL-8K2F-J9X3-Q7WN\nGMAL-3P7R-M1D5-H8YC"}
                    value={importContent}
                    onChange={(e) => setImportContent(e.target.value)}
                  />
                  {importContent.trim() && (
                    <p className="text-xs text-[var(--muted-foreground)]">
                      已输入{" "}
                      {
                        importContent
                          .split("\n")
                          .filter((l) => l.trim()).length
                      }{" "}
                      个卡密
                    </p>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setImportOpen(false)}
                >
                  取消
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={!importProduct || !importContent.trim()}
                >
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
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList>
            {statusTabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <Input
            placeholder="搜索商品名或卡密内容..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-9 sm:w-72"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--muted)]/50">
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
              <th className="px-4 py-3 text-right font-medium text-[var(--muted-foreground)]">
                操作
              </th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-16 text-center">
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
              paginated.map((key) => (
                <tr
                  key={key.id}
                  className="border-b border-[var(--border)] last:border-b-0 transition-colors hover:bg-[var(--card-hover)]"
                >
                  <td className="px-4 py-3 font-medium">{key.product}</td>
                  <td className="px-4 py-3">
                    <code className="rounded-[var(--radius-sm)] bg-[var(--muted)] px-2 py-1 font-mono text-xs">
                      {revealedKeys.has(key.id)
                        ? key.content
                        : key.maskedContent}
                    </code>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={key.statusVariant}>
                      {key.statusLabel}
                    </Badge>
                  </td>
                  <td className="hidden px-4 py-3 text-[var(--muted-foreground)] md:table-cell">
                    {key.addedAt}
                  </td>
                  <td className="hidden px-4 py-3 text-[var(--muted-foreground)] lg:table-cell">
                    {key.soldAt ?? "-"}
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
                      {key.status !== "sold" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleStatus(key.id)}
                          className={cn(
                            key.status === "available"
                              ? "text-[var(--destructive)] hover:text-[var(--destructive)]"
                              : "text-[var(--success)] hover:text-[var(--success)]"
                          )}
                        >
                          {key.status === "available" ? (
                            <Ban className="h-4 w-4" />
                          ) : (
                            <CheckCircle className="h-4 w-4" />
                          )}
                          <span className="ml-1 hidden sm:inline">
                            {key.status === "available" ? "禁用" : "启用"}
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
      {filtered.length > PAGE_SIZE && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-[var(--muted-foreground)]">
            共 {filtered.length} 条记录，第 {safeCurrentPage}/{totalPages} 页
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={safeCurrentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
              上一页
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={safeCurrentPage >= totalPages}
              onClick={() =>
                setCurrentPage((p) => Math.min(totalPages, p + 1))
              }
            >
              下一页
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
