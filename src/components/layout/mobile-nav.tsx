"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Package, LayoutGrid, FileText, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotificationStore } from "@/stores/notification-store";
import { useCartStore } from "@/stores/cart-store";

const mobileNavItems = [
  { label: "首页", href: "/", icon: Home },
  { label: "商品", href: "/products", icon: Package },
  { label: "分类", href: "/categories", icon: LayoutGrid },
  { label: "订单", href: "/dashboard/orders", icon: FileText },
  { label: "我的", href: "/dashboard", icon: User },
];

export default function MobileNav() {
  const pathname = usePathname();
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const cartCount = useCartStore((s) => s.getItemCount());

  return (
    <nav
      aria-label="移动端导航"
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 md:hidden",
        "border-t border-[var(--border)]",
        "bg-[var(--background)]/90 backdrop-blur-xl",
        "safe-area-inset-bottom"
      )}
    >
      <div className="grid h-16 grid-cols-5">
        {mobileNavItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : (pathname ?? "").startsWith(item.href);

          // Determine badge count for specific nav items
          const badgeCount =
            item.href === "/dashboard" ? unreadCount :
            item.href === "/products" ? cartCount :
            0;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 transition-colors duration-200",
                isActive
                  ? "text-[var(--primary)]"
                  : "text-[var(--muted-foreground)]"
              )}
            >
              <span className="relative">
                <item.icon
                  className={cn(
                    "h-5 w-5 transition-transform duration-200",
                    isActive && "scale-110"
                  )}
                />
                {badgeCount > 0 && (
                  <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--primary)] px-0.5 text-[9px] font-bold text-[var(--primary-foreground)]">
                    {badgeCount > 99 ? "99+" : badgeCount}
                  </span>
                )}
              </span>
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
