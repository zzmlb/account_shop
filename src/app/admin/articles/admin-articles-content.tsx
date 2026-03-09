"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FileText,
  Plus,
  Search,
  Edit3,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
  CheckSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Pagination from "@/components/shared/pagination";
import { Badge } from "@/components/ui/badge";
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
import { ArticleCreateDialog } from "./article-create-dialog";
import { ArticleEditDialog } from "./article-edit-dialog";
import { ArticleDeleteDialog } from "./article-delete-dialog";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ApiArticle {
  id: string;
  title: string;
  slug: string;
  content: string;
  category: string;
  tags: string[];
  isPublished: boolean;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

type ArticleCategory = "公告" | "教程" | "帮助";

const CATEGORIES: ArticleCategory[] = ["公告", "教程", "帮助"];

const categoryBadgeVariant: Record<
  string,
  "default" | "secondary" | "outline"
> = {
  公告: "default",
  教程: "secondary",
  帮助: "outline",
};

const PAGE_SIZE = 20;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AdminArticlesPageContent() {
  // Data state
  const [articles, setArticles] = useState<ApiArticle[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filter / pagination state
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);

  // Dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editArticle, setEditArticle] = useState<ApiArticle | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTargetArticle, setDeleteTargetArticle] = useState<ApiArticle | null>(null);

  // Action loading states (per-article)
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Batch selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchUpdating, setBatchUpdating] = useState(false);

  // ---------------------------------------------------------------------------
  // Fetch articles
  // ---------------------------------------------------------------------------

  const fetchArticles = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(currentPage));
      params.set("limit", String(PAGE_SIZE));
      if (search.trim()) params.set("search", search.trim());
      if (categoryFilter !== "all") params.set("category", categoryFilter);

      const data = await apiFetch<{ success: boolean; articles: ApiArticle[]; total: number }>(
        `/api/admin/articles?${params.toString()}`
      );

      setArticles(data.articles);
      setTotal(data.total);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "获取文章列表失败");
    } finally {
      setLoading(false);
    }
  }, [currentPage, search, categoryFilter]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  // ---------------------------------------------------------------------------
  // Derived
  // ---------------------------------------------------------------------------

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleSearch = (val: string) => {
    setSearch(val);
    setCurrentPage(1);
  };

  const handleCategoryFilter = (val: string) => {
    setCategoryFilter(val);
    setCurrentPage(1);
  };

  // Toggle publish
  const togglePublish = async (article: ApiArticle) => {
    setTogglingId(article.id);
    try {
      await apiMutate<{ success: boolean }>(`/api/admin/articles?id=${article.id}`, "PUT", {
        isPublished: !article.isPublished,
      });

      toast.success(article.isPublished ? "文章已撤回" : "文章已发布");
      fetchArticles();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "更新状态失败");
    } finally {
      setTogglingId(null);
    }
  };

  // Batch publish/unpublish
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === articles.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(articles.map((a) => a.id)));
    }
  };

  const handleBatchPublish = async (isPublished: boolean) => {
    if (selectedIds.size === 0) return;
    setBatchUpdating(true);
    try {
      const data = await apiMutate<{ success: boolean; message?: string }>(
        "/api/admin/articles",
        "PATCH",
        { ids: Array.from(selectedIds), isPublished }
      );
      toast.success(data.message || "操作成功");
      setSelectedIds(new Set());
      fetchArticles();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "操作失败");
    } finally {
      setBatchUpdating(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Loading skeleton
  // ---------------------------------------------------------------------------

  const renderTableSkeleton = () => (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="border-b border-[var(--border)] last:border-b-0">
          <td className="px-4 py-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-[var(--radius-md)]" />
              <Skeleton className="h-4 w-40" />
            </div>
          </td>
          <td className="px-4 py-3"><Skeleton className="h-5 w-12" /></td>
          <td className="px-4 py-3"><Skeleton className="h-5 w-14" /></td>
          <td className="hidden px-4 py-3 md:table-cell"><Skeleton className="h-4 w-10" /></td>
          <td className="hidden px-4 py-3 sm:table-cell"><Skeleton className="h-4 w-28" /></td>
          <td className="px-4 py-3"><Skeleton className="h-8 w-24 ml-auto" /></td>
        </tr>
      ))}
    </>
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">文章管理</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            管理站点公告、教程和帮助文章
          </p>
        </div>
        <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          新建文章
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Select value={categoryFilter} onValueChange={handleCategoryFilter}>
            <SelectTrigger className="w-32">
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
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <Input
            placeholder="搜索文章标题..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-9 sm:w-72"
          />
        </div>
      </div>

      {/* Batch action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--primary)]/30 bg-[var(--primary)]/5 px-4 py-2.5">
          <CheckSquare className="h-4 w-4 text-[var(--primary)]" />
          <span className="text-sm font-medium">
            已选 {selectedIds.size} 篇文章
          </span>
          <div className="ml-auto flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBatchPublish(true)}
              disabled={batchUpdating}
              className="gap-1.5"
            >
              {batchUpdating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
              批量发布
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBatchPublish(false)}
              disabled={batchUpdating}
              className="gap-1.5"
            >
              {batchUpdating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <EyeOff className="h-3.5 w-3.5" />}
              批量撤回
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedIds(new Set())}
            >
              取消选择
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)]">
        <table className="w-full text-sm" aria-label="文章管理列表">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--muted)]/50">
              <th scope="col" className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={articles.length > 0 && selectedIds.size === articles.length}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 rounded border-[var(--border)] accent-[var(--primary)]"
                  aria-label="全选"
                />
              </th>
              <th scope="col" className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">
                标题
              </th>
              <th scope="col" className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">
                分类
              </th>
              <th scope="col" className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">
                状态
              </th>
              <th scope="col" className="hidden px-4 py-3 text-left font-medium text-[var(--muted-foreground)] md:table-cell">
                浏览量
              </th>
              <th scope="col" className="hidden px-4 py-3 text-left font-medium text-[var(--muted-foreground)] sm:table-cell">
                发布时间
              </th>
              <th scope="col" className="px-4 py-3 text-right font-medium text-[var(--muted-foreground)]">
                操作
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              renderTableSkeleton()
            ) : articles.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-16 text-center">
                  <div className="flex flex-col items-center">
                    <div className="mb-4 rounded-full bg-[var(--muted)] p-4">
                      <FileText className="h-10 w-10 text-[var(--muted-foreground)]" />
                    </div>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      暂无文章
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              articles.map((article) => (
                <tr
                  key={article.id}
                  className="border-b border-[var(--border)] last:border-b-0 transition-colors hover:bg-[var(--card-hover)]"
                >
                  <td className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(article.id)}
                      onChange={() => toggleSelect(article.id)}
                      className="h-4 w-4 rounded border-[var(--border)] accent-[var(--primary)]"
                      aria-label={`选择 ${article.title}`}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--muted)]">
                        <FileText className="h-4 w-4 text-[var(--muted-foreground)]" />
                      </div>
                      <span className="font-medium">{article.title}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={categoryBadgeVariant[article.category] || "outline"}>
                      {article.category}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={article.isPublished ? "success" : "secondary"}>
                      {article.isPublished ? "已发布" : "草稿"}
                    </Badge>
                  </td>
                  <td className="hidden px-4 py-3 text-[var(--muted-foreground)] md:table-cell">
                    {article.viewCount.toLocaleString()}
                  </td>
                  <td className="hidden px-4 py-3 text-[var(--muted-foreground)] sm:table-cell">
                    {article.createdAt
                      ? new Date(article.createdAt)
                          .toLocaleString("zh-CN", {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                          .replace(/\//g, "-")
                      : "-"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        title="编辑"
                        onClick={() => {
                          setEditArticle(article);
                          setEditDialogOpen(true);
                        }}
                      >
                        <Edit3 className="h-4 w-4" />
                        <span className="ml-1 hidden lg:inline">编辑</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => togglePublish(article)}
                        disabled={togglingId === article.id}
                        title={article.isPublished ? "撤回" : "发布"}
                        className={cn(
                          article.isPublished
                            ? "text-[var(--warning)] hover:text-[var(--warning)]"
                            : "text-[var(--success)] hover:text-[var(--success)]"
                        )}
                      >
                        {togglingId === article.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : article.isPublished ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                        <span className="ml-1 hidden lg:inline">
                          {article.isPublished ? "撤回" : "发布"}
                        </span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setDeleteTargetArticle(article);
                          setDeleteDialogOpen(true);
                        }}
                        className="text-[var(--destructive)] hover:text-[var(--destructive)]"
                        title="删除"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="ml-1 hidden lg:inline">删除</span>
                      </Button>
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
        page={currentPage}
        totalPages={totalPages}
        total={total}
        onPageChange={setCurrentPage}
      />

      {/* Dialogs */}
      <ArticleCreateDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={fetchArticles}
      />

      <ArticleEditDialog
        article={editArticle}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSuccess={() => {
          setEditArticle(null);
          fetchArticles();
        }}
      />

      <ArticleDeleteDialog
        article={deleteTargetArticle}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onSuccess={() => {
          setDeleteTargetArticle(null);
          fetchArticles();
        }}
      />
    </div>
  );
}
