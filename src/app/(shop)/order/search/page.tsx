"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Search,
  ArrowLeft,
  Eye,
  EyeOff,
  Package,
  KeyRound,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn, formatPrice } from "@/lib/utils";
import CopyButton from "@/components/shared/copy-button";

interface SearchResult {
  orderId: string;
  status: string;
  items: Array<{ name: string; quantity: number; price: number }>;
  cardKeys: string[];
  createdAt: string;
  total: number;
}

function generateMockKeys(count: number): string[] {
  return Array.from({ length: count }, () => {
    const segments = Array.from({ length: 4 }, () =>
      Math.random().toString(36).substring(2, 6).toUpperCase()
    );
    return segments.join("-");
  });
}

function maskKey(key: string): string {
  const parts = key.split("-");
  if (parts.length <= 1) return "****-****-****-****";
  return parts[0] + "-" + parts.slice(1).map(() => "****").join("-");
}

export default function OrderSearchPage() {
  const [orderNo, setOrderNo] = useState("");
  const [email, setEmail] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [searchError, setSearchError] = useState("");
  const [revealedKeys, setRevealedKeys] = useState<Set<number>>(new Set());

  const handleSearch = async () => {
    if (!orderNo.trim()) {
      setSearchError("请输入订单号");
      return;
    }

    setIsSearching(true);
    setSearchError("");
    setResult(null);
    setRevealedKeys(new Set());

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1200));

    // Try to load from sessionStorage first
    const stored = sessionStorage.getItem(`order-${orderNo.trim()}`);
    if (stored) {
      const parsed = JSON.parse(stored);
      const totalItems = parsed.items.reduce(
        (sum: number, item: { quantity: number }) => sum + item.quantity,
        0
      );
      setResult({
        orderId: parsed.id,
        status: "DELIVERED",
        items: parsed.items,
        cardKeys: generateMockKeys(totalItems),
        createdAt: parsed.createdAt,
        total: parsed.total,
      });
    } else if (orderNo.trim().startsWith("ORD-")) {
      // Generate mock result for any ORD- prefixed order number
      setResult({
        orderId: orderNo.trim(),
        status: "DELIVERED",
        items: [
          { name: "Steam 充值卡 100元", quantity: 1, price: 95.0 },
          { name: "Netflix 高级会员月卡", quantity: 1, price: 45.0 },
        ],
        cardKeys: generateMockKeys(2),
        createdAt: new Date().toISOString(),
        total: 140.0,
      });
    } else {
      setSearchError("未找到该订单，请检查订单号是否正确");
    }

    setIsSearching(false);
  };

  const toggleKeyReveal = (index: number) => {
    setRevealedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Back link */}
      <Link
        href="/products"
        className="mb-6 inline-flex items-center gap-1 text-sm text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
      >
        <ArrowLeft className="h-4 w-4" />
        返回商品列表
      </Link>

      {/* Page header */}
      <div className="mb-8 text-center">
        <div className="mb-4 inline-flex rounded-full bg-[var(--primary)]/10 p-4">
          <KeyRound className="h-8 w-8 text-[var(--primary)]" />
        </div>
        <h1 className="mb-2 text-2xl font-bold text-[var(--foreground)] sm:text-3xl">
          卡密查询
        </h1>
        <p className="text-[var(--muted-foreground)]">
          输入订单号查询您的卡密信息
        </p>
      </div>

      {/* Search form */}
      <div className="mb-8 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-6">
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--foreground)]">
              订单号 <span className="text-[var(--destructive)]">*</span>
            </label>
            <Input
              placeholder="例如: ORD-20260308-A1B2"
              value={orderNo}
              onChange={(e) => {
                setOrderNo(e.target.value);
                setSearchError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearch();
              }}
              className="font-mono"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--foreground)]">
              邮箱{" "}
              <span className="text-xs text-[var(--muted-foreground)]">
                (可选，用于验证身份)
              </span>
            </label>
            <Input
              type="email"
              placeholder="购买时填写的邮箱"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearch();
              }}
            />
          </div>

          {searchError && (
            <p className="text-sm text-[var(--destructive)]">{searchError}</p>
          )}

          <Button
            onClick={handleSearch}
            disabled={isSearching || !orderNo.trim()}
            className="w-full"
            size="lg"
          >
            {isSearching ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                查询中...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                查询卡密
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Search results */}
      {result && (
        <div className="space-y-6">
          {/* Order info summary */}
          <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-[var(--foreground)]">
                <Package className="h-5 w-5 text-[var(--primary)]" />
                订单信息
              </h2>
              <Badge variant="success" className="text-xs">
                {result.status === "DELIVERED" ? "已发货" : result.status}
              </Badge>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--muted-foreground)]">订单号</span>
                <span className="font-mono text-[var(--foreground)]">
                  {result.orderId}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--muted-foreground)]">下单时间</span>
                <span className="text-[var(--foreground)]">
                  {new Date(result.createdAt).toLocaleString("zh-CN")}
                </span>
              </div>
              <Separator />
              {result.items.map((item, idx) => (
                <div key={idx} className="flex justify-between">
                  <span className="text-[var(--foreground)]">
                    {item.name} x{item.quantity}
                  </span>
                  <span className="text-[var(--foreground)]">
                    {formatPrice(item.price * item.quantity)}
                  </span>
                </div>
              ))}
              <Separator />
              <div className="flex justify-between">
                <span className="font-medium text-[var(--foreground)]">
                  总计
                </span>
                <span className="font-bold text-[var(--primary)]">
                  {formatPrice(result.total)}
                </span>
              </div>
            </div>
          </div>

          {/* Card keys */}
          <div className="rounded-[var(--radius-lg)] border border-[var(--primary)]/30 bg-[var(--primary)]/5 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-[var(--foreground)]">
                <KeyRound className="h-5 w-5 text-[var(--primary)]" />
                卡密信息
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (revealedKeys.size === result.cardKeys.length) {
                    setRevealedKeys(new Set());
                  } else {
                    setRevealedKeys(
                      new Set(result.cardKeys.map((_, i) => i))
                    );
                  }
                }}
                className="gap-1.5"
              >
                {revealedKeys.size === result.cardKeys.length ? (
                  <>
                    <EyeOff className="h-3.5 w-3.5" />
                    全部隐藏
                  </>
                ) : (
                  <>
                    <Eye className="h-3.5 w-3.5" />
                    全部显示
                  </>
                )}
              </Button>
            </div>

            <div className="space-y-2">
              {result.cardKeys.map((key, index) => {
                const isRevealed = revealedKeys.has(index);
                return (
                  <div
                    key={index}
                    className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--card)] px-4 py-3"
                  >
                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[var(--primary)]/10 text-xs font-bold text-[var(--primary)]">
                      {index + 1}
                    </span>
                    <code className="flex-1 font-mono text-sm tracking-wider text-[var(--foreground)]">
                      {isRevealed ? key : maskKey(key)}
                    </code>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleKeyReveal(index)}
                        className="h-8 w-8 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                        aria-label={isRevealed ? "隐藏" : "显示"}
                      >
                        {isRevealed ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                      <CopyButton text={key} variant="ghost" size="sm" />
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="mt-4 text-xs text-[var(--muted-foreground)]">
              请妥善保管卡密信息，避免截图或分享给他人。如有问题请联系客服。
            </p>
          </div>

          {/* Link to full order detail */}
          <div className="text-center">
            <Button asChild variant="outline">
              <Link href={`/order/${result.orderId}`}>查看完整订单详情</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
