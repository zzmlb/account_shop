"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, ShoppingCart, User, Menu, Sun, Moon, X, Shield, Bell, LogOut, Wallet, Heart } from "lucide-react";
import { cn, formatPrice } from "@/lib/utils";
import { NAV_LINKS, NOTIFICATION_POLL_INTERVAL_MS } from "@/lib/constants";
import { useTheme } from "@/components/providers/theme-provider";
import { useAuthStore } from "@/stores/auth-store";
import { useCartStore } from "@/stores/cart-store";
import { useSiteSettingsStore } from "@/stores/site-settings-store";
import { useNotificationStore } from "@/stores/notification-store";
import { useFavoritesStore } from "@/stores/favorites-store";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function Header() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const cartCount = useCartStore((s) => s.getItemCount());
  const { siteName, load: loadSettings } = useSiteSettingsStore();
  const unreadNotifications = useNotificationStore((s) => s.unreadCount);
  const fetchNotifCount = useNotificationStore((s) => s.fetchCount);
  const favCount = useFavoritesStore((s) => s.ids.size);
  const loadFavorites = useFavoritesStore((s) => s.load);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    if (!user) return;
    fetchNotifCount();
    loadFavorites();
    const interval = setInterval(fetchNotifCount, NOTIFICATION_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [user, fetchNotifCount, loadFavorites]);

  // Close mobile menu on Escape key
  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape" && mobileMenuOpen) {
      setMobileMenuOpen(false);
    }
  }, [mobileMenuOpen]);

  useEffect(() => {
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [handleEscape]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Focus trap for mobile menu
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!mobileMenuOpen || !mobileMenuRef.current) return;
    const container = mobileMenuRef.current;
    const focusable = container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    first.focus();

    function handleTab(e: KeyboardEvent) {
      if (e.key !== "Tab") return;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    container.addEventListener("keydown", handleTab);
    return () => container.removeEventListener("keydown", handleTab);
  }, [mobileMenuOpen]);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  const isAdmin = user?.role === "admin" || user?.role === "super_admin";

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50",
        "h-16 border-b border-[var(--border)]",
        "bg-[var(--background)]/80 backdrop-blur-xl",
        "transition-all duration-300"
      )}
    >
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4 lg:px-8">
        {/* Left: Logo */}
        <Link href="/" className="flex items-center gap-2">
          <span
            className={cn(
              "text-xl font-extrabold tracking-tight",
              "bg-gradient-to-r from-[#6c5ce7] to-[#a855f7] bg-clip-text text-transparent"
            )}
          >
            {siteName}
          </span>
        </Link>

        {/* Center: Navigation (desktop) */}
        <nav aria-label="主导航" className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => {
            const isActive =
              link.href === "/"
                ? pathname === "/"
                : (pathname ?? "").startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "relative rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-200",
                  isActive
                    ? "text-[var(--primary)] bg-[var(--primary)]/10"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]"
                )}
              >
                {link.label}
                {isActive && (
                  <span className="absolute bottom-0 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full bg-[var(--primary)]" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right: Actions */}
        <div className="flex items-center gap-1">
          {/* Search (Cmd+K) */}
          <button
            onClick={() => {
              document.dispatchEvent(
                new KeyboardEvent("keydown", { key: "k", metaKey: true })
              );
            }}
            className={cn(
              "hidden items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm md:flex",
              "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--primary)]/50",
              "transition-all duration-200"
            )}
            aria-label="搜索"
          >
            <Search className="h-4 w-4" />
            <span className="text-xs">搜索</span>
            <kbd className="ml-2 rounded bg-[var(--muted)] px-1.5 py-0.5 text-[10px] font-mono text-[var(--muted-foreground)]">
              ⌘K
            </kbd>
          </button>

          {/* Mobile search icon */}
          <button
            onClick={() => {
              document.dispatchEvent(
                new KeyboardEvent("keydown", { key: "k", metaKey: true })
              );
            }}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors md:hidden"
            aria-label="搜索"
          >
            <Search className="h-5 w-5" />
          </button>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
            aria-label="切换主题"
          >
            {theme === "dark" ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </button>

          {/* Admin link */}
          {isAdmin && (
            <Link
              href="/admin"
              className="hidden h-9 w-9 items-center justify-center rounded-lg text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-colors md:flex"
              aria-label="管理后台"
              title="管理后台"
            >
              <Shield className="h-5 w-5" />
            </Link>
          )}

          {/* Notification bell (logged in users only) */}
          {user && (
            <Link
              href="/dashboard/notifications"
              className="relative flex h-9 w-9 items-center justify-center rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
              aria-label={`通知${unreadNotifications > 0 ? ` (${unreadNotifications}条未读)` : ""}`}
            >
              <Bell className="h-5 w-5" />
              {unreadNotifications > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--primary)] px-1 text-[10px] font-bold text-[var(--primary-foreground)]" aria-hidden="true">
                  {unreadNotifications > 99 ? "99+" : unreadNotifications}
                </span>
              )}
            </Link>
          )}

          {/* Favorites (logged in users only) */}
          {user && (
            <Link
              href="/dashboard/favorites"
              className="relative hidden h-9 w-9 items-center justify-center rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors sm:flex"
              aria-label={`收藏${favCount > 0 ? ` (${favCount}件)` : ""}`}
            >
              <Heart className="h-5 w-5" />
              {favCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--destructive)] px-1 text-[10px] font-bold text-white">
                  {favCount > 99 ? "99+" : favCount}
                </span>
              )}
            </Link>
          )}

          {/* Cart */}
          <button
            onClick={() => useCartStore.getState().toggleCart()}
            className="relative flex h-9 w-9 items-center justify-center rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
            aria-label={`购物车${cartCount > 0 ? ` (${cartCount}件)` : ""}`}
          >
            <ShoppingCart className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--primary)] text-[10px] font-bold text-[var(--primary-foreground)]">
                {cartCount > 9 ? "9+" : cartCount}
              </span>
            )}
          </button>

          {/* User: logged in state */}
          {user ? (
            <div className="hidden items-center gap-2 md:flex">
              <Link href="/dashboard" className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-[var(--primary)]/10 text-xs font-semibold text-[var(--primary)]">
                    {user.username?.charAt(0).toUpperCase() ?? "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-sm font-medium leading-tight text-[var(--foreground)]">
                    {user.username}
                  </span>
                  {user.balance != null && (
                    <span className="flex items-center gap-0.5 text-[10px] leading-tight text-[var(--muted-foreground)]">
                      <Wallet className="h-2.5 w-2.5" />
                      {formatPrice(user.balance)}
                    </span>
                  )}
                </div>
              </Link>
              <button
                onClick={logout}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted-foreground)] hover:text-[var(--destructive)] hover:bg-[var(--destructive)]/10 transition-colors"
                title="退出登录"
                aria-label="退出登录"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="hidden h-9 items-center gap-2 rounded-lg bg-[var(--primary)] px-4 text-sm font-medium text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)] transition-colors md:flex"
            >
              <User className="h-4 w-4" />
              <span>登录</span>
            </Link>
          )}

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors md:hidden"
            aria-label={mobileMenuOpen ? "关闭菜单" : "打开菜单"}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div ref={mobileMenuRef} className="border-b border-[var(--border)] bg-[var(--background)]/95 backdrop-blur-xl md:hidden">
          <nav aria-label="移动端菜单" className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-4">
            {NAV_LINKS.map((link) => {
              const isActive =
                link.href === "/"
                  ? pathname === "/"
                  : (pathname ?? "").startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "rounded-lg px-4 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]",
                    isActive
                      ? "text-[var(--primary)] bg-[var(--primary)]/10"
                      : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]"
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
            {user ? (
              <>
                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-lg px-4 py-3 text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
                >
                  个人中心
                </Link>
                {isAdmin && (
                  <Link
                    href="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="rounded-lg px-4 py-3 text-sm font-medium text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-colors"
                  >
                    管理后台
                  </Link>
                )}
                <button
                  onClick={() => { logout(); setMobileMenuOpen(false); }}
                  className="rounded-lg px-4 py-3 text-left text-sm font-medium text-[var(--destructive)] hover:bg-[var(--destructive)]/10 transition-colors"
                >
                  退出登录
                </button>
              </>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="mt-2 flex items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-3 text-sm font-medium text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)] transition-colors"
              >
                <User className="h-4 w-4" />
                <span>登录 / 注册</span>
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
