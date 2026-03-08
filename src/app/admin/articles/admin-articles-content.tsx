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
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import dynamic from "next/dynamic";

const RichTextEditor = dynamic(
  () => import("@/components/shared/rich-text-editor"),
  { ssr: false, loading: () => <div className="h-[300px] animate-pulse rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--muted)]" /> }
);

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

  // Create dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [createCategory, setCreateCategory] = useState<string>("");
  const [createContent, setCreateContent] = useState("");
  const [createStatus, setCreateStatus] = useState<string>("草稿");
  const [creating, setCreating] = useState(false);

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editArticle, setEditArticle] = useState<ApiArticle | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editCategory, setEditCategory] = useState<string>("");
  const [editContent, setEditContent] = useState("");
  const [editStatus, setEditStatus] = useState<string>("草稿");
  const [saving, setSaving] = useState(false);

  // Action loading states (per-article)
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

      const res = await fetch(`/api/admin/articles?${params.toString()}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        toast.error(data.message || "获取文章列表失败");
        return;
      }

      setArticles(data.articles);
      setTotal(data.total);
    } catch {
      toast.error("网络错误，获取文章列表失败");
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

  // Create
  const handleCreate = async () => {
    if (!createTitle.trim() || !createCategory) return;
    setCreating(true);
    try {
      const res = await fetch("/api/admin/articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: createTitle.trim(),
          content: createContent.trim(),
          category: createCategory,
          excerpt: "",
          isPublished: createStatus === "已发布",
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        toast.error(data.message || "创建文章失败");
        return;
      }

      toast.success("文章创建成功");
      setCreateTitle("");
      setCreateCategory("");
      setCreateContent("");
      setCreateStatus("草稿");
      setCreateDialogOpen(false);
      // Refresh list
      fetchArticles();
    } catch {
      toast.error("网络错误，创建文章失败");
    } finally {
      setCreating(false);
    }
  };

  // Open edit dialog
  const openEditDialog = (article: ApiArticle) => {
    setEditArticle(article);
    setEditTitle(article.title);
    setEditCategory(article.category);
    setEditContent(article.content);
    setEditStatus(article.isPublished ? "已发布" : "草稿");
    setEditDialogOpen(true);
  };

  // Save edit
  const handleSaveEdit = async () => {
    if (!editArticle || !editTitle.trim() || !editCategory) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/articles?id=${editArticle.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle.trim(),
          content: editContent.trim(),
          category: editCategory,
          isPublished: editStatus === "已发布",
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        toast.error(data.message || "更新文章失败");
        return;
      }

      toast.success("文章更新成功");
      setEditDialogOpen(false);
      setEditArticle(null);
      fetchArticles();
    } catch {
      toast.error("网络错误，更新文章失败");
    } finally {
      setSaving(false);
    }
  };

  // Toggle publish
  const togglePublish = async (article: ApiArticle) => {
    setTogglingId(article.id);
    try {
      const res = await fetch(`/api/admin/articles?id=${article.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: !article.isPublished }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        toast.error(data.message || "更新状态失败");
        return;
      }

      toast.success(article.isPublished ? "文章已撤回" : "文章已发布");
      fetchArticles();
    } catch {
      toast.error("网络错误，更新状态失败");
    } finally {
      setTogglingId(null);
    }
  };

  // Delete
  const deleteArticle = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/articles?id=${id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        toast.error(data.message || "删除文章失败");
        return;
      }

      toast.success("文章已删除");
      fetchArticles();
    } catch {
      toast.error("网络错误，删除文章失败");
    } finally {
      setDeletingId(null);
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
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              新建文章
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>新建文章</DialogTitle>
              <DialogDescription>
                填写文章信息，保存后可在文章列表中查看
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="articleTitle">标题</Label>
                <Input
                  id="articleTitle"
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  placeholder="请输入文章标题"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>分类</Label>
                  <Select value={createCategory} onValueChange={setCreateCategory}>
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
                <div className="space-y-2">
                  <Label>状态</Label>
                  <Select value={createStatus} onValueChange={setCreateStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="草稿">草稿</SelectItem>
                      <SelectItem value="已发布">已发布</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>内容</Label>
                <RichTextEditor
                  content={createContent}
                  onChange={setCreateContent}
                  placeholder="开始编辑文章内容..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                取消
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!createTitle.trim() || !createCategory || creating}
              >
                {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                保存文章
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>编辑文章</DialogTitle>
            <DialogDescription>
              修改文章信息，保存后立即生效
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="editArticleTitle">标题</Label>
              <Input
                id="editArticleTitle"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="请输入文章标题"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>分类</Label>
                <Select value={editCategory} onValueChange={setEditCategory}>
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
              <div className="space-y-2">
                <Label>状态</Label>
                <Select value={editStatus} onValueChange={setEditStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="草稿">草稿</SelectItem>
                    <SelectItem value="已发布">已发布</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>内容</Label>
              <RichTextEditor
                content={editContent}
                onChange={setEditContent}
                placeholder="开始编辑文章内容..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              取消
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={!editTitle.trim() || !editCategory || saving}
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              保存修改
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      {/* Table */}
      <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--muted)]/50">
              <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">
                标题
              </th>
              <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">
                分类
              </th>
              <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">
                状态
              </th>
              <th className="hidden px-4 py-3 text-left font-medium text-[var(--muted-foreground)] md:table-cell">
                浏览量
              </th>
              <th className="hidden px-4 py-3 text-left font-medium text-[var(--muted-foreground)] sm:table-cell">
                发布时间
              </th>
              <th className="px-4 py-3 text-right font-medium text-[var(--muted-foreground)]">
                操作
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              renderTableSkeleton()
            ) : articles.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-16 text-center">
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
                        onClick={() => openEditDialog(article)}
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
                        onClick={() => deleteArticle(article.id)}
                        disabled={deletingId === article.id}
                        className="text-[var(--destructive)] hover:text-[var(--destructive)]"
                        title="删除"
                      >
                        {deletingId === article.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
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
      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-[var(--muted-foreground)]">
            共 {total} 条记录，第 {currentPage}/{totalPages} 页
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
              上一页
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
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
