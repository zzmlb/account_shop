"use client";

import { useState } from "react";
import {
  Package,
  Eye,
  EyeOff,
  Mail,
  Copy,
  Download,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import CopyButton from "@/components/shared/copy-button";
import { apiMutate } from "@/lib/api-fetch";

/* ---------- Helpers ---------- */

function maskCardKey(key: string): string {
  const parts = key.split("-");
  if (parts.length <= 1) {
    if (key.length <= 4) return "****";
    return key.substring(0, 4) + "*".repeat(key.length - 4);
  }
  return parts[0] + "-" + parts.slice(1).map(() => "****").join("-");
}

/* ---------- Props ---------- */

interface OrderCardKeysProps {
  orderId: string;
  orderNo: string;
  email: string;
  createdAt: string;
  status: string;
  cardKeys: string[];
}

/* ---------- Component ---------- */

export function OrderCardKeys({
  orderId,
  orderNo,
  email,
  createdAt,
  status,
  cardKeys,
}: OrderCardKeysProps) {
  const [revealedKeys, setRevealedKeys] = useState<Set<number>>(new Set());
  const [resendingEmail, setResendingEmail] = useState(false);

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

  // Processing indicator - paid but keys not yet delivered
  if (status === "PAID" && cardKeys.length === 0) {
    return (
      <div className="mt-6 rounded-[var(--radius-lg)] border border-[var(--primary)]/30 bg-[var(--primary)]/5 p-6 text-center">
        <Loader2 className="mx-auto mb-2 h-8 w-8 animate-spin text-[var(--primary)]" />
        <h3 className="mb-1 text-sm font-semibold text-[var(--foreground)]">
          卡密正在分配中
        </h3>
        <p className="text-xs text-[var(--muted-foreground)]">
          支付已确认，系统正在自动分配卡密，请稍候片刻...
        </p>
      </div>
    );
  }

  // Edge case: delivered but somehow no keys
  if (status === "DELIVERED" && cardKeys.length === 0) {
    return (
      <div className="mt-6 rounded-[var(--radius-lg)] border border-[var(--warning)]/30 bg-[var(--warning)]/5 p-6 text-center">
        <AlertCircle className="mx-auto mb-2 h-6 w-6 text-[var(--warning)]" />
        <h3 className="mb-1 text-sm font-semibold text-[var(--foreground)]">
          卡密信息暂不可用
        </h3>
        <p className="text-xs text-[var(--muted-foreground)]">
          如长时间未收到卡密，请联系客服处理
        </p>
      </div>
    );
  }

  if (cardKeys.length === 0) return null;

  return (
    <div className="mt-6 rounded-[var(--radius-lg)] border border-[var(--primary)]/30 bg-[var(--primary)]/5 p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-[var(--foreground)]">
          <Package className="h-5 w-5 text-[var(--primary)]" />
          卡密信息 ({cardKeys.length} 个)
        </h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (revealedKeys.size === cardKeys.length) {
              setRevealedKeys(new Set());
            } else {
              setRevealedKeys(new Set(cardKeys.map((_, i) => i)));
            }
          }}
          className="gap-1.5"
        >
          {revealedKeys.size === cardKeys.length ? (
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
        {cardKeys.map((key, index) => {
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
                {isRevealed ? key : maskCardKey(key)}
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

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-[var(--muted-foreground)]">
          卡密信息已同步发送至您的邮箱。请妥善保管卡密，避免泄露。
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const content = cardKeys.map((k, i) => `${i + 1}. ${k}`).join("\n");
              const blob = new Blob(
                [`订单号: ${orderNo}\n日期: ${createdAt}\n\n卡密列表:\n${content}\n`],
                { type: "text/plain;charset=utf-8" }
              );
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `卡密_${orderNo}.txt`;
              a.click();
              URL.revokeObjectURL(url);
              toast.success("卡密文件已下载");
            }}
            className="gap-1.5"
          >
            <Download className="h-3.5 w-3.5" />
            下载
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              navigator.clipboard.writeText(cardKeys.join("\n"));
              toast.success("已复制全部卡密");
            }}
            className="gap-1.5"
          >
            <Copy className="h-3.5 w-3.5" />
            复制全部
          </Button>
          {email && (
            <Button
              variant="outline"
              size="sm"
              disabled={resendingEmail}
              onClick={async () => {
                setResendingEmail(true);
                try {
                  await apiMutate(`/api/orders/${orderId}/resend-email`, "POST");
                  toast.success("卡密已重新发送至邮箱");
                } catch (err) {
                  toast.error(
                    err instanceof Error ? err.message : "网络错误，请稍后重试"
                  );
                } finally {
                  setResendingEmail(false);
                }
              }}
              className="gap-1.5"
            >
              <Mail className="h-3.5 w-3.5" />
              {resendingEmail ? "发送中..." : "重发邮件"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
