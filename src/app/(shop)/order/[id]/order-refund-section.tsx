"use client";

import { useState, useEffect } from "react";
import {
  Clock,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { apiFetch, apiMutate } from "@/lib/api-fetch";

/* ---------- Props ---------- */

interface OrderRefundSectionProps {
  orderId: string;
  orderNo: string;
  status: string;
  payAmount: number;
}

/* ---------- Component ---------- */

export function OrderRefundSection({
  orderId,
  orderNo,
  status,
  payAmount,
}: OrderRefundSectionProps) {
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [refundReason, setRefundReason] = useState("");
  const [refundSubmitting, setRefundSubmitting] = useState(false);
  const [refundStatus, setRefundStatus] = useState<string | null>(null);

  // Check if there's already a refund request
  useEffect(() => {
    if (status !== "DELIVERED") return;
    const controller = new AbortController();
    async function checkRefund() {
      try {
        const data = await apiFetch<{
          refunds: Array<{ orderNo: string; status: string }>;
        }>("/api/refunds", { signal: controller.signal });
        const match = data.refunds.find((r) => r.orderNo === orderNo);
        if (match) setRefundStatus(match.status);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
    }
    checkRefund();
    return () => controller.abort();
  }, [status, orderNo]);

  const handleRefundRequest = async () => {
    if (refundReason.trim().length < 5) return;
    setRefundSubmitting(true);
    try {
      await apiMutate("/api/refunds", "POST", {
        orderId,
        reason: refundReason.trim(),
      });
      toast.success("退款申请已提交");
      setRefundDialogOpen(false);
      setRefundReason("");
      setRefundStatus("PENDING");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "网络错误，请稍后重试"
      );
    } finally {
      setRefundSubmitting(false);
    }
  };

  if (status !== "DELIVERED") return null;

  return (
    <>
      <div className="mt-6 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[var(--foreground)]">
              售后服务
            </h3>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              如卡密存在问题，可在售后时限内申请退款
            </p>
          </div>
          {refundStatus === "PENDING" ? (
            <Badge variant="outline" className="gap-1.5">
              <Clock className="h-3 w-3" />
              退款审核中
            </Badge>
          ) : refundStatus === "APPROVED" ? (
            <Badge variant="success" className="gap-1.5">
              <CheckCircle2 className="h-3 w-3" />
              退款已通过
            </Badge>
          ) : refundStatus === "REJECTED" ? (
            <Badge variant="destructive" className="gap-1.5">
              <XCircle className="h-3 w-3" />
              退款被拒绝
            </Badge>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRefundDialogOpen(true)}
              className="gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              申请退款
            </Button>
          )}
        </div>
      </div>

      <Dialog open={refundDialogOpen} onOpenChange={setRefundDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-[var(--primary)]" />
              申请退款
            </DialogTitle>
            <DialogDescription>
              请详细描述退款原因，我们将在24小时内审核处理。 退款金额：¥
              {payAmount.toFixed(2)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="请描述退款原因，至少5个字符..."
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-[var(--muted-foreground)]">
              {refundReason.length}/500
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRefundDialogOpen(false)}
            >
              取消
            </Button>
            <Button
              onClick={handleRefundRequest}
              disabled={refundSubmitting || refundReason.trim().length < 5}
            >
              {refundSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="mr-2 h-4 w-4" />
              )}
              提交申请
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
