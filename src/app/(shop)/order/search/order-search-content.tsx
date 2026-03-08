"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Search,
  Eye,
  EyeOff,
  Package,
  KeyRound,
  Loader2,
  Copy,
  ChevronRight,
  Home,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatPrice } from "@/lib/utils";
import CopyButton from "@/components/shared/copy-button";
import { useAuthStore } from "@/stores/auth-store";

interface SearchResult {
  orderId: string;
  status: string;
  items: Array<{ name: string; slug: string; quantity: number; price: number }>;
  cardKeys: string[];
  createdAt: string;
  total: number;
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: "待支付",
  PAID: "已支付",
  DELIVERED: "已发货",
  CANCELLED: "已取消",
  REFUNDED: "已退款",
  EXPIRED: "已过期",
};

const STATUS_VARIANTS: Record<string, "default" | "success" | "destructive" | "outline" | "secondary"> = {
  PENDING: "outline",
  PAID: "default",
  DELIVERED: "success",
  CANCELLED: "destructive",
  REFUNDED: "secondary",
  EXPIRED: "secondary",
};

function maskKey(key: string): string {
  const parts = key.split("-");
  if (parts.length <= 1) {
    if (key.length <= 4) return "****";
    return key.substring(0, 4) + "*".repeat(key.length - 4);
  }
  return parts[0] + "-" + parts.slice(1).map(() => "****").join("-");
}

export default function OrderSearchPageContent() {
  const [orderNo, setOrderNo] = useState("");
  const [email, setEmail] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [searchError, setSearchError] = useState("");
  const [revealedKeys, setRevealedKeys] = useState<Set<number>>(new Set());
  const user = useAuthStore((s) => s.user);

  // Auto-fill email for logged-in users
  useEffect(() => {
    if (user?.email && !email) {
      setEmail(user.email);
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = async () => {
    if (!orderNo.trim()) {
      setSearchError("请输入订单号");
      return;
    }

    setIsSearching(true);
    setSearchError("");
    setResult(null);
    setRevealedKeys(new Set());

    try {
      const emailParam = email.trim() ? `?email=${encodeURIComponent(email.trim())}` : "";
      const res = await fetch(`/api/orders/${orderNo.trim()}${emailParam}`);
      const data = await res.json();

      if (data.success && data.order) {
        const order = data.order;
        setResult({
          orderId: order.orderNo,
          status: order.status,
          items: order.items,
          cardKeys: order.cardKeys || [],
          createdAt: order.createdAt,
          total: order.totalAmount,
        });
      } else {
        setSearchError(data.message || "未找到该订单，请检查订单号是否正确");
      }
    } catch {
      setSearchError("查询失败，请稍后重试");
    } finally {
      setIsSearching(false);
    }
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
      {/* Breadcrumb */}
      <nav aria-label="面包屑导航" className="mb-6">
        <ol className="flex items-center gap-1.5 text-sm text-[var(--muted-foreground)]">
          <li>
            <Link href="/" className="flex items-center gap-1 hover:text-[var(--foreground)] transition-colors">
              <Home className="h-3.5 w-3.5" />
              首页
            </Link>
          </li>
          <li><ChevronRight className="h-3.5 w-3.5" /></li>
          <li>
            <Link href="/products" className="hover:text-[var(--foreground)] transition-colors">
              商品
            </Link>
          </li>
          <li><ChevronRight className="h-3.5 w-3.5" /></li>
          <li className="text-[var(--foreground)] font-medium">卡密查询</li>
        </ol>
      </nav>

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
              placeholder="例如: PJ37-20260308-A1B2"
              value={orderNo}
              onChange={(e) => {
                setOrderNo(e.target.value);
                setSearchError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearch();
              }}
              autoFocus
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
              <Badge variant={STATUS_VARIANTS[result.status] || "default"} className="text-xs">
                {STATUS_LABELS[result.status] || result.status}
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
          {result.cardKeys.length > 0 ? (
            <div className="rounded-[var(--radius-lg)] border border-[var(--primary)]/30 bg-[var(--primary)]/5 p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-[var(--foreground)]">
                  <KeyRound className="h-5 w-5 text-[var(--primary)]" />
                  卡密信息 ({result.cardKeys.length} 个)
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

              <div className="mt-4 flex items-center justify-between">
                <p className="text-xs text-[var(--muted-foreground)]">
                  请妥善保管卡密信息，避免截图或分享给他人。
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(result.cardKeys.join("\n"));
                    toast.success("已复制全部卡密");
                  }}
                  className="gap-1.5 shrink-0"
                >
                  <Copy className="h-3.5 w-3.5" />
                  复制全部
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-6 text-center">
              <p className="text-sm text-[var(--muted-foreground)]">
                {result.status === "PENDING"
                  ? "订单尚未支付，支付完成后即可查看卡密"
                  : result.status === "CANCELLED"
                    ? "订单已取消"
                    : result.status === "EXPIRED"
                      ? "订单已过期"
                      : "暂无卡密信息"}
              </p>
            </div>
          )}

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
