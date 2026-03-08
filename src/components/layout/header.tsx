"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, ShoppingCart, User, Menu, Sun, Moon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_LINKS, SITE_NAME } from "@/lib/constants";
import { useTheme } from "@/components/providers/theme-provider";

export default function Header() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const cartCount = 0; // TODO: connect to cart store

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

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
            {SITE_NAME}
          </span>
        </Link>

        {/* Center: Navigation (desktop) */}
        <nav className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => {
            const isActive =
              link.href === "/"
                ? pathname === "/"
                : (pathname ?? "").startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
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
              // Dispatch Cmd+K event for command palette
              document.dispatchEvent(
                new KeyboardEvent("keydown", { key: "k", metaKey: true })
              );
            }}
            className={cn(
              "hidden items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm md:flex",
              "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--primary)]/50",
              "transition-all duration-200"
            )}
            aria-label="Search"
          >
            <Search className="h-4 w-4" />
            <span className="text-xs">搜索</span>
            <kbd className="ml-2 rounded bg-[var(--muted)] px-1.5 py-0.5 text-[10px] font-mono text-[var(--muted-foreground)]">
              ⌘K
            </kbd>
          </button>

          {/* Mobile search icon */}
          <button
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors md:hidden"
            aria-label="Search"
          >
            <Search className="h-5 w-5" />
          </button>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </button>

          {/* Cart */}
          <Link
            href="/cart"
            className="relative flex h-9 w-9 items-center justify-center rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
            aria-label="Cart"
          >
            <ShoppingCart className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--primary)] text-[10px] font-bold text-[var(--primary-foreground)]">
                {cartCount > 9 ? "9+" : cartCount}
              </span>
            )}
          </Link>

          {/* User avatar / login */}
          <Link
            href="/login"
            className="hidden h-9 items-center gap-2 rounded-lg bg-[var(--primary)] px-4 text-sm font-medium text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)] transition-colors md:flex"
          >
            <User className="h-4 w-4" />
            <span>登录</span>
          </Link>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors md:hidden"
            aria-label="Toggle menu"
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
        <div className="border-b border-[var(--border)] bg-[var(--background)]/95 backdrop-blur-xl md:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-4">
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
                  className={cn(
                    "rounded-lg px-4 py-3 text-sm font-medium transition-colors",
                    isActive
                      ? "text-[var(--primary)] bg-[var(--primary)]/10"
                      : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]"
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="mt-2 flex items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-3 text-sm font-medium text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)] transition-colors"
            >
              <User className="h-4 w-4" />
              <span>登录 / 注册</span>
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
