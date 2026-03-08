import Link from "next/link";
import {
  Mail,
  Globe,
  Users,
  Play,
  Gamepad2,
  Code,
  Shield,
  MoreHorizontal,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Category {
  name: string;
  slug: string;
  icon: LucideIcon;
  count: number;
}

const CATEGORIES: Category[] = [
  { name: "Gmail邮箱", slug: "gmail", icon: Mail, count: 1280 },
  { name: "Outlook邮箱", slug: "outlook", icon: Globe, count: 960 },
  { name: "社交媒体", slug: "social-media", icon: Users, count: 2150 },
  { name: "流媒体账号", slug: "streaming", icon: Play, count: 1840 },
  { name: "游戏账号", slug: "gaming", icon: Gamepad2, count: 1560 },
  { name: "开发者工具", slug: "dev-tools", icon: Code, count: 720 },
  { name: "VPN服务", slug: "vpn", icon: Shield, count: 890 },
  { name: "其他服务", slug: "others", icon: MoreHorizontal, count: 640 },
];

export default function CategoryGrid() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
      {/* Section header */}
      <div className="mb-10 text-center">
        <h2 className="text-2xl font-bold text-[var(--foreground)] sm:text-3xl">
          商品分类
        </h2>
        <p className="mt-3 text-[var(--muted-foreground)]">
          浏览各类优质数字商品，找到你需要的服务
        </p>
      </div>

      {/* Bento grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          return (
            <Link
              key={cat.slug}
              href={`/products?category=${cat.slug}`}
              className={cn(
                "group relative flex flex-col items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-6",
                "transition-all duration-300",
                "hover:border-[var(--primary)]/50 hover:bg-[var(--card-hover)]",
                "hover:shadow-[0_0_30px_rgba(108,92,231,0.15)]"
              )}
            >
              {/* Icon */}
              <div
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-[var(--radius-md)]",
                  "bg-[var(--primary)]/10 text-[var(--primary)]",
                  "transition-all duration-300",
                  "group-hover:bg-[var(--primary)]/20 group-hover:scale-110"
                )}
              >
                <Icon className="h-6 w-6" />
              </div>

              {/* Name */}
              <span className="text-sm font-semibold text-[var(--foreground)]">
                {cat.name}
              </span>

              {/* Count */}
              <span className="text-xs text-[var(--muted-foreground)]">
                {cat.count.toLocaleString()} 件商品
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
