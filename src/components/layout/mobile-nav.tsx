"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Package, FileText, User } from "lucide-react";
import { cn } from "@/lib/utils";

const mobileNavItems = [
  { label: "首页", href: "/", icon: Home },
  { label: "商品", href: "/products", icon: Package },
  { label: "订单", href: "/orders", icon: FileText },
  { label: "我的", href: "/profile", icon: User },
];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 md:hidden",
        "border-t border-[var(--border)]",
        "bg-[var(--background)]/90 backdrop-blur-xl",
        "safe-area-inset-bottom"
      )}
    >
      <div className="grid h-16 grid-cols-4">
        {mobileNavItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

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
              <item.icon
                className={cn(
                  "h-5 w-5 transition-transform duration-200",
                  isActive && "scale-110"
                )}
              />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
