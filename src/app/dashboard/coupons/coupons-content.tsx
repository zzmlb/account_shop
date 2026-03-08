"use client";

import { useState, useEffect, useCallback } from "react";
import { Ticket, Clock, CheckCircle2, XCircle, Tag, Copy, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import EmptyState from "@/components/shared/empty-state";
import { toast } from "sonner";

type CouponStatus = "available" | "used" | "expired";

interface Coupon {
  id: string;
  code: string;
  type: "fixed" | "percent";
  discount: number;       // fixed: amount in yuan, percent: percentage
  minSpend: number;
  maxDiscount?: number;    // only for percent type
  name: string;
  description: string;
  validFrom: string;
  validTo: string;
  status: CouponStatus;
  usedAt?: string;
  applicableCategories?: string[];
}

interface ApiCoupon {
  id: string;
  couponId: string;
  name: string;
  code: string;
  type: string;
  value: number;
  minAmount: number | null;
  startDate: string;
  endDate: string;
  isUsed: boolean;
  usedAt: string | null;
}

function deriveStatus(apiCoupon: ApiCoupon): CouponStatus {
  if (apiCoupon.isUsed) return "used";
  if (new Date(apiCoupon.endDate) < new Date()) return "expired";
  return "available";
}

function buildDescription(type: string, value: number, minAmount: number | null): string {
  const minText = minAmount ? `满${minAmount}` : "无门槛";
  if (type === "fixed") {
    return `${minText}减${value}元`;
  }
  return `${minText}享${100 - value}折`;
}

function mapApiToCoupon(apiCoupon: ApiCoupon): Coupon {
  const status = deriveStatus(apiCoupon);
  return {
    id: apiCoupon.id,
    code: apiCoupon.code,
    type: apiCoupon.type === "percent" ? "percent" : "fixed",
    discount: apiCoupon.value,
    minSpend: apiCoupon.minAmount ?? 0,
    name: apiCoupon.name,
    description: buildDescription(apiCoupon.type, apiCoupon.value, apiCoupon.minAmount),
    validFrom: apiCoupon.startDate.split("T")[0],
    validTo: apiCoupon.endDate.split("T")[0],
    status,
    usedAt: apiCoupon.usedAt ? apiCoupon.usedAt.split("T")[0] : undefined,
  };
}

const TAB_CONFIG = [
  { value: "available", label: "可使用", icon: Ticket },
  { value: "used", label: "已使用", icon: CheckCircle2 },
  { value: "expired", label: "已过期", icon: XCircle },
] as const;

function CouponCard({
  coupon,
  onCopyCode,
  copiedId,
}: {
  coupon: Coupon;
  onCopyCode: (id: string, code: string) => void;
  copiedId: string | null;
}) {
  const isAvailable = coupon.status === "available";
  const isUsed = coupon.status === "used";
  const isExpired = coupon.status === "expired";
  const isCopied = copiedId === coupon.id;

  const daysLeft = isAvailable
    ? Math.max(
        0,
        Math.ceil(
          (new Date(coupon.validTo).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24)
        )
      )
    : 0;

  return (
    <div
      className={cn(
        "relative flex overflow-hidden rounded-[var(--radius-lg)] border-2 border-dashed transition-all",
        isAvailable
          ? "border-[var(--primary)]/40 bg-[var(--card)] hover:border-[var(--primary)]/70 hover:shadow-md"
          : "border-[var(--border)] bg-[var(--muted)]/30"
      )}
    >
      {/* Left discount section */}
      <div
        className={cn(
          "flex min-w-[120px] flex-col items-center justify-center px-4 py-5",
          isAvailable
            ? "bg-[var(--primary)]/5"
            : "bg-[var(--muted)]/50"
        )}
      >
        <div
          className={cn(
            "text-center",
            isAvailable
              ? "text-[var(--primary)]"
              : "text-[var(--muted-foreground)]"
          )}
        >
          {coupon.type === "fixed" ? (
            <>
              <span className="text-sm font-medium">¥</span>
              <span className="text-3xl font-bold">{coupon.discount}</span>
            </>
          ) : (
            <>
              <span className="text-3xl font-bold">{coupon.discount}</span>
              <span className="text-sm font-medium">%OFF</span>
            </>
          )}
        </div>
        <p
          className={cn(
            "mt-1 text-xs",
            isAvailable
              ? "text-[var(--primary)]/70"
              : "text-[var(--muted-foreground)]"
          )}
        >
          满¥{coupon.minSpend}可用
        </p>
      </div>

      {/* Dashed vertical separator with circle cutouts */}
      <div className="relative flex items-center">
        <div className="h-full border-l border-dashed border-[var(--border)]" />
        <div className="absolute -left-[5px] -top-[5px] h-2.5 w-2.5 rounded-full bg-[var(--background)]" />
        <div className="absolute -bottom-[5px] -left-[5px] h-2.5 w-2.5 rounded-full bg-[var(--background)]" />
      </div>

      {/* Right info section */}
      <div className="flex flex-1 flex-col justify-between px-4 py-4">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3
              className={cn(
                "text-sm font-semibold",
                isAvailable
                  ? "text-[var(--foreground)]"
                  : "text-[var(--muted-foreground)]"
              )}
            >
              {coupon.name}
            </h3>
            {isUsed && (
              <Badge variant="secondary" className="shrink-0 text-xs">
                已使用
              </Badge>
            )}
            {isExpired && (
              <Badge variant="outline" className="shrink-0 text-xs text-[var(--muted-foreground)]">
                已过期
              </Badge>
            )}
            {isAvailable && daysLeft <= 3 && (
              <Badge variant="destructive" className="shrink-0 text-xs">
                剩{daysLeft}天
              </Badge>
            )}
          </div>
          <p
            className={cn(
              "mt-1 text-xs",
              isAvailable
                ? "text-[var(--muted-foreground)]"
                : "text-[var(--muted-foreground)]/70"
            )}
          >
            {coupon.description}
          </p>
          {coupon.applicableCategories && (
            <div className="mt-1.5 flex gap-1">
              {coupon.applicableCategories.map((cat) => (
                <span
                  key={cat}
                  className="inline-flex items-center gap-0.5 rounded-[var(--radius-sm)] bg-[var(--secondary)] px-1.5 py-0.5 text-[10px] text-[var(--secondary-foreground)]"
                >
                  <Tag className="h-2.5 w-2.5" />
                  {cat}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
            <Clock className="h-3 w-3" />
            <span>
              {isUsed
                ? `使用于 ${coupon.usedAt}`
                : `${coupon.validFrom} ~ ${coupon.validTo}`}
            </span>
          </div>
          {isAvailable && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onCopyCode(coupon.id, coupon.code)}
                className={cn(
                  "flex items-center gap-1 rounded-[var(--radius-sm)] px-2 py-1 text-xs font-medium transition-colors",
                  isCopied
                    ? "bg-[var(--success)]/10 text-[var(--success)]"
                    : "bg-[var(--secondary)] text-[var(--secondary-foreground)] hover:bg-[var(--secondary)]/80"
                )}
              >
                {isCopied ? (
                  <>
                    <Check className="h-3 w-3" />
                    已复制
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    {coupon.code}
                  </>
                )}
              </button>
              <Button size="sm" className="h-7 px-3 text-xs">
                去使用
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Status overlay for used/expired */}
      {(isUsed || isExpired) && (
        <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 -rotate-12 opacity-10">
          {isUsed ? (
            <CheckCircle2 className="h-16 w-16 text-[var(--foreground)]" />
          ) : (
            <XCircle className="h-16 w-16 text-[var(--foreground)]" />
          )}
        </div>
      )}
    </div>
  );
}


export default function CouponsPageContent() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchCoupons = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/coupons");
      const data = await res.json();
      if (data.success) {
        setCoupons(data.coupons.map(mapApiToCoupon));
      } else {
        toast.error(data.message || "获取优惠券列表失败");
      }
    } catch {
      toast.error("网络错误，获取优惠券列表失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  const handleCopyCode = async (id: string, code: string) => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = code;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const now = new Date();
  const availableCoupons = coupons.filter((c) => !c.usedAt && new Date(c.validTo) >= now);
  const usedCoupons = coupons.filter((c) => !!c.usedAt);
  const expiredCoupons = coupons.filter((c) => !c.usedAt && new Date(c.validTo) < now);

  if (loading) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
        <p className="text-sm text-[var(--muted-foreground)]">加载优惠券中...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">
          我的优惠券
        </h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          共 {availableCoupons.length} 张可用优惠券
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="available">
        <TabsList className="w-full sm:w-auto">
          {TAB_CONFIG.map((tab) => {
            const count =
              tab.value === "available"
                ? availableCoupons.length
                : tab.value === "used"
                  ? usedCoupons.length
                  : expiredCoupons.length;
            return (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="flex-1 gap-1.5 sm:flex-initial"
              >
                <tab.icon className="h-3.5 w-3.5" />
                {tab.label}
                <span
                  className={cn(
                    "ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
                    tab.value === "available"
                      ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                      : "bg-[var(--muted)] text-[var(--muted-foreground)]"
                  )}
                >
                  {count}
                </span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="available" className="mt-4">
          {availableCoupons.length === 0 ? (
            <EmptyState
              icon={Ticket}
              title="暂无可用优惠券"
              description="关注商品活动，领取更多优惠券"
              actionLabel="去逛逛"
              onAction={() => (window.location.href = "/products")}
            />
          ) : (
            <div className="space-y-3">
              {availableCoupons.map((coupon) => (
                <CouponCard
                  key={coupon.id}
                  coupon={coupon}
                  onCopyCode={handleCopyCode}
                  copiedId={copiedId}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="used" className="mt-4">
          {usedCoupons.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="暂无已使用的优惠券"
              description="使用优惠券下单后会在这里显示"
            />
          ) : (
            <div className="space-y-3">
              {usedCoupons.map((coupon) => (
                <CouponCard
                  key={coupon.id}
                  coupon={coupon}
                  onCopyCode={handleCopyCode}
                  copiedId={copiedId}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="expired" className="mt-4">
          {expiredCoupons.length === 0 ? (
            <EmptyState
              icon={XCircle}
              title="暂无过期优惠券"
              description="过期的优惠券会在这里显示"
            />
          ) : (
            <div className="space-y-3">
              {expiredCoupons.map((coupon) => (
                <CouponCard
                  key={coupon.id}
                  coupon={coupon}
                  onCopyCode={handleCopyCode}
                  copiedId={copiedId}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
