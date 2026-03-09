// ---------------------------------------------------------------------------
// Shared types and constants for admin order management
// ---------------------------------------------------------------------------

export type OrderStatus =
  | "PENDING"
  | "PAID"
  | "DELIVERED"
  | "CANCELLED"
  | "REFUNDED"
  | "EXPIRED";

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  quantity: number;
  unitPrice: number;
  cardKeys?: Array<{
    id: string;
    content: string;
    status: string;
    soldAt: string | null;
  }>;
}

export interface Order {
  id: string;
  orderNo: string;
  userId: string | null;
  user: {
    id: string;
    username: string;
    email: string | null;
  } | null;
  email: string | null;
  totalAmount: number;
  payAmount: number;
  status: OrderStatus;
  paymentMethod: string | null;
  paymentId: string | null;
  paidAt: string | null;
  expireAt: string;
  couponId: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
}

export const statusConfig: Record<
  OrderStatus,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline" | "success";
    className?: string;
  }
> = {
  PENDING: {
    label: "待支付",
    variant: "outline",
    className: "border-[var(--warning)] text-[var(--warning)]",
  },
  PAID: { label: "已支付", variant: "default" },
  DELIVERED: { label: "已完成", variant: "success" },
  CANCELLED: { label: "已取消", variant: "secondary" },
  REFUNDED: { label: "已退款", variant: "destructive" },
  EXPIRED: { label: "已过期", variant: "secondary" },
};

export const paymentMethodMap: Record<string, string> = {
  balance: "余额",
  alipay: "支付宝",
  wechat: "微信",
  usdt: "USDT",
};

export function formatPaymentMethod(method: string | null): string {
  if (!method) return "-";
  return paymentMethodMap[method] || method;
}
