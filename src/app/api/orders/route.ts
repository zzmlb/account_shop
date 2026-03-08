import { NextRequest, NextResponse } from "next/server";

interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

interface Order {
  id: string;
  orderNo: string;
  userId: string;
  items: OrderItem[];
  totalAmount: number;
  status: "pending" | "paid" | "processing" | "completed" | "cancelled" | "refunded";
  paymentMethod: "alipay" | "wechat" | "crypto" | "balance";
  createdAt: string;
}

const MOCK_ORDERS: Order[] = [
  {
    id: "ord_001",
    orderNo: "PJ37-20260301-0001",
    userId: "usr_001",
    items: [{ productId: "prod_001", productName: "Gmail 全新账号", quantity: 2, unitPrice: 5.99 }],
    totalAmount: 11.98,
    status: "completed",
    paymentMethod: "alipay",
    createdAt: "2026-03-01T10:30:00Z",
  },
  {
    id: "ord_002",
    orderNo: "PJ37-20260301-0002",
    userId: "usr_001",
    items: [{ productId: "prod_005", productName: "Netflix 高级会员 1 个月", quantity: 1, unitPrice: 15.99 }],
    totalAmount: 15.99,
    status: "completed",
    paymentMethod: "wechat",
    createdAt: "2026-03-01T14:22:00Z",
  },
  {
    id: "ord_003",
    orderNo: "PJ37-20260302-0001",
    userId: "usr_002",
    items: [{ productId: "prod_003", productName: "Twitter / X 高质量账号", quantity: 1, unitPrice: 29.99 }],
    totalAmount: 29.99,
    status: "paid",
    paymentMethod: "crypto",
    createdAt: "2026-03-02T09:15:00Z",
  },
  {
    id: "ord_004",
    orderNo: "PJ37-20260302-0002",
    userId: "usr_001",
    items: [
      { productId: "prod_009", productName: "ChatGPT Plus 共享账号", quantity: 1, unitPrice: 19.99 },
      { productId: "prod_010", productName: "Adobe Creative Cloud 年订阅", quantity: 1, unitPrice: 129.00 },
    ],
    totalAmount: 148.99,
    status: "processing",
    paymentMethod: "alipay",
    createdAt: "2026-03-02T16:45:00Z",
  },
  {
    id: "ord_005",
    orderNo: "PJ37-20260303-0001",
    userId: "usr_003",
    items: [{ productId: "prod_006", productName: "Spotify Premium 年卡", quantity: 1, unitPrice: 39.99 }],
    totalAmount: 39.99,
    status: "completed",
    paymentMethod: "wechat",
    createdAt: "2026-03-03T11:00:00Z",
  },
  {
    id: "ord_006",
    orderNo: "PJ37-20260304-0001",
    userId: "usr_001",
    items: [{ productId: "prod_011", productName: "NordVPN 2 年套餐", quantity: 1, unitPrice: 59.99 }],
    totalAmount: 59.99,
    status: "pending",
    paymentMethod: "balance",
    createdAt: "2026-03-04T08:30:00Z",
  },
  {
    id: "ord_007",
    orderNo: "PJ37-20260305-0001",
    userId: "usr_002",
    items: [{ productId: "prod_002", productName: "Outlook 企业邮箱", quantity: 5, unitPrice: 12.99 }],
    totalAmount: 64.95,
    status: "completed",
    paymentMethod: "alipay",
    createdAt: "2026-03-05T13:20:00Z",
  },
  {
    id: "ord_008",
    orderNo: "PJ37-20260306-0001",
    userId: "usr_004",
    items: [{ productId: "prod_004", productName: "Instagram 老号带粉", quantity: 1, unitPrice: 45.00 }],
    totalAmount: 45.00,
    status: "cancelled",
    paymentMethod: "wechat",
    createdAt: "2026-03-06T17:10:00Z",
  },
  {
    id: "ord_009",
    orderNo: "PJ37-20260307-0001",
    userId: "usr_001",
    items: [{ productId: "prod_008", productName: "Epic Games 全游戏库账号", quantity: 1, unitPrice: 89.99 }],
    totalAmount: 89.99,
    status: "refunded",
    paymentMethod: "crypto",
    createdAt: "2026-03-07T10:05:00Z",
  },
  {
    id: "ord_010",
    orderNo: "PJ37-20260308-0001",
    userId: "usr_005",
    items: [
      { productId: "prod_001", productName: "Gmail 全新账号", quantity: 10, unitPrice: 5.99 },
      { productId: "prod_012", productName: "ExpressVPN 1 年订阅", quantity: 1, unitPrice: 49.99 },
    ],
    totalAmount: 109.89,
    status: "paid",
    paymentMethod: "alipay",
    createdAt: "2026-03-08T07:45:00Z",
  },
];

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      orders: MOCK_ORDERS,
      total: MOCK_ORDERS.length,
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "服务器内部错误",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { items, paymentMethod } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "订单商品不能为空",
        },
        { status: 400 }
      );
    }

    // Calculate total
    const totalAmount = items.reduce(
      (sum: number, item: OrderItem) => sum + item.unitPrice * item.quantity,
      0
    );

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
    const seq = String(MOCK_ORDERS.length + 1).padStart(4, "0");

    const newOrder: Order = {
      id: `ord_${Date.now()}`,
      orderNo: `PJ37-${dateStr}-${seq}`,
      userId: "usr_001", // Mock: would come from session in production
      items,
      totalAmount: Math.round(totalAmount * 100) / 100,
      status: "pending",
      paymentMethod: paymentMethod || "alipay",
      createdAt: now.toISOString(),
    };

    return NextResponse.json({
      success: true,
      message: "订单创建成功",
      order: newOrder,
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "服务器内部错误",
      },
      { status: 500 }
    );
  }
}
