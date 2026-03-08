"use client";

import { useState, useMemo } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

type ArticleCategory = "公告" | "教程" | "帮助";
type ArticleStatus = "已发布" | "草稿";

interface MockArticle {
  id: string;
  title: string;
  category: ArticleCategory;
  status: ArticleStatus;
  statusVariant: "success" | "secondary";
  views: number;
  publishedAt: string;
}

const MOCK_ARTICLES: MockArticle[] = [
  {
    id: "1",
    title: "Gmail账号使用教程",
    category: "教程",
    status: "已发布",
    statusVariant: "success",
    views: 1523,
    publishedAt: "2026-03-07 10:00",
  },
  {
    id: "2",
    title: "如何使用VPN安全上网",
    category: "教程",
    status: "已发布",
    statusVariant: "success",
    views: 2108,
    publishedAt: "2026-03-06 14:30",
  },
  {
    id: "3",
    title: "平台购买流程说明",
    category: "帮助",
    status: "已发布",
    statusVariant: "success",
    views: 3456,
    publishedAt: "2026-03-05 09:00",
  },
  {
    id: "4",
    title: "三月份优惠活动公告",
    category: "公告",
    status: "已发布",
    statusVariant: "success",
    views: 892,
    publishedAt: "2026-03-04 16:00",
  },
  {
    id: "5",
    title: "Netflix会员激活指南",
    category: "教程",
    status: "草稿",
    statusVariant: "secondary",
    views: 0,
    publishedAt: "2026-03-03 11:20",
  },
  {
    id: "6",
    title: "常见问题解答FAQ",
    category: "帮助",
    status: "已发布",
    statusVariant: "success",
    views: 4210,
    publishedAt: "2026-03-02 08:45",
  },
  {
    id: "7",
    title: "ChatGPT Plus账号使用须知",
    category: "教程",
    status: "已发布",
    statusVariant: "success",
    views: 1876,
    publishedAt: "2026-03-01 15:30",
  },
  {
    id: "8",
    title: "平台维护通知",
    category: "公告",
    status: "草稿",
    statusVariant: "secondary",
    views: 0,
    publishedAt: "2026-02-28 20:00",
  },
];

const CATEGORIES: ArticleCategory[] = ["公告", "教程", "帮助"];

const categoryBadgeVariant: Record<
  ArticleCategory,
  "default" | "secondary" | "outline"
> = {
  公告: "default",
  教程: "secondary",
  帮助: "outline",
};

const PAGE_SIZE = 5;


export default function AdminArticlesPageContent() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [articles, setArticles] = useState(MOCK_ARTICLES);

  /* New article dialog state */
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState<string>("");
  const [newContent, setNewContent] = useState("");
  const [newStatus, setNewStatus] = useState<string>("草稿");

  const filtered = useMemo(() => {
    return articles.filter((a) => {
      if (categoryFilter !== "all" && a.category !== categoryFilter)
        return false;
      if (
        search &&
        !a.title.toLowerCase().includes(search.toLowerCase())
      )
        return false;
      return true;
    });
  }, [search, categoryFilter, articles]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice(
    (safeCurrentPage - 1) * PAGE_SIZE,
    safeCurrentPage * PAGE_SIZE
  );

  const handleSearch = (val: string) => {
    setSearch(val);
    setCurrentPage(1);
  };

  const handleCategoryFilter = (val: string) => {
    setCategoryFilter(val);
    setCurrentPage(1);
  };

  const togglePublish = (id: string) => {
    setArticles((prev) =>
      prev.map((a) => {
        if (a.id !== id) return a;
        if (a.status === "已发布") {
          return {
            ...a,
            status: "草稿" as const,
            statusVariant: "secondary" as const,
          };
        }
        return {
          ...a,
          status: "已发布" as const,
          statusVariant: "success" as const,
        };
      })
    );
  };

  const deleteArticle = (id: string) => {
    setArticles((prev) => prev.filter((a) => a.id !== id));
  };

  const handleCreate = () => {
    if (!newTitle.trim() || !newCategory) return;
    const article: MockArticle = {
      id: `new-${Date.now()}`,
      title: newTitle.trim(),
      category: newCategory as ArticleCategory,
      status: newStatus as ArticleStatus,
      statusVariant: newStatus === "已发布" ? "success" : "secondary",
      views: 0,
      publishedAt: new Date().toISOString().slice(0, 16).replace("T", " "),
    };
    setArticles((prev) => [article, ...prev]);
    setNewTitle("");
    setNewCategory("");
    setNewContent("");
    setNewStatus("草稿");
    setDialogOpen(false);
  };

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
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              新建文章
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
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
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="请输入文章标题"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>分类</Label>
                  <Select value={newCategory} onValueChange={setNewCategory}>
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
                  <Select value={newStatus} onValueChange={setNewStatus}>
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
                <Label htmlFor="articleContent">内容</Label>
                <textarea
                  id="articleContent"
                  className="flex min-h-[160px] w-full rounded-[var(--radius-md)] border border-[var(--input)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] ring-offset-[var(--background)] placeholder:text-[var(--muted-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="请输入文章内容..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                取消
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!newTitle.trim() || !newCategory}
              >
                保存文章
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
            {paginated.length === 0 ? (
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
              paginated.map((article) => (
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
                    <Badge variant={categoryBadgeVariant[article.category]}>
                      {article.category}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={article.statusVariant}>
                      {article.status}
                    </Badge>
                  </td>
                  <td className="hidden px-4 py-3 text-[var(--muted-foreground)] md:table-cell">
                    {article.views.toLocaleString()}
                  </td>
                  <td className="hidden px-4 py-3 text-[var(--muted-foreground)] sm:table-cell">
                    {article.publishedAt}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" title="编辑">
                        <Edit3 className="h-4 w-4" />
                        <span className="ml-1 hidden lg:inline">编辑</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => togglePublish(article.id)}
                        title={
                          article.status === "已发布" ? "撤回" : "发布"
                        }
                        className={cn(
                          article.status === "已发布"
                            ? "text-[var(--warning)] hover:text-[var(--warning)]"
                            : "text-[var(--success)] hover:text-[var(--success)]"
                        )}
                      >
                        {article.status === "已发布" ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                        <span className="ml-1 hidden lg:inline">
                          {article.status === "已发布" ? "撤回" : "发布"}
                        </span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteArticle(article.id)}
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
