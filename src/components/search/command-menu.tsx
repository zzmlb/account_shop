"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Search,
  Package,
  Tag,
  FileText,
  ArrowRight,
  Clock,
  TrendingUp,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchResult {
  id: string;
  title: string;
  type: "product" | "category" | "article";
  href: string;
  description?: string;
}

interface ApiProduct {
  name: string;
  slug: string;
  price: number;
  categoryName: string;
  stockCount?: number;
}

interface ApiCategory {
  name: string;
  slug: string;
  productCount: number;
}

const FALLBACK_HOT_SEARCHES = ["Gmail", "Netflix", "ChatGPT", "Spotify", "Steam"];

const typeIcons = {
  product: Package,
  category: Tag,
  article: FileText,
};

const typeLabels = {
  product: "商品",
  category: "分类",
  article: "文章",
};

export default function CommandMenu() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [hotSearches, setHotSearches] = useState<string[]>(FALLBACK_HOT_SEARCHES);
  const [loading, setLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const categoriesCacheRef = useRef<ApiCategory[] | null>(null);
  const skipNextDebounceRef = useRef(false);
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem("recent-searches");
    if (stored) {
      try {
        setRecentSearches(JSON.parse(stored));
      } catch {
        // ignore
      }
    }
    // Fetch trending product names for hot searches
    fetch("/api/stats")
      .then((r) => r.json())
      .then((data) => {
        if (data.trending && data.trending.length > 0) {
          setHotSearches(data.trending);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
      // "/" shortcut — only trigger when not in an input/textarea/contenteditable
      if (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const tag = (e.target as HTMLElement).tagName;
        const editable = (e.target as HTMLElement).isContentEditable;
        if (tag !== "INPUT" && tag !== "TEXTAREA" && tag !== "SELECT" && !editable) {
          e.preventDefault();
          setOpen(true);
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);

    try {
      // Fetch products, articles, and categories (cached) in parallel
      const [productsRes, articlesRes, categories] = await Promise.all([
        fetch(`/api/products?search=${encodeURIComponent(q)}&pageSize=6`, {
          signal: controller.signal,
        }).then((res) => res.json()),
        fetch(`/api/articles?search=${encodeURIComponent(q)}&pageSize=5`, {
          signal: controller.signal,
        }).then((res) => res.json()).catch(() => ({ success: false, articles: [] })),
        categoriesCacheRef.current
          ? Promise.resolve(categoriesCacheRef.current)
          : fetch("/api/categories", { signal: controller.signal })
              .then((res) => res.json())
              .then((data: { categories: ApiCategory[] }) => {
                categoriesCacheRef.current = data.categories;
                return data.categories;
              }),
      ]);

      // If this request was aborted, don't update state
      if (controller.signal.aborted) return;

      const lower = q.toLowerCase();

      // Map API products to SearchResult format
      const productResults: SearchResult[] = (
        productsRes.products as ApiProduct[]
      ).map((p) => ({
        id: p.slug,
        title: p.name,
        type: "product" as const,
        href: `/products/${p.slug}`,
        description: `¥${p.price.toFixed(2)}${p.stockCount !== undefined && p.stockCount <= 0 ? " · 已售罄" : ""}`,
      }));

      // Map articles to SearchResult format
      const articleResults: SearchResult[] = (
        articlesRes.success && Array.isArray(articlesRes.articles)
          ? articlesRes.articles as { id: string; title: string; slug: string; category: string }[]
          : []
      ).map((a) => ({
        id: a.slug,
        title: a.title,
        type: "article" as const,
        href: `/articles/${a.slug}`,
        description: a.category,
      }));

      // Filter categories client-side by query
      const categoryResults: SearchResult[] = categories
        .filter((c: ApiCategory) => c.name.toLowerCase().includes(lower))
        .map((c: ApiCategory) => ({
          id: c.slug,
          title: c.name,
          type: "category" as const,
          href: `/products?category=${encodeURIComponent(c.name)}`,
        }));

      setResults([...productResults, ...categoryResults, ...articleResults]);
      setSelectedIndex(0);
    } catch (err) {
      // Ignore abort errors; show empty results for other errors
      if (err instanceof DOMException && err.name === "AbortError") return;
      setResults([]);
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (skipNextDebounceRef.current) {
      skipNextDebounceRef.current = false;
      return;
    }
    const timer = setTimeout(() => search(query), 300);
    return () => clearTimeout(timer);
  }, [query, search]);

  const navigate = (href: string) => {
    setOpen(false);
    if (query.trim()) {
      const updated = [query, ...recentSearches.filter((s) => s !== query)].slice(0, 5);
      setRecentSearches(updated);
      localStorage.setItem("recent-searches", JSON.stringify(updated));
    }
    router.push(href);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[selectedIndex]) {
      e.preventDefault();
      navigate(results[selectedIndex].href);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-[540px] gap-0 overflow-hidden p-0">
        <div className="flex items-center border-b border-[var(--border)] px-4">
          <Search className="mr-2 h-4 w-4 shrink-0 text-[var(--muted-foreground)]" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="搜索商品、分类、文章..."
            className="h-12 border-0 bg-transparent px-0 text-base shadow-none outline-none focus-visible:ring-0"
            aria-label="全局搜索"
            autoFocus
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="ml-1 shrink-0 rounded-md p-1 text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
              aria-label="清除搜索"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <kbd className="ml-2 shrink-0 rounded-md border border-[var(--border)] bg-[var(--muted)] px-2 py-0.5 text-xs text-[var(--muted-foreground)]">
            ESC
          </kbd>
        </div>

        <div className="max-h-[400px] overflow-y-auto p-2">
          {query.trim() === "" ? (
            <div className="space-y-4 p-2">
              {recentSearches.length > 0 && (
                <div>
                  <div className="mb-2 flex items-center gap-2 text-xs font-medium text-[var(--muted-foreground)]">
                    <Clock className="h-3 w-3" />
                    最近搜索
                    <button
                      onClick={() => {
                        setRecentSearches([]);
                        localStorage.removeItem("recent-searches");
                      }}
                      className="ml-auto flex items-center gap-1 text-[10px] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                    >
                      <X className="h-3 w-3" />
                      清除
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {recentSearches.map((s) => (
                      <button
                        key={s}
                        onClick={() => {
                          skipNextDebounceRef.current = true;
                          setQuery(s);
                          search(s);
                        }}
                        className="rounded-full border border-[var(--border)] px-3 py-1 text-sm text-[var(--muted-foreground)] transition-colors hover:border-[var(--primary)] hover:text-[var(--foreground)]"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <div className="mb-2 flex items-center gap-2 text-xs font-medium text-[var(--muted-foreground)]">
                  <TrendingUp className="h-3 w-3" />
                  热门搜索
                </div>
                <div className="flex flex-wrap gap-2">
                  {hotSearches.map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        skipNextDebounceRef.current = true;
                        setQuery(s);
                        search(s);
                      }}
                      className="rounded-full border border-[var(--border)] px-3 py-1 text-sm text-[var(--muted-foreground)] transition-colors hover:border-[var(--primary)] hover:text-[var(--foreground)]"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : loading ? (
            <div className="space-y-1 animate-pulse">
              <div className="mb-1 px-2">
                <div className="h-3 w-10 rounded bg-[var(--muted)]" />
              </div>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2.5">
                  <div className="h-4 w-4 shrink-0 rounded bg-[var(--muted)]" />
                  <div className="flex-1 space-y-1">
                    <div className="h-3.5 w-3/5 rounded bg-[var(--muted)]" />
                  </div>
                  <div className="h-3 w-10 rounded bg-[var(--muted)]" />
                </div>
              ))}
            </div>
          ) : results.length === 0 ? (
            <div className="py-8 text-center text-sm text-[var(--muted-foreground)]">
              未找到 &ldquo;{query}&rdquo; 相关结果
            </div>
          ) : (
            <div className="space-y-1">
              {(["product", "category", "article"] as const).map((type) => {
                const items = results.filter((r) => r.type === type);
                if (items.length === 0) return null;
                return (
                  <div key={type}>
                    <div className="mb-1 px-2 text-xs font-medium text-[var(--muted-foreground)]">
                      {typeLabels[type]}
                    </div>
                    {items.map((item) => {
                      const Icon = typeIcons[item.type];
                      const globalIdx = results.indexOf(item);
                      return (
                        <button
                          key={item.id}
                          onClick={() => navigate(item.href)}
                          className={cn(
                            "group flex w-full items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-left text-sm transition-colors",
                            globalIdx === selectedIndex
                              ? "bg-[var(--primary)]/10 text-[var(--foreground)]"
                              : "text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
                          )}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          <div className="flex-1 truncate">
                            <span className="font-medium text-[var(--foreground)]">
                              {item.title}
                            </span>
                            {item.description && (
                              <span className="ml-2 text-xs text-[var(--muted-foreground)]">
                                {item.description}
                              </span>
                            )}
                          </div>
                          <ArrowRight className="h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-[var(--border)] px-4 py-2 text-xs text-[var(--muted-foreground)]">
          <div className="flex items-center gap-2">
            <kbd className="rounded border border-[var(--border)] bg-[var(--muted)] px-1.5 py-0.5">↑↓</kbd>
            <span>导航</span>
            <kbd className="rounded border border-[var(--border)] bg-[var(--muted)] px-1.5 py-0.5">↵</kbd>
            <span>选择</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="rounded border border-[var(--border)] bg-[var(--muted)] px-1.5 py-0.5">⌘K</kbd>
            <span>打开搜索</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
