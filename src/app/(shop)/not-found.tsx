"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SearchX, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ShopNotFound() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (q) {
      router.push(`/products?search=${encodeURIComponent(q)}`);
    }
  };

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center justify-center px-4 py-24 text-center">
      <div className="mb-6 rounded-full bg-[var(--muted)] p-6">
        <SearchX className="h-12 w-12 text-[var(--muted-foreground)]" />
      </div>
      <h1 className="mb-2 text-4xl font-bold text-[var(--foreground)]">404</h1>
      <h2 className="mb-4 text-lg font-semibold text-[var(--foreground)]">
        页面未找到
      </h2>
      <p className="mb-6 text-[var(--muted-foreground)]">
        您访问的页面不存在，可能已被移除或链接有误
      </p>

      {/* Search bar */}
      <form onSubmit={handleSearch} className="mb-8 flex w-full max-w-sm gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <Input
            placeholder="搜索商品..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
            aria-label="搜索商品"
          />
        </div>
        <Button type="submit" disabled={!query.trim()}>
          搜索
        </Button>
      </form>

      <div className="flex gap-3">
        <Button asChild variant="outline">
          <Link href="/">返回首页</Link>
        </Button>
        <Button asChild>
          <Link href="/products">浏览商品</Link>
        </Button>
      </div>
    </div>
  );
}
