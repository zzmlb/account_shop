import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mock functions ───────────────────────────────────────────────
const mockOrderFindUnique = vi.fn();
const mockOrderUpdate = vi.fn();
const mockCouponFindUnique = vi.fn();

vi.mock("@/server/db", () => ({
  db: {
    order: {
      findUnique: (...args: unknown[]) => mockOrderFindUnique(...args),
      update: (...args: unknown[]) => mockOrderUpdate(...args),
    },
    coupon: {
      findUnique: (...args: unknown[]) => mockCouponFindUnique(...args),
    },
  },
}));

vi.mock("@/lib/rate-limit", () => ({
  apiLimiter: () => ({ success: true, remaining: 10, reset: Date.now() + 60000 }),
  getClientIp: () => "127.0.0.1",
  rateLimitResponse: () => {
    const { NextResponse } = require("next/server");
    return NextResponse.json({ success: false }, { status: 429 });
  },
}));

vi.mock("@/lib/logger", () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

let mockAdminSession: { id: string; role: string } | null = { id: "admin-1", role: "ADMIN" };
vi.mock("@/lib/admin-auth", () => ({
  getAdminSession: () => {
    if (!mockAdminSession) {
      const { NextResponse } = require("next/server");
      return { session: null, error: NextResponse.json({ success: false, message: "未登录" }, { status: 401 }) };
    }
    if (mockAdminSession.role !== "ADMIN") {
      const { NextResponse } = require("next/server");
      return { session: null, error: NextResponse.json({ success: false, message: "无管理员权限" }, { status: 403 }) };
    }
    return { session: mockAdminSession, error: null };
  },
}));

// ─── Import route AFTER mocks ────────────────────────────────────
const { GET, PATCH } = await import("@/app/api/admin/orders/[id]/route");

// ─── Mock data ───────────────────────────────────────────────────
const now = new Date("2026-03-08T10:00:00Z");

const mockOrder = {
  id: "order-1",
  orderNo: "PJ37-20260308-A1B2",
  userId: "user-1",
  email: "buyer@example.com",
  totalAmount: 99.99,
  payAmount: 89.99,
  status: "DELIVERED",
  paymentMethod: "BALANCE",
  paymentId: "pay-1",
  paidAt: now,
  expireAt: now,
  adminNote: null,
  createdAt: now,
  updatedAt: now,
  couponId: "coupon-1",
  user: {
    id: "user-1",
    username: "testuser",
    email: "test@example.com",
    role: "USER",
    balance: 500,
    createdAt: now,
  },
  items: [
    {
      id: "item-1",
      productId: "prod-1",
      quantity: 1,
      unitPrice: 99.99,
      product: {
        id: "prod-1",
        name: "Product",
        slug: "product",
        price: 99.99,
        image: "/img.jpg",
      },
      cardKeys: [
        { id: "ck-1", content: "KEY-001", status: "SOLD", soldAt: now },
      ],
    },
  ],
  refundRequests: [
    {
      id: "ref-1",
      reason: "问题",
      status: "PENDING",
      adminNote: null,
      amount: 99.99,
      createdAt: now,
      updatedAt: now,
    },
  ],
};

const mockCoupon = {
  id: "coupon-1",
  code: "SAVE10",
  type: "PERCENTAGE",
  value: 10,
};

// ─── Tests ───────────────────────────────────────────────────────
describe("Admin Order Detail API — /api/admin/orders/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdminSession = { id: "admin-1", role: "ADMIN" };
  });

  // ──────────────────────────── GET ────────────────────────────

  describe("GET", () => {
    it("1. returns order detail with all includes", async () => {
      mockOrderFindUnique.mockResolvedValue({ ...mockOrder });
      mockCouponFindUnique.mockResolvedValue({ ...mockCoupon });

      const req = new NextRequest("http://localhost/api/admin/orders/order-1");
      const res = await GET(req, { params: Promise.resolve({ id: "order-1" }) });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.order.id).toBe("order-1");
      expect(json.order.orderNo).toBe("PJ37-20260308-A1B2");
      expect(json.order.totalAmount).toBe(99.99);
      expect(json.order.payAmount).toBe(89.99);
      expect(json.order.status).toBe("DELIVERED");
      expect(json.order.user.id).toBe("user-1");
      expect(json.order.user.username).toBe("testuser");
      expect(json.order.user.balance).toBe(500);
      expect(json.order.items).toHaveLength(1);
      expect(json.order.items[0].productName).toBe("Product");
      expect(json.order.items[0].cardKeys).toHaveLength(1);
      expect(json.order.items[0].cardKeys[0].id).toBe("ck-1");
      expect(json.order.refundRequests).toHaveLength(1);
      expect(json.order.refundRequests[0].id).toBe("ref-1");
    });

    it("2. returns 401 when not authenticated", async () => {
      mockAdminSession = null;

      const req = new NextRequest("http://localhost/api/admin/orders/order-1");
      const res = await GET(req, { params: Promise.resolve({ id: "order-1" }) });
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.success).toBe(false);
    });

    it("3. returns 404 when order not found", async () => {
      mockOrderFindUnique.mockResolvedValue(null);

      const req = new NextRequest("http://localhost/api/admin/orders/nonexistent");
      const res = await GET(req, { params: Promise.resolve({ id: "nonexistent" }) });
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.success).toBe(false);
      expect(json.message).toBe("订单不存在");
    });

    it("4. includes coupon info when couponId exists", async () => {
      mockOrderFindUnique.mockResolvedValue({ ...mockOrder });
      mockCouponFindUnique.mockResolvedValue({ ...mockCoupon });

      const req = new NextRequest("http://localhost/api/admin/orders/order-1");
      const res = await GET(req, { params: Promise.resolve({ id: "order-1" }) });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.order.coupon).toEqual({
        id: "coupon-1",
        code: "SAVE10",
        type: "PERCENTAGE",
        value: 10,
      });
      expect(mockCouponFindUnique).toHaveBeenCalledWith({
        where: { id: "coupon-1" },
        select: { id: true, code: true, type: true, value: true },
      });
    });

    it("5. handles null user (guest order)", async () => {
      mockOrderFindUnique.mockResolvedValue({ ...mockOrder, user: null, couponId: null });

      const req = new NextRequest("http://localhost/api/admin/orders/order-1");
      const res = await GET(req, { params: Promise.resolve({ id: "order-1" }) });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.order.user).toBeNull();
      expect(json.order.coupon).toBeNull();
      expect(mockCouponFindUnique).not.toHaveBeenCalled();
    });

    it("6. returns 500 on server error", async () => {
      mockOrderFindUnique.mockRejectedValue(new Error("DB connection failed"));

      const req = new NextRequest("http://localhost/api/admin/orders/order-1");
      const res = await GET(req, { params: Promise.resolve({ id: "order-1" }) });
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.success).toBe(false);
      expect(json.message).toBe("服务器内部错误");
    });
  });

  // ──────────────────────────── PATCH ────────────────────────────

  describe("PATCH", () => {
    it("7. updates adminNote successfully", async () => {
      mockOrderFindUnique.mockResolvedValue({ ...mockOrder });
      mockOrderUpdate.mockResolvedValue({ ...mockOrder, adminNote: "重要订单" });

      const req = new NextRequest("http://localhost/api/admin/orders/order-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminNote: "重要订单" }),
      });
      const res = await PATCH(req, { params: Promise.resolve({ id: "order-1" }) });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.message).toBe("备注已保存");
      expect(mockOrderUpdate).toHaveBeenCalledWith({
        where: { id: "order-1" },
        data: { adminNote: "重要订单" },
      });
    });

    it("8. sets adminNote to null when empty string", async () => {
      mockOrderFindUnique.mockResolvedValue({ ...mockOrder });
      mockOrderUpdate.mockResolvedValue({ ...mockOrder, adminNote: null });

      const req = new NextRequest("http://localhost/api/admin/orders/order-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminNote: "   " }),
      });
      const res = await PATCH(req, { params: Promise.resolve({ id: "order-1" }) });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(mockOrderUpdate).toHaveBeenCalledWith({
        where: { id: "order-1" },
        data: { adminNote: null },
      });
    });

    it("9. returns 400 when adminNote is not a string", async () => {
      const req = new NextRequest("http://localhost/api/admin/orders/order-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminNote: 12345 }),
      });
      const res = await PATCH(req, { params: Promise.resolve({ id: "order-1" }) });
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message).toBe("备注内容无效");
    });

    it("10. returns 400 when adminNote exceeds 1000 characters", async () => {
      const longNote = "a".repeat(1001);

      const req = new NextRequest("http://localhost/api/admin/orders/order-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminNote: longNote }),
      });
      const res = await PATCH(req, { params: Promise.resolve({ id: "order-1" }) });
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message).toBe("备注不能超过1000个字符");
    });

    it("11. returns 404 when order not found for PATCH", async () => {
      mockOrderFindUnique.mockResolvedValue(null);

      const req = new NextRequest("http://localhost/api/admin/orders/nonexistent", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminNote: "some note" }),
      });
      const res = await PATCH(req, { params: Promise.resolve({ id: "nonexistent" }) });
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.success).toBe(false);
      expect(json.message).toBe("订单不存在");
    });
  });
});
