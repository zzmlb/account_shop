"use client";

import Link from "next/link";
import {
  Wallet,
  CreditCard,
  Smartphone,
  Bitcoin,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { cn, formatPrice } from "@/lib/utils";

const PAYMENT_METHODS = [
  {
    id: "balance",
    label: "余额支付",
    description: "使用账户余额直接支付",
    icon: Wallet,
    color: "text-[var(--success)]",
    bgColor: "bg-[var(--success)]/10",
  },
  {
    id: "alipay",
    label: "支付宝",
    description: "支持花呗、余额宝",
    icon: CreditCard,
    color: "text-[#1677ff]",
    bgColor: "bg-[#1677ff]/10",
  },
  {
    id: "wechat",
    label: "微信支付",
    description: "微信扫码支付",
    icon: Smartphone,
    color: "text-[#07c160]",
    bgColor: "bg-[#07c160]/10",
  },
  {
    id: "usdt",
    label: "USDT",
    description: "TRC20 / ERC20 链上支付（即将上线）",
    icon: Bitcoin,
    color: "text-[#f7931a]",
    bgColor: "bg-[#f7931a]/10",
    disabled: true,
  },
] as const;

export { PAYMENT_METHODS };

interface CheckoutPaymentMethodsProps {
  selected: string;
  onSelect: (id: string) => void;
  disabled: boolean;
  userBalance?: number;
  cartTotal: number;
}

export function CheckoutPaymentMethods({
  selected,
  onSelect,
  disabled,
  userBalance,
  cartTotal,
}: CheckoutPaymentMethodsProps) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-6">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-[var(--foreground)]">
        <CreditCard className="h-5 w-5 text-[var(--primary)]" />
        支付方式
      </h2>
      <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="支付方式">
        {PAYMENT_METHODS.map((method, idx) => {
          const isDisabled = "disabled" in method && method.disabled;
          const isSelected = selected === method.id;
          return (
            <button
              key={method.id}
              onClick={() => !isDisabled && onSelect(method.id)}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                  e.preventDefault();
                  const next = PAYMENT_METHODS[(idx + 1) % PAYMENT_METHODS.length];
                  if (!("disabled" in next && next.disabled)) onSelect(next.id);
                  (e.currentTarget.parentElement?.children[(idx + 1) % PAYMENT_METHODS.length] as HTMLElement)?.focus();
                } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                  e.preventDefault();
                  const prev = PAYMENT_METHODS[(idx - 1 + PAYMENT_METHODS.length) % PAYMENT_METHODS.length];
                  if (!("disabled" in prev && prev.disabled)) onSelect(prev.id);
                  (e.currentTarget.parentElement?.children[(idx - 1 + PAYMENT_METHODS.length) % PAYMENT_METHODS.length] as HTMLElement)?.focus();
                }
              }}
              disabled={disabled || isDisabled}
              tabIndex={isSelected ? 0 : -1}
              role="radio"
              aria-checked={isSelected}
              aria-label={method.label}
              className={cn(
                "relative flex items-center gap-3 rounded-[var(--radius-md)] border-2 p-4 text-left transition-all",
                isDisabled
                  ? "cursor-not-allowed border-[var(--border)] opacity-50"
                  : isSelected
                    ? "border-[var(--primary)] bg-[var(--primary)]/5"
                    : "border-[var(--border)] bg-transparent hover:border-[var(--primary)]/30 hover:bg-[var(--card-hover)]"
              )}
            >
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-[var(--radius-sm)]",
                  method.bgColor
                )}
              >
                <method.icon className={cn("h-5 w-5", method.color)} />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-[var(--foreground)]">
                  {method.label}
                </div>
                <div className="text-xs text-[var(--muted-foreground)]">
                  {method.description}
                </div>
              </div>
              {/* Radio indicator */}
              <div className="ml-auto flex-shrink-0">
                <div
                  className={cn(
                    "h-5 w-5 rounded-full border-2 transition-all",
                    isSelected
                      ? "border-[var(--primary)] bg-[var(--primary)]"
                      : "border-[var(--muted-foreground)]/30"
                  )}
                >
                  {isSelected && (
                    <div className="flex h-full w-full items-center justify-center">
                      <div className="h-2 w-2 rounded-full bg-white" />
                    </div>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Balance indicator */}
      {selected === "balance" && userBalance != null && (
        <div className={cn(
          "mt-3 rounded-[var(--radius-md)] border px-4 py-2.5",
          userBalance >= cartTotal
            ? "border-[var(--border)] bg-[var(--muted)]/50"
            : "border-[var(--destructive)]/30 bg-[var(--destructive)]/5"
        )}>
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--muted-foreground)]">
              当前余额
            </span>
            <span className={cn(
              "flex items-center gap-1 text-sm font-semibold",
              userBalance >= cartTotal
                ? "text-[var(--success)]"
                : "text-[var(--destructive)]"
            )}>
              {userBalance >= cartTotal ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                <AlertTriangle className="h-3.5 w-3.5" />
              )}
              {formatPrice(userBalance)}
            </span>
          </div>
          {userBalance < cartTotal && (
            <div className="mt-1.5 flex items-center justify-between text-xs">
              <span className="text-[var(--destructive)]">
                余额不足，还需 {formatPrice(cartTotal - userBalance)}
              </span>
              <Link
                href="/dashboard/balance"
                className="font-medium text-[var(--primary)] hover:underline"
              >
                去充值
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
