"use client";

import Link from "next/link";
import { FolderTree, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import ProductCard from "@/components/product/product-card";

interface Product {
  productId?: string;
  name: string;
  slug: string;
  price: number;
  originalPrice?: number;
  image?: string;
  stockCount: number;
  soldCount: number;
  categoryName: string;
}

interface CategoryInfo {
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
}

interface CategoryPageContentProps {
  category: CategoryInfo;
  products: Product[];
  categories: { name: string; slug: string; icon: string | null }[];
}

export default function CategoryPageContent({
  category,
  products,
  categories,
}: CategoryPageContentProps) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
        <Link
          href="/"
          className="hover:text-[var(--primary)] transition-colors"
        >
          首页
        </Link>
        <span>/</span>
        <Link
          href="/products"
          className="hover:text-[var(--primary)] transition-colors"
        >
          全部商品
        </Link>
        <span>/</span>
        <span className="text-[var(--foreground)]">{category.name}</span>
      </nav>

      {/* Category header */}
      <div className="mb-8 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-6 sm:p-8">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--primary)]/10 text-3xl">
            {category.icon || "📁"}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--foreground)] sm:text-3xl">
              {category.name}
            </h1>
            {category.description && (
              <p className="mt-1 text-[var(--muted-foreground)]">
                {category.description}
              </p>
            )}
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              共 {products.length} 件商品
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Sidebar - other categories */}
        <aside className="w-full shrink-0 lg:w-56">
          <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
              <FolderTree className="h-4 w-4 text-[var(--primary)]" />
              全部分类
            </h3>
            <div className="space-y-1">
              {categories.map((cat) => (
                <Link
                  key={cat.slug}
                  href={`/category/${cat.slug}`}
                  className={`flex items-center gap-2 rounded-[var(--radius-md)] px-3 py-2 text-sm transition-colors ${
                    cat.slug === category.slug
                      ? "bg-[var(--primary)]/10 font-medium text-[var(--primary)]"
                      : "text-[var(--muted-foreground)] hover:bg-[var(--secondary)] hover:text-[var(--foreground)]"
                  }`}
                >
                  <span>{cat.icon || "📁"}</span>
                  {cat.name}
                </Link>
              ))}
            </div>
          </div>
        </aside>

        {/* Products grid */}
        <main className="flex-1">
          {products.length === 0 ? (
            <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-12 text-center">
              <Package className="mx-auto h-12 w-12 text-[var(--muted-foreground)]" />
              <p className="mt-4 text-lg font-medium text-[var(--foreground)]">
                该分类暂无商品
              </p>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                请浏览其他分类或稍后再来
              </p>
              <Link
                href="/products"
                className="mt-4 inline-block text-sm font-medium text-[var(--primary)] hover:text-[var(--primary-hover)] transition-colors"
              >
                查看全部商品 &rarr;
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-4 flex items-center justify-between">
                <Badge variant="secondary" className="text-xs">
                  {products.length} 件商品
                </Badge>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {products.map((product) => (
                  <ProductCard key={product.slug} {...product} />
                ))}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
