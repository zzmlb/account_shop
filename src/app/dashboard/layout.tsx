"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Wallet,
  Heart,
  Ticket,
  RotateCcw,
  Bell,
  Settings,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { useNotificationStore } from "@/stores/notification-store";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SITE_NAME } from "@/lib/constants";

const sidebarLinks = [
  { label: "概览", href: "/dashboard", icon: LayoutDashboard },
  { label: "我的订单", href: "/dashboard/orders", icon: FileText },
  { label: "余额管理", href: "/dashboard/balance", icon: Wallet },
  { label: "我的收藏", href: "/dashboard/favorites", icon: Heart },
  { label: "优惠券", href: "/dashboard/coupons", icon: Ticket },
  { label: "退款申请", href: "/dashboard/refunds", icon: RotateCcw },
  { label: "我的通知", href: "/dashboard/notifications", icon: Bell },
  { label: "账户设置", href: "/dashboard/settings", icon: Settings },
];

/* Mobile bottom tabs: subset of sidebar links */
const mobileTabs = [
  { label: "概览", href: "/dashboard", icon: LayoutDashboard },
  { label: "订单", href: "/dashboard/orders", icon: FileText },
  { label: "余额", href: "/dashboard/balance", icon: Wallet },
  { label: "收藏", href: "/dashboard/favorites", icon: Heart },
  { label: "设置", href: "/dashboard/settings", icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const fetchNotifCount = useNotificationStore((s) => s.fetchCount);

  useEffect(() => {
    if (!user) return;
    fetchNotifCount();
    const interval = setInterval(fetchNotifCount, 60_000);
    return () => clearInterval(interval);
  }, [user, fetchNotifCount]);

  /* ---------- Not logged in ---------- */
  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="mx-auto max-w-md rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-8 text-center shadow-lg">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--primary)]/10">
            <LogOut className="h-8 w-8 text-[var(--primary)]" />
          </div>
          <h2 className="text-xl font-bold text-[var(--foreground)]">
            请先登录
          </h2>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            您需要登录后才能访问个人中心
          </p>
          <Button asChild className="mt-6 w-full" size="lg">
            <Link href="/login">
              前往登录
              <ChevronRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
          <p className="mt-3 text-xs text-[var(--muted-foreground)]">
            还没有账户?{" "}
            <Link
              href="/register"
              className="text-[var(--primary)] hover:underline"
            >
              立即注册
            </Link>
          </p>
        </div>
      </div>
    );
  }

  /* ---------- Helper: is link active ---------- */
  const isActive = (href: string) =>
    href === "/dashboard"
      ? pathname === "/dashboard"
      : (pathname ?? "").startsWith(href);

  return (
    <div className="flex min-h-screen flex-col">
      {/* ========== Top bar ========== */}
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--background)]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 lg:px-8">
          {/* Logo */}
          <Link
            href="/"
            className="text-lg font-bold bg-gradient-to-r from-[#6c5ce7] to-[#a855f7] bg-clip-text text-transparent"
          >
            {SITE_NAME}
          </Link>

          {/* Right side: user info + actions */}
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="hidden text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors sm:inline-block"
            >
              返回商城
            </Link>

            <Separator orientation="vertical" className="hidden h-5 sm:block" />

            {/* Notification bell */}
            <Link
              href="/dashboard/notifications"
              className="relative flex h-9 w-9 items-center justify-center rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
              aria-label="通知"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--primary)] px-1 text-[10px] font-bold text-[var(--primary-foreground)]">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Link>

            {/* Avatar + username */}
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-[var(--primary)]/10 text-xs font-semibold text-[var(--primary)]">
                  {user.username?.charAt(0).toUpperCase() ?? "U"}
                </AvatarFallback>
              </Avatar>
              <span className="hidden text-sm font-medium text-[var(--foreground)] sm:inline-block">
                {user.username}
              </span>
            </div>

            {/* Logout */}
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="hidden gap-1.5 text-[var(--muted-foreground)] hover:text-[var(--destructive)] sm:inline-flex"
            >
              <LogOut className="h-4 w-4" />
              退出
            </Button>
          </div>
        </div>
      </header>

      {/* ========== Body (sidebar + main) ========== */}
      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-8 px-4 py-8 lg:px-8">
        {/* Desktop sidebar */}
        <aside className="hidden w-56 shrink-0 md:block">
          <nav className="sticky top-24 space-y-1">
            {sidebarLinks.map((link) => {
              const active = isActive(link.href);
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                      : "text-[var(--muted-foreground)] hover:bg-[var(--secondary)] hover:text-[var(--foreground)]"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </Link>
              );
            })}

            <Separator className="my-2" />

            <button
              onClick={logout}
              className="flex w-full items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-sm font-medium text-[var(--muted-foreground)] hover:bg-[var(--secondary)] hover:text-[var(--destructive)] transition-colors"
            >
              <LogOut className="h-4 w-4" />
              退出登录
            </button>
          </nav>
        </aside>

        {/* Main content */}
        <main id="main-content" className="flex-1 min-w-0 pb-20 md:pb-0">{children}</main>
      </div>

      {/* ========== Mobile bottom tabs ========== */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--border)] bg-[var(--background)]/95 backdrop-blur-xl md:hidden">
        <div className="flex items-center justify-around">
          {mobileTabs.map((tab) => {
            const active = isActive(tab.href);
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors",
                  active
                    ? "text-[var(--primary)]"
                    : "text-[var(--muted-foreground)]"
                )}
              >
                <div
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] transition-colors",
                    active && "bg-[var(--primary)]/10"
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                {tab.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
