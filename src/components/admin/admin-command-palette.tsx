"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  FolderTree,
  Key,
  FileText,
  Users,
  BookOpen,
  Ticket,
  MessageSquare,
  Mails,
  Settings,
  RotateCcw,
  Shield,
  Search,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const COMMANDS = [
  { label: "概览", href: "/admin", icon: LayoutDashboard, keywords: "dashboard overview home 首页" },
  { label: "商品管理", href: "/admin/products", icon: Package, keywords: "products goods 商品" },
  { label: "分类管理", href: "/admin/categories", icon: FolderTree, keywords: "categories 分类" },
  { label: "卡密管理", href: "/admin/card-keys", icon: Key, keywords: "card keys 卡密 密钥" },
  { label: "订单管理", href: "/admin/orders", icon: FileText, keywords: "orders 订单" },
  { label: "用户管理", href: "/admin/users", icon: Users, keywords: "users 用户" },
  { label: "文章管理", href: "/admin/articles", icon: BookOpen, keywords: "articles blog 文章" },
  { label: "优惠券管理", href: "/admin/coupons", icon: Ticket, keywords: "coupons 优惠券 折扣" },
  { label: "评价管理", href: "/admin/reviews", icon: MessageSquare, keywords: "reviews 评价 评论" },
  { label: "退款管理", href: "/admin/refunds", icon: RotateCcw, keywords: "refunds 退款" },
  { label: "留言管理", href: "/admin/messages", icon: Mails, keywords: "messages 留言 反馈" },
  { label: "登录日志", href: "/admin/login-logs", icon: Shield, keywords: "login logs 日志 登录" },
  { label: "系统设置", href: "/admin/settings", icon: Settings, keywords: "settings 设置 配置" },
];

export default function AdminCommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = query.trim()
    ? COMMANDS.filter((cmd) => {
        const q = query.toLowerCase();
        return (
          cmd.label.toLowerCase().includes(q) ||
          cmd.keywords.toLowerCase().includes(q)
        );
      })
    : COMMANDS;

  const handleOpen = useCallback(() => {
    setOpen(true);
    setQuery("");
    setSelectedIndex(0);
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
    setQuery("");
  }, []);

  const handleSelect = useCallback(
    (href: string) => {
      handleClose();
      router.push(href);
    },
    [router, handleClose]
  );

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (open) {
          handleClose();
        } else {
          handleOpen();
        }
      }
      if (e.key === "Escape" && open) {
        handleClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, handleOpen, handleClose]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Navigate list with arrow keys
  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && filtered[selectedIndex]) {
      e.preventDefault();
      handleSelect(filtered[selectedIndex].href);
    }
  };

  // Scroll selected item into view
  useEffect(() => {
    const container = listRef.current;
    if (!container) return;
    const selected = container.children[selectedIndex] as HTMLElement;
    if (selected) {
      selected.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-lg rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] shadow-2xl">
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-3">
          <Search className="h-5 w-5 shrink-0 text-[var(--muted-foreground)]" />
          <input
            ref={inputRef}
            type="text"
            placeholder="搜索页面... (输入名称或关键词)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            className="flex-1 bg-transparent text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] outline-none"
          />
          <kbd className="hidden rounded border border-[var(--border)] bg-[var(--muted)] px-1.5 py-0.5 text-[10px] font-mono text-[var(--muted-foreground)] sm:inline-block">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-80 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-[var(--muted-foreground)]">
              没有匹配的页面
            </div>
          ) : (
            filtered.map((cmd, index) => {
              const Icon = cmd.icon;
              return (
                <button
                  key={cmd.href}
                  onClick={() => handleSelect(cmd.href)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-left text-sm transition-colors",
                    index === selectedIndex
                      ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                      : "text-[var(--foreground)] hover:bg-[var(--secondary)]"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1 font-medium">{cmd.label}</span>
                  {index === selectedIndex && (
                    <ArrowRight className="h-3.5 w-3.5 shrink-0" />
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center justify-between border-t border-[var(--border)] px-4 py-2 text-[10px] text-[var(--muted-foreground)]">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-[var(--border)] bg-[var(--muted)] px-1 py-0.5 font-mono">↑↓</kbd>
              导航
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-[var(--border)] bg-[var(--muted)] px-1 py-0.5 font-mono">↵</kbd>
              选择
            </span>
          </div>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-[var(--border)] bg-[var(--muted)] px-1 py-0.5 font-mono">⌘K</kbd>
            切换
          </span>
        </div>
      </div>
    </div>
  );
}
