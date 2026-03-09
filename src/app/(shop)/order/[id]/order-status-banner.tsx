"use client";

import { CheckCircle2, XCircle, RotateCcw, Clock } from "lucide-react";

type OrderStatus = "PENDING" | "PAID" | "DELIVERED" | "CANCELLED" | "REFUNDED" | "EXPIRED";

interface BannerConfig {
  icon: typeof CheckCircle2;
  containerClass: string;
  iconWrapClass: string;
  iconClass: string;
  title: string;
  description: string;
}

const BANNER_CONFIG: Partial<Record<OrderStatus, BannerConfig>> = {
  DELIVERED: {
    icon: CheckCircle2,
    containerClass: "border-[var(--success)]/30 bg-[var(--success)]/5",
    iconWrapClass: "bg-[var(--success)]/15",
    iconClass: "text-[var(--success)]",
    title: "订单已完成，卡密已交付",
    description: "请在下方查看您的卡密信息，建议及时保存或使用",
  },
  CANCELLED: {
    icon: XCircle,
    containerClass: "border-[var(--destructive)]/30 bg-[var(--destructive)]/5",
    iconWrapClass: "bg-[var(--destructive)]/15",
    iconClass: "text-[var(--destructive)]",
    title: "订单已取消",
    description: "该订单已被取消，库存已释放",
  },
  REFUNDED: {
    icon: RotateCcw,
    containerClass: "border-[var(--muted-foreground)]/30 bg-[var(--muted)]/50",
    iconWrapClass: "bg-[var(--muted-foreground)]/15",
    iconClass: "text-[var(--muted-foreground)]",
    title: "订单已退款",
    description: "退款已处理，金额已退回您的账户余额",
  },
  EXPIRED: {
    icon: Clock,
    containerClass: "border-[var(--warning)]/30 bg-[var(--warning)]/5",
    iconWrapClass: "bg-[var(--warning)]/15",
    iconClass: "text-[var(--warning)]",
    title: "订单已过期",
    description: "订单未在规定时间内完成支付，已自动取消",
  },
};

interface OrderStatusBannerProps {
  status: OrderStatus;
}

export function OrderStatusBanner({ status }: OrderStatusBannerProps) {
  const config = BANNER_CONFIG[status];
  if (!config) return null;

  const Icon = config.icon;

  return (
    <div className={`mb-6 flex items-center gap-4 rounded-[var(--radius-lg)] border ${config.containerClass} p-5`}>
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${config.iconWrapClass}`}>
        <Icon className={`h-6 w-6 ${config.iconClass}`} />
      </div>
      <div>
        <p className="text-sm font-semibold text-[var(--foreground)]">
          {config.title}
        </p>
        <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
          {config.description}
        </p>
      </div>
    </div>
  );
}
