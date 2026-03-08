"use client";

import { useState, useEffect, useCallback } from "react";
import {
  RotateCcw,
  Search,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  User,
  ShoppingBag,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import Pagination from "@/components/shared/pagination";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatDateTime } from "@/lib/utils";

type StatusFilter = "all" | "PENDING" | "APPROVED" | "REJECTED";

interface RefundItem {
  id: string;
  orderId: string;
  orderNo: string;
  reason: string;
  status: string;
  adminNote: string | null;
  amount: number;
  createdAt: string;
  updatedAt: string;
  orderStatus: string;
  paymentMethod: string | null;
  products: string;
  user: {
    id: string;
    username: string;
    email: string | null;
    balance: number;
  };
}

const STATUS_MAP: Record<string, { label: string; variant: "default" | "success" | "destructive" }> = {
  PENDING: { label: "待处理", variant: "default" },
  APPROVED: { label: "已通过", variant: "success" },
  REJECTED: { label: "已拒绝", variant: "destructive" },
};

const statusTabs: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "PENDING", label: "待处理" },
  { value: "APPROVED", label: "已通过" },
  { value: "REJECTED", label: "已拒绝" },
];

export default function AdminRefundsContent() {
  const [refunds, setRefunds] = useState<RefundItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Action dialog state
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<"approve" | "reject">("approve");
  const [actionRefund, setActionRefund] = useState<RefundItem | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [processing, setProcessing] = useState(false);

  const fetchRefunds = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (search) params.set("search", search);
      params.set("page", String(page));
      params.set("pageSize", "15");

      const res = await fetch(`/api/admin/refunds?${params}`);
      const data = await res.json();
      if (data.success) {
        setRefunds(data.refunds);
        setTotalPages(data.pagination.totalPages);
        setTotal(data.pagination.total);
      } else {
        setError(data.message || "加载失败");
      }
    } catch {
      setError("网络错误");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search, page]);

  useEffect(() => {
    fetchRefunds();
  }, [fetchRefunds]);

  // Refresh data when tab becomes visible
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") fetchRefunds();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [fetchRefunds]);

  const handleTabChange = (val: string) => {
    setStatusFilter(val as StatusFilter);
    setPage(1);
  };

  const handleSearch = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  const openActionDialog = (refund: RefundItem, action: "approve" | "reject") => {
    setActionRefund(refund);
    setActionType(action);
    setAdminNote("");
    setActionDialogOpen(true);
  };

  const handleAction = async () => {
    if (!actionRefund) return;
    setProcessing(true);
    try {
      const res = await fetch("/api/admin/refunds", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: actionRefund.id,
          action: actionType,
          adminNote: adminNote.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        setActionDialogOpen(false);
        fetchRefunds();
      } else {
        toast.error(data.message || "操作失败");
      }
    } catch {
      toast.error("网络错误");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <RotateCcw className="h-6 w-6 text-[var(--primary)]" />
          退款管理
        </h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          审核和处理用户的退款申请
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={statusFilter} onValueChange={handleTabChange}>
          <TabsList>
            {statusTabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <Input
            placeholder="搜索订单号、用户名..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9 sm:w-64"
          />
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="flex flex-col items-center py-16 text-center">
          <AlertCircle className="mb-4 h-10 w-10 text-[var(--destructive)]" />
          <p className="text-sm text-[var(--muted-foreground)]">{error}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={fetchRefunds}>
            重试
          </Button>
        </div>
      )}

      {/* Refund list */}
      {!loading && !error && (
        <>
          {refunds.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center">
              <RotateCcw className="mb-4 h-10 w-10 text-[var(--muted-foreground)]" />
              <p className="font-medium">暂无退款申请</p>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                {statusFilter !== "all" ? "当前筛选条件下没有退款申请" : "还没有用户提交退款申请"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {refunds.map((refund) => {
                const statusInfo = STATUS_MAP[refund.status] || STATUS_MAP.PENDING;
                return (
                  <div
                    key={refund.id}
                    className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] transition-colors"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3">
                      <div className="flex items-center gap-3 text-sm">
                        <span className="font-mono text-[var(--muted-foreground)]">
                          {refund.orderNo}
                        </span>
                        <span className="text-xs text-[var(--muted-foreground)]">
                          {formatDateTime(refund.createdAt)}
                        </span>
                      </div>
                      <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                    </div>

                    {/* Body */}
                    <div className="px-5 py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1 space-y-2">
                          {/* User info */}
                          <div className="flex items-center gap-2 text-sm">
                            <User className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
                            <span className="font-medium">{refund.user.username}</span>
                            {refund.user.email && (
                              <span className="text-xs text-[var(--muted-foreground)]">
                                ({refund.user.email})
                              </span>
                            )}
                          </div>
                          {/* Products */}
                          <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                            <ShoppingBag className="h-3.5 w-3.5" />
                            <span className="truncate">{refund.products}</span>
                          </div>
                          {/* Reason */}
                          <div className="rounded-[var(--radius-md)] bg-[var(--muted)]/50 px-3 py-2">
                            <p className="text-xs font-medium text-[var(--muted-foreground)]">退款原因：</p>
                            <p className="mt-0.5 text-sm text-[var(--foreground)]">
                              {refund.reason}
                            </p>
                          </div>
                          {/* Admin note */}
                          {refund.adminNote && (
                            <div className="rounded-[var(--radius-md)] border border-[var(--primary)]/20 bg-[var(--primary)]/5 px-3 py-2">
                              <p className="text-xs font-medium text-[var(--primary)]">管理员备注：</p>
                              <p className="mt-0.5 text-sm text-[var(--foreground)]">
                                {refund.adminNote}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Amount + actions */}
                        <div className="flex shrink-0 flex-col items-end gap-2">
                          <span className="text-lg font-bold text-[var(--foreground)]">
                            ¥{refund.amount.toFixed(2)}
                          </span>
                          {refund.status === "PENDING" && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1 text-[var(--success)] hover:text-[var(--success)]"
                                onClick={() => openActionDialog(refund, "approve")}
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                通过
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1 text-[var(--destructive)] hover:text-[var(--destructive)]"
                                onClick={() => openActionDialog(refund, "reject")}
                              >
                                <XCircle className="h-3.5 w-3.5" />
                                拒绝
                              </Button>
                            </div>
                          )}
                          {refund.status !== "PENDING" && (
                            <span className="text-xs text-[var(--muted-foreground)]">
                              处理于 {formatDateTime(refund.updatedAt)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
        </>
      )}

      {/* Action dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionType === "approve" ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-[var(--success)]" />
                  批准退款
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-[var(--destructive)]" />
                  拒绝退款
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {actionType === "approve"
                ? `确认退款 ¥${actionRefund?.amount.toFixed(2)}，金额将退还至用户余额。`
                : "拒绝后用户将收到通知，建议填写拒绝原因。"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {actionRefund && (
              <div className="rounded-[var(--radius-md)] bg-[var(--muted)]/50 px-3 py-2 text-sm">
                <p>
                  <span className="text-[var(--muted-foreground)]">订单：</span>
                  {actionRefund.orderNo}
                </p>
                <p>
                  <span className="text-[var(--muted-foreground)]">用户：</span>
                  {actionRefund.user.username}
                </p>
                <p>
                  <span className="text-[var(--muted-foreground)]">商品：</span>
                  {actionRefund.products}
                </p>
              </div>
            )}
            <Textarea
              placeholder="管理员备注（可选）..."
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialogOpen(false)}>
              取消
            </Button>
            <Button
              variant={actionType === "approve" ? "default" : "destructive"}
              onClick={handleAction}
              disabled={processing}
            >
              {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {actionType === "approve" ? "确认退款" : "确认拒绝"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
