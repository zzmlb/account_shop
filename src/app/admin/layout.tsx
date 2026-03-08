"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
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
  LogOut,
  Bell,
  Menu,
  ShieldAlert,
  ChevronRight,
  AlertTriangle,
  Info,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { SITE_NAME } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import AdminCommandPalette from "@/components/admin/admin-command-palette";

interface Notification {
  id: string;
  type: "warning" | "alert" | "info";
  title: string;
  description: string;
  href: string;
}

const sidebarLinks = [
  { label: "概览", href: "/admin", icon: LayoutDashboard },
  { label: "商品管理", href: "/admin/products", icon: Package },
  { label: "分类管理", href: "/admin/categories", icon: FolderTree },
  { label: "卡密管理", href: "/admin/card-keys", icon: Key },
  { label: "订单管理", href: "/admin/orders", icon: FileText },
  { label: "用户管理", href: "/admin/users", icon: Users },
  { label: "文章管理", href: "/admin/articles", icon: BookOpen },
  { label: "优惠券管理", href: "/admin/coupons", icon: Ticket },
  { label: "评价管理", href: "/admin/reviews", icon: MessageSquare },
  { label: "退款管理", href: "/admin/refunds", icon: RotateCcw },
  { label: "留言管理", href: "/admin/messages", icon: Mails },
  { label: "登录日志", href: "/admin/login-logs", icon: Shield },
  { label: "系统设置", href: "/admin/settings", icon: Settings },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notifCount, setNotifCount] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [pendingRefunds, setPendingRefunds] = useState(0);
  const [pendingMessages, setPendingMessages] = useState(0);
  const [pendingOrders, setPendingOrders] = useState(0);

  useEffect(() => {
    if (!user) return;
    const fetchNotifications = () => {
      fetch("/api/admin/notifications")
        .then((r) => r.json())
        .then((data) => {
          if (data.success) {
            setNotifications(data.notifications || []);
            setNotifCount(data.count || 0);
            // Extract low stock and pending refund counts from notifications
            const lowStock = (data.notifications || []).find(
              (n: Notification) => n.id === "low-stock" || n.id === "out-of-stock"
            );
            const refundNotif = (data.notifications || []).find(
              (n: Notification) => n.id === "pending-refunds"
            );
            if (lowStock) {
              const match = lowStock.description.match(/(\d+)/);
              setLowStockCount(match ? parseInt(match[1], 10) : 0);
            } else {
              setLowStockCount(0);
            }
            if (refundNotif) {
              const match = refundNotif.description.match(/(\d+)/);
              setPendingRefunds(match ? parseInt(match[1], 10) : 0);
            } else {
              setPendingRefunds(0);
            }
            const msgNotif = (data.notifications || []).find(
              (n: Notification) => n.id === "pending-messages"
            );
            if (msgNotif) {
              const match = msgNotif.title.match(/(\d+)/);
              setPendingMessages(match ? parseInt(match[1], 10) : 0);
            } else {
              setPendingMessages(0);
            }
            const orderNotif = (data.notifications || []).find(
              (n: Notification) => n.id === "pending-orders"
            );
            if (orderNotif) {
              const match = orderNotif.title.match(/(\d+)/);
              setPendingOrders(match ? parseInt(match[1], 10) : 0);
            } else {
              setPendingOrders(0);
            }
          }
        })
        .catch(() => {});
    };
    fetchNotifications();
    const timer = setInterval(fetchNotifications, 60000);
    return () => clearInterval(timer);
  }, [user]);

  /* ---------- Not logged in ---------- */
  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
        <div className="mx-auto max-w-md rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-8 text-center shadow-lg">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--destructive)]/10">
            <ShieldAlert className="h-8 w-8 text-[var(--destructive)]" />
          </div>
          <h2 className="text-xl font-bold text-[var(--foreground)]">
            请先登录
          </h2>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            您需要登录管理员账户才能访问管理后台
          </p>
          <Button asChild className="mt-6 w-full" size="lg">
            <Link href="/login">
              前往登录
              <ChevronRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  /* ---------- Not admin ---------- */
  if (user.role !== "admin" && user.role !== "super_admin") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
        <div className="mx-auto max-w-md rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-8 text-center shadow-lg">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--warning)]/10">
            <ShieldAlert className="h-8 w-8 text-[var(--warning)]" />
          </div>
          <h2 className="text-xl font-bold text-[var(--foreground)]">
            无权限
          </h2>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            您的账户没有管理员权限，无法访问此页面
          </p>
          <Button asChild variant="outline" className="mt-6 w-full" size="lg">
            <Link href="/">
              返回首页
              <ChevronRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  /* ---------- Helper: is link active ---------- */
  const isActive = (href: string) =>
    href === "/admin"
      ? pathname === "/admin"
      : (pathname ?? "").startsWith(href);

  /* ---------- Badge counts for sidebar ---------- */
  const sidebarBadges: Record<string, number> = {};
  if (lowStockCount > 0) sidebarBadges["/admin/products"] = lowStockCount;
  if (pendingRefunds > 0) sidebarBadges["/admin/refunds"] = pendingRefunds;
  if (pendingMessages > 0) sidebarBadges["/admin/messages"] = pendingMessages;
  if (pendingOrders > 0) sidebarBadges["/admin/orders"] = pendingOrders;

  /* ---------- Sidebar nav content (shared between desktop + mobile) ---------- */
  const SidebarNav = ({ onLinkClick }: { onLinkClick?: () => void }) => (
    <nav className="flex flex-col gap-1">
      {sidebarLinks.map((link) => {
        const active = isActive(link.href);
        const Icon = link.icon;
        const badgeCount = sidebarBadges[link.href] || 0;
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={onLinkClick}
            className={cn(
              "flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                : "text-[var(--muted-foreground)] hover:bg-[var(--secondary)] hover:text-[var(--foreground)]"
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="flex-1">{link.label}</span>
            {badgeCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--destructive)]/15 px-1.5 text-[10px] font-bold text-[var(--destructive)]">
                {badgeCount > 99 ? "99+" : badgeCount}
              </span>
            )}
          </Link>
        );
      })}

      <Separator className="my-2" />

      <button
        onClick={() => {
          onLinkClick?.();
          logout();
        }}
        className="flex w-full items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-sm font-medium text-[var(--muted-foreground)] hover:bg-[var(--secondary)] hover:text-[var(--destructive)] transition-colors"
      >
        <LogOut className="h-4 w-4" />
        退出登录
      </button>
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-[var(--background)]">
      {/* Prevent admin pages from being indexed */}
      <meta name="robots" content="noindex, nofollow" />
      {/* ========== Collapsed sidebar (tablet: md-lg) ========== */}
      <aside className="hidden w-16 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--card)] md:flex lg:hidden">
        <div className="flex h-16 items-center justify-center border-b border-[var(--border)]">
          <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] bg-[var(--primary)]">
            <LayoutDashboard className="h-4 w-4 text-white" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto py-4">
          <nav className="flex flex-col items-center gap-1">
            {sidebarLinks.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  title={link.label}
                  className={cn(
                    "relative flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] transition-colors",
                    active
                      ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                      : "text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--foreground)]"
                  )}
                >
                  <link.icon className="h-5 w-5" />
                  {(sidebarBadges[link.href] || 0) > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--destructive)] text-[9px] font-bold text-white">
                      {sidebarBadges[link.href] > 9 ? "9+" : sidebarBadges[link.href]}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* ========== Desktop Sidebar (full width) ========== */}
      <aside className="hidden w-64 shrink-0 border-r border-[var(--border)] bg-[var(--card)] lg:flex lg:flex-col">
        {/* Sidebar header / logo */}
        <div className="flex h-16 items-center gap-2 border-b border-[var(--border)] px-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] bg-[var(--primary)]">
            <LayoutDashboard className="h-4 w-4 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold bg-gradient-to-r from-[#6c5ce7] to-[#a855f7] bg-clip-text text-transparent">
              {SITE_NAME}
            </span>
            <span className="text-[10px] text-[var(--muted-foreground)]">
              管理后台
            </span>
          </div>
        </div>

        {/* Sidebar nav */}
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <SidebarNav />
        </div>

        {/* Sidebar footer: admin info */}
        <div className="border-t border-[var(--border)] p-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-[var(--primary)]/10 text-xs font-semibold text-[var(--primary)]">
                {user.username?.charAt(0).toUpperCase() ?? "A"}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-[var(--foreground)]">
                {user.username}
              </span>
              <span className="text-[10px] text-[var(--muted-foreground)]">
                管理员
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* ========== Main area ========== */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top header bar */}
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-[var(--border)] bg-[var(--background)]/80 px-4 backdrop-blur-xl lg:px-8">
          {/* Left: mobile menu + breadcrumb area */}
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                >
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">打开菜单</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">
                <SheetHeader className="border-b border-[var(--border)] px-6 py-4">
                  <SheetTitle className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] bg-[var(--primary)]">
                      <LayoutDashboard className="h-4 w-4 text-white" />
                    </div>
                    <span className="bg-gradient-to-r from-[#6c5ce7] to-[#a855f7] bg-clip-text text-transparent">
                      {SITE_NAME} 管理后台
                    </span>
                  </SheetTitle>
                </SheetHeader>
                <div className="px-3 py-4">
                  <SidebarNav onLinkClick={() => setMobileOpen(false)} />
                </div>
              </SheetContent>
            </Sheet>

            {/* Breadcrumbs */}
            <nav aria-label="面包屑" className="hidden items-center gap-1.5 text-sm md:flex">
              <Link
                href="/admin"
                className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
              >
                管理后台
              </Link>
              {pathname !== "/admin" && (() => {
                const segments = (pathname ?? "").replace("/admin", "").split("/").filter(Boolean);
                const current = sidebarLinks.find((l) => isActive(l.href) && l.href !== "/admin");
                if (!current && segments.length === 0) return null;
                return (
                  <>
                    <ChevronRight className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
                    <span className="font-medium text-[var(--foreground)]">
                      {current?.label ?? segments[segments.length - 1]}
                    </span>
                    {segments.length > 1 && current && (
                      <>
                        <ChevronRight className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
                        <span className="font-medium text-[var(--foreground)]">
                          详情
                        </span>
                      </>
                    )}
                  </>
                );
              })()}
            </nav>

            {/* Mobile logo */}
            <span className="text-sm font-bold bg-gradient-to-r from-[#6c5ce7] to-[#a855f7] bg-clip-text text-transparent md:hidden">
              {SITE_NAME}
            </span>

            {/* Cmd+K shortcut hint */}
            <button
              onClick={() => {
                document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
              }}
              className="hidden items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-2.5 py-1 text-xs text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)] md:flex"
            >
              <Search className="h-3 w-3" />
              <span>快速跳转</span>
              <kbd className="ml-1 rounded border border-[var(--border)] bg-[var(--muted)] px-1 py-0.5 text-[10px] font-mono">
                ⌘K
              </kbd>
            </button>
          </div>

          {/* Right side: notifications, avatar, logout */}
          <div className="flex items-center gap-2">
            {/* Notification bell */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5 text-[var(--muted-foreground)]" />
                  {notifCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--destructive)] text-[10px] font-bold text-white">
                      {notifCount > 9 ? "9+" : notifCount}
                    </span>
                  )}
                  <span className="sr-only">通知</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                {notifications.length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm text-[var(--muted-foreground)]">
                    暂无通知
                  </div>
                ) : (
                  notifications.map((n) => (
                    <DropdownMenuItem key={n.id} asChild className="cursor-pointer">
                      <Link href={n.href} className="flex items-start gap-3 px-3 py-2.5">
                        {n.type === "warning" ? (
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--warning)]" />
                        ) : n.type === "alert" ? (
                          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-[var(--destructive)]" />
                        ) : (
                          <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--primary)]" />
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[var(--foreground)]">{n.title}</p>
                          <p className="text-xs text-[var(--muted-foreground)]">{n.description}</p>
                        </div>
                      </Link>
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <Separator orientation="vertical" className="hidden h-6 sm:block" />

            {/* Return to shop */}
            <Link
              href="/"
              className="hidden text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors sm:inline-block"
            >
              返回商城
            </Link>

            <Separator orientation="vertical" className="hidden h-6 sm:block" />

            {/* Avatar + name */}
            <div className="hidden items-center gap-2 sm:flex">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-[var(--primary)]/10 text-xs font-semibold text-[var(--primary)]">
                  {user.username?.charAt(0).toUpperCase() ?? "A"}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-[var(--foreground)]">
                  {user.username}
                </span>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  管理员
                </Badge>
              </div>
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
        </header>

        {/* Page content */}
        <main id="main-content" className="flex-1 overflow-y-auto p-4 lg:p-8">
          {children}
        </main>
      </div>

      {/* Command palette */}
      <AdminCommandPalette />
    </div>
  );
}
