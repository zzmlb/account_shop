import type { Metadata } from "next";
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
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { db } from "@/server/db";
import { SITE_NAME, SITE_URL } from "@/lib/constants";
import AnimatedSection from "@/components/shared/animated-section";

export const revalidate = 120; // ISR: revalidate every 2 minutes

export const metadata: Metadata = {
  title: `商品分类 - ${SITE_NAME}`,
  description: "浏览所有商品分类，快速找到您需要的数字商品和服务",
  openGraph: {
    title: `商品分类 - ${SITE_NAME}`,
    description: "浏览所有商品分类，快速找到您需要的数字商品和服务",
    url: `${SITE_URL}/categories`,
    type: "website",
  },
  twitter: {
    card: "summary",
    title: `商品分类 - ${SITE_NAME}`,
    description: "浏览所有商品分类，快速找到您需要的数字商品和服务",
  },
  alternates: { canonical: `${SITE_URL}/categories` },
};

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

export default async function CategoriesPage() {
  const categories = await db.category.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    include: {
      _count: { select: { products: { where: { isActive: true } } } },
    },
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <AnimatedSection className="mb-10 text-center">
        <h1 className="text-3xl font-bold text-[var(--foreground)] sm:text-4xl">
          商品分类
        </h1>
        <p className="mt-3 text-[var(--muted-foreground)]">
          浏览各类优质数字商品，找到你需要的服务
        </p>
      </AnimatedSection>

      {/* Categories grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((cat, index) => {
          const Icon = ICON_MAP[cat.icon || "Package"] || Package;
          return (
            <AnimatedSection key={cat.slug} delay={index * 0.08}>
              <Link
                href={`/category/${cat.slug}`}
                className={cn(
                  "group flex items-center gap-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-6",
                  "transition-all duration-300",
                  "hover:border-[var(--primary)]/50 hover:bg-[var(--card-hover)]",
                  "hover:shadow-[0_0_30px_rgba(108,92,231,0.15)]"
                )}
              >
                {/* Icon */}
                <div
                  className={cn(
                    "flex h-14 w-14 shrink-0 items-center justify-center rounded-[var(--radius-md)]",
                    "bg-[var(--primary)]/10 text-[var(--primary)]",
                    "transition-all duration-300",
                    "group-hover:bg-[var(--primary)]/20 group-hover:scale-110"
                  )}
                >
                  <Icon className="h-7 w-7" />
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <h2 className="text-base font-semibold text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors">
                    {cat.name}
                  </h2>
                  {cat.description && (
                    <p className="mt-0.5 text-sm text-[var(--muted-foreground)] line-clamp-1">
                      {cat.description}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                    {cat._count.products} 件商品
                  </p>
                </div>

                {/* Arrow */}
                <ChevronRight className="h-5 w-5 shrink-0 text-[var(--muted-foreground)] transition-transform group-hover:translate-x-1 group-hover:text-[var(--primary)]" />
              </Link>
            </AnimatedSection>
          );
        })}
      </div>

      {/* Empty state */}
      {categories.length === 0 && (
        <div className="py-16 text-center">
          <Package className="mx-auto mb-4 h-12 w-12 text-[var(--muted-foreground)]" />
          <p className="text-lg text-[var(--muted-foreground)]">
            暂无商品分类
          </p>
        </div>
      )}
    </div>
  );
}
