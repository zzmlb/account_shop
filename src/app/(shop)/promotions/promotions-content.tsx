"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Ticket,
  Clock,
  Gift,
  Copy,
  Check,
  Percent,
  Tag,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import EmptyState from "@/components/shared/empty-state";
import { toast } from "sonner";
import { apiFetch, apiMutate } from "@/lib/api-fetch";
import Breadcrumb from "@/components/ui/breadcrumb";

interface AvailableCoupon {
  id: string;
  code: string;
  type: "FIXED" | "PERCENTAGE";
  value: number;
  minAmount: number | null;
  maxUses: number | null;
  claimedCount: number;
  startAt: string;
  expireAt: string;
  isClaimed: boolean;
}

function formatCondition(minAmount: number | null): string {
  if (!minAmount) return "无门槛";
  return `满¥${minAmount}可用`;
}

function daysUntilExpiry(expireAt: string): number {
  const now = new Date();
  const expire = new Date(expireAt);
  return Math.max(0, Math.ceil((expire.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
}

export default function PromotionsContent() {
  const [coupons, setCoupons] = useState<AvailableCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState("");
  const [claimingManual, setClaimingManual] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const fetchCoupons = useCallback(async () => {
    try {
      const data = await apiFetch<{ coupons: AvailableCoupon[] }>("/api/coupons/available");
      setCoupons(data.coupons);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "获取优惠券失败，请刷新重试");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  const claimCoupon = async (code: string, couponId?: string) => {
    try {
      if (couponId) setClaimingId(couponId);
      else setClaimingManual(true);

      await apiMutate("/api/coupons/claim", "POST", { code });
      toast.success("优惠券领取成功", {
        description: `${code} 已添加到您的优惠券中`,
      });
      // Update local state
      setCoupons((prev) =>
        prev.map((c) =>
          c.id === couponId ? { ...c, isClaimed: true } : c
        )
      );
      if (!couponId) {
        setManualCode("");
        fetchCoupons();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "网络错误，请稍后重试");
    } finally {
      setClaimingId(null);
      setClaimingManual(false);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCode(code);
      toast.success("优惠码已复制");
      setTimeout(() => setCopiedCode(null), 2000);
    });
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumb items={[{ label: "优惠活动" }]} className="mb-6" />
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--primary)]/10">
          <Gift className="h-7 w-7 text-[var(--primary)]" />
        </div>
        <h1 className="text-2xl font-bold text-[var(--foreground)] sm:text-3xl">
          优惠活动
        </h1>
        <p className="mt-2 text-[var(--muted-foreground)]">
          领取优惠券，享受更多折扣
        </p>
      </div>

      {/* Manual code input */}
      <div className="mx-auto mb-10 max-w-lg">
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-5">
          <h2 className="mb-3 text-sm font-semibold text-[var(--foreground)]">
            输入优惠码
          </h2>
          <div className="flex gap-2">
            <Input
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value.toUpperCase())}
              placeholder="请输入优惠码"
              className="flex-1"
              maxLength={50}
              onKeyDown={(e) => {
                if (e.key === "Enter" && manualCode.trim()) {
                  claimCoupon(manualCode.trim());
                }
              }}
            />
            <Button
              onClick={() => claimCoupon(manualCode.trim())}
              disabled={!manualCode.trim() || claimingManual}
            >
              {claimingManual ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "领取"
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Available coupons */}
      <div className="mb-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-[var(--foreground)]">
          <Ticket className="h-5 w-5 text-[var(--primary)]" />
          可领取的优惠券
        </h2>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-48 animate-pulse rounded-[var(--radius-lg)] bg-[var(--muted)]"
            />
          ))}
        </div>
      ) : coupons.length === 0 ? (
        <EmptyState
          icon={Ticket}
          title="暂无可领取的优惠券"
          description="当前没有进行中的优惠活动，请稍后再来查看"
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {coupons.map((coupon) => {
            const days = daysUntilExpiry(coupon.expireAt);
            const isUrgent = days <= 3;

            return (
              <div
                key={coupon.id}
                className={cn(
                  "relative overflow-hidden rounded-[var(--radius-lg)] border bg-[var(--card)] transition-all",
                  coupon.isClaimed
                    ? "border-[var(--border)] opacity-75"
                    : "border-[var(--primary)]/20 hover:border-[var(--primary)]/40 hover:shadow-md"
                )}
              >
                {/* Top accent */}
                <div
                  className={cn(
                    "h-1",
                    coupon.isClaimed
                      ? "bg-[var(--muted)]"
                      : coupon.type === "PERCENTAGE"
                        ? "bg-gradient-to-r from-[var(--primary)] to-purple-500"
                        : "bg-gradient-to-r from-[var(--primary)] to-emerald-500"
                  )}
                />

                <div className="p-5">
                  {/* Value display */}
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex items-baseline gap-1">
                      {coupon.type === "FIXED" ? (
                        <>
                          <span className="text-xs text-[var(--primary)]">¥</span>
                          <span className="text-3xl font-bold text-[var(--primary)]">
                            {coupon.value}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-3xl font-bold text-[var(--primary)]">
                            {coupon.value}
                          </span>
                          <span className="text-xs text-[var(--primary)]">%OFF</span>
                        </>
                      )}
                    </div>
                    <Badge
                      variant="secondary"
                      className="shrink-0 text-[10px]"
                    >
                      {coupon.type === "FIXED" ? (
                        <Tag className="mr-1 h-3 w-3" />
                      ) : (
                        <Percent className="mr-1 h-3 w-3" />
                      )}
                      {coupon.type === "FIXED" ? "满减券" : "折扣券"}
                    </Badge>
                  </div>

                  {/* Condition */}
                  <p className="mb-2 text-sm text-[var(--muted-foreground)]">
                    {formatCondition(coupon.minAmount)}
                  </p>

                  {/* Code + copy */}
                  <div className="mb-3 flex items-center gap-2">
                    <code className="rounded bg-[var(--muted)] px-2 py-0.5 text-xs font-mono text-[var(--foreground)]">
                      {coupon.code}
                    </code>
                    <button
                      onClick={() => copyCode(coupon.code)}
                      className="text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors"
                    >
                      {copiedCode === coupon.code ? (
                        <Check className="h-3.5 w-3.5 text-green-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>

                  {/* Meta info */}
                  <div className="mb-4 flex items-center gap-3 text-xs text-[var(--muted-foreground)]">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {isUrgent ? (
                        <span className="text-red-500">剩余{days}天</span>
                      ) : (
                        <span>剩余{days}天</span>
                      )}
                    </span>
                    {coupon.maxUses !== null && (
                      <span>
                        已领{coupon.claimedCount}/{coupon.maxUses}
                      </span>
                    )}
                  </div>

                  {/* Action button */}
                  {coupon.isClaimed ? (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-green-600">已领取</span>
                      <Link
                        href="/dashboard/coupons"
                        className="text-xs text-[var(--primary)] hover:underline"
                      >
                        查看我的优惠券
                      </Link>
                    </div>
                  ) : (
                    <Button
                      className="w-full"
                      size="sm"
                      onClick={() => claimCoupon(coupon.code, coupon.id)}
                      disabled={claimingId === coupon.id}
                    >
                      {claimingId === coupon.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Gift className="mr-2 h-4 w-4" />
                      )}
                      立即领取
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Info section */}
      <div className="mt-12 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-6">
        <h3 className="mb-3 text-sm font-semibold text-[var(--foreground)]">
          使用说明
        </h3>
        <ul className="space-y-2 text-sm text-[var(--muted-foreground)]">
          <li>1. 每位用户每张优惠券限领一次</li>
          <li>2. 领取后可在 <Link href="/dashboard/coupons" className="text-[var(--primary)] hover:underline">我的优惠券</Link> 中查看</li>
          <li>3. 结算时选择可用优惠券即可抵扣</li>
          <li>4. 优惠券过期后将自动失效，请及时使用</li>
        </ul>
      </div>
    </div>
  );
}
