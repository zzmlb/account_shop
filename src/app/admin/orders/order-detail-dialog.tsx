"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Package,
  RotateCcw,
  XCircle,
  Truck,
  Copy,
  Mail,
  Clock,
  Key,
  User,
  CreditCard,
} from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { type Order, type OrderStatus, statusConfig, formatPaymentMethod } from "./order-types";

export interface OrderDetailDialogProps {
  detailOrder: Order | null;
  onClose: () => void;
  confirmAction: {
    orderId: string;
    orderNo: string;
    status: "DELIVERED" | "REFUNDED" | "CANCELLED";
  } | null;
  onConfirmAction: (action: {
    orderId: string;
    orderNo: string;
    status: "DELIVERED" | "REFUNDED" | "CANCELLED";
  } | null) => void;
  onUpdateStatus: (
    orderId: string,
    newStatus: "DELIVERED" | "REFUNDED" | "CANCELLED"
  ) => void;
}

export function OrderDetailDialog({
  detailOrder,
  onClose,
  confirmAction,
  onConfirmAction,
  onUpdateStatus,
}: OrderDetailDialogProps) {
  return (
    <>
      {/* Order Detail Dialog */}
      <Dialog open={!!detailOrder} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {detailOrder && (() => {
            const status = statusConfig[detailOrder.status] ?? {
              label: detailOrder.status,
              variant: "outline" as const,
            };
            const displayEmail = detailOrder.user?.email || detailOrder.email || "-";
            const displayName = detailOrder.user?.username || "游客";
            const totalQty = detailOrder.items.reduce((s, i) => s + i.quantity, 0);

            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-3">
                    <span>订单详情</span>
                    <Badge variant={status.variant} className={status.className}>
                      {status.label}
                    </Badge>
                  </DialogTitle>
                </DialogHeader>

                {/* Order info grid */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-[var(--muted-foreground)]" />
                    <div>
                      <p className="text-[var(--muted-foreground)]">订单号</p>
                      <p className="font-mono font-medium flex items-center gap-1">
                        {detailOrder.orderNo}
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(detailOrder.orderNo);
                            toast.success("已复制订单号");
                          }}
                          className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-[var(--muted-foreground)]" />
                    <div>
                      <p className="text-[var(--muted-foreground)]">用户</p>
                      <p className="font-medium">{displayName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-[var(--muted-foreground)]" />
                    <div>
                      <p className="text-[var(--muted-foreground)]">邮箱</p>
                      <p className="font-medium">{displayEmail}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-[var(--muted-foreground)]" />
                    <div>
                      <p className="text-[var(--muted-foreground)]">支付方式</p>
                      <p className="font-medium">{formatPaymentMethod(detailOrder.paymentMethod)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-[var(--muted-foreground)]" />
                    <div>
                      <p className="text-[var(--muted-foreground)]">创建时间</p>
                      <p className="font-medium">{formatDateTime(detailOrder.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-[var(--muted-foreground)]" />
                    <div>
                      <p className="text-[var(--muted-foreground)]">支付时间</p>
                      <p className="font-medium">{detailOrder.paidAt ? formatDateTime(detailOrder.paidAt) : "-"}</p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Order items */}
                <div>
                  <h4 className="mb-3 text-sm font-semibold text-[var(--foreground)]">
                    商品明细（{totalQty} 件）
                  </h4>
                  <div className="space-y-3">
                    {detailOrder.items.map((item) => (
                      <div key={item.id} className="rounded-[var(--radius-md)] border border-[var(--border)] p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">{item.productName}</span>
                          <span className="text-sm">
                            ¥{item.unitPrice.toFixed(2)} x {item.quantity} ={" "}
                            <span className="font-semibold">
                              ¥{(item.unitPrice * item.quantity).toFixed(2)}
                            </span>
                          </span>
                        </div>

                        {/* Card keys for delivered orders */}
                        {item.cardKeys && item.cardKeys.length > 0 && (
                          <div className="mt-2 space-y-1">
                            <div className="flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
                              <Key className="h-3 w-3" />
                              <span>卡密信息</span>
                              <button
                                onClick={() => {
                                  const keys = item.cardKeys ?? [];
                                  const text = keys.map((ck) => ck.content).join("\n");
                                  navigator.clipboard.writeText(text);
                                  toast.success(`已复制 ${keys.length} 个卡密`);
                                }}
                                className="ml-auto text-[var(--primary)] hover:underline"
                              >
                                复制全部
                              </button>
                            </div>
                            {item.cardKeys.map((ck, idx) => (
                              <div
                                key={ck.id}
                                className="flex items-center justify-between rounded bg-[var(--muted)]/50 px-2 py-1 font-mono text-xs"
                              >
                                <span>
                                  {idx + 1}. {ck.content}
                                </span>
                                <Badge variant="outline" className="text-[10px] px-1 py-0">
                                  {ck.status === "SOLD" ? "已售" : ck.status}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Price summary */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[var(--muted-foreground)]">商品总额</span>
                    <span>¥{detailOrder.totalAmount.toFixed(2)}</span>
                  </div>
                  {detailOrder.couponId && detailOrder.totalAmount !== detailOrder.payAmount && (
                    <div className="flex justify-between text-[var(--success)]">
                      <span>优惠折扣</span>
                      <span>-¥{(detailOrder.totalAmount - detailOrder.payAmount).toFixed(2)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between font-semibold text-base">
                    <span>实付金额</span>
                    <span className="text-[var(--primary)]">¥{detailOrder.payAmount.toFixed(2)}</span>
                  </div>
                </div>

                {/* Quick actions */}
                <div className="flex gap-2 pt-2">
                  {detailOrder.status === "PAID" && (
                    <Button
                      size="sm"
                      className="gap-1.5"
                      onClick={() => {
                        onConfirmAction({ orderId: detailOrder.id, orderNo: detailOrder.orderNo, status: "DELIVERED" });
                        onClose();
                      }}
                    >
                      <Truck className="h-4 w-4" />
                      手动发货
                    </Button>
                  )}
                  {(detailOrder.status === "PAID" || detailOrder.status === "DELIVERED") && (
                    <Button
                      size="sm"
                      variant="destructive"
                      className="gap-1.5"
                      onClick={() => {
                        onConfirmAction({ orderId: detailOrder.id, orderNo: detailOrder.orderNo, status: "REFUNDED" });
                        onClose();
                      }}
                    >
                      <RotateCcw className="h-4 w-4" />
                      退款
                    </Button>
                  )}
                  {(detailOrder.status === "PENDING" || detailOrder.status === "PAID") && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-[var(--destructive)]"
                      onClick={() => {
                        onConfirmAction({ orderId: detailOrder.id, orderNo: detailOrder.orderNo, status: "CANCELLED" });
                        onClose();
                      }}
                    >
                      <XCircle className="h-4 w-4" />
                      取消订单
                    </Button>
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Confirmation dialog for order status changes */}
      <Dialog open={!!confirmAction} onOpenChange={(open) => !open && onConfirmAction(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {confirmAction?.status === "DELIVERED" && "确认发货"}
              {confirmAction?.status === "REFUNDED" && "确认退款"}
              {confirmAction?.status === "CANCELLED" && "确认取消"}
            </DialogTitle>
            <DialogDescription>
              {confirmAction?.status === "DELIVERED" &&
                `确定要将订单 ${confirmAction.orderNo} 标记为已发货吗？系统将自动分配卡密。`}
              {confirmAction?.status === "REFUNDED" &&
                `确定要对订单 ${confirmAction.orderNo} 进行退款吗？退款后余额将返还给用户。`}
              {confirmAction?.status === "CANCELLED" &&
                `确定要取消订单 ${confirmAction.orderNo} 吗？取消后库存将被释放。`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => onConfirmAction(null)}>
              返回
            </Button>
            <Button
              variant={confirmAction?.status === "DELIVERED" ? "default" : "destructive"}
              onClick={() => {
                if (confirmAction) {
                  onUpdateStatus(confirmAction.orderId, confirmAction.status);
                  onConfirmAction(null);
                }
              }}
            >
              {confirmAction?.status === "DELIVERED" && "确认发货"}
              {confirmAction?.status === "REFUNDED" && "确认退款"}
              {confirmAction?.status === "CANCELLED" && "确认取消"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
