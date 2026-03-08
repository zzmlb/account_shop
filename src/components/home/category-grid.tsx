import Link from "next/link";
import {
  Mail,
  Tv,
  Shield,
  Share2,
  Cloud,
  Code,
  Gamepad2,
  Package,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { db } from "@/server/db";

const ICON_MAP: Record<string, LucideIcon> = {
  Mail,
  Tv,
  Shield,
  Share2,
  Cloud,
  Code,
  Gamepad2,
  Package,
};

export default async function CategoryGrid() {
  const categories = await db.category.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    include: {
      _count: { select: { products: { where: { isActive: true } } } },
    },
  });

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
        {categories.map((cat) => {
          const Icon = ICON_MAP[cat.icon || "Package"] || Package;
          return (
            <Link
              key={cat.slug}
              href={`/category/${cat.slug}`}
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
                {cat._count.products} 件商品
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
