import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mock functions ───────────────────────────────────────────────
const mockOrderFindMany = vi.fn();
const mockOrderFindUnique = vi.fn();
const mockOrderCount = vi.fn();
const mockOrderUpdate = vi.fn();
const mockOrderUpdateMany = vi.fn();
const mockOrderAggregate = vi.fn();
const mockUserUpdate = vi.fn();
const mockBalanceLogCreate = vi.fn();
const mockCardKeyFindMany = vi.fn();
const mockCardKeyCount = vi.fn();
const mockCardKeyUpdateMany = vi.fn();
const mockCardKeyGroupBy = vi.fn();
const mockProductUpdate = vi.fn();
const mockTransaction = vi.fn();

vi.mock("@/server/db", () => ({
  db: {
    order: {
      findMany: (...args: unknown[]) => mockOrderFindMany(...args),
      findUnique: (...args: unknown[]) => mockOrderFindUnique(...args),
      count: (...args: unknown[]) => mockOrderCount(...args),
      update: (...args: unknown[]) => mockOrderUpdate(...args),
      updateMany: (...args: unknown[]) => mockOrderUpdateMany(...args),
      aggregate: (...args: unknown[]) => mockOrderAggregate(...args),
    },
    user: {
      update: (...args: unknown[]) => mockUserUpdate(...args),
    },
    balanceLog: {
      create: (...args: unknown[]) => mockBalanceLogCreate(...args),
    },
    cardKey: {
      findMany: (...args: unknown[]) => mockCardKeyFindMany(...args),
      count: (...args: unknown[]) => mockCardKeyCount(...args),
      updateMany: (...args: unknown[]) => mockCardKeyUpdateMany(...args),
      groupBy: (...args: unknown[]) => mockCardKeyGroupBy(...args),
    },
    product: {
      update: (...args: unknown[]) => mockProductUpdate(...args),
    },
    $transaction: (...args: unknown[]) => mockTransaction(...args),
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
    info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(),
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

vi.mock("@/lib/audit", () => ({
  logAdminAction: vi.fn(),
}));

vi.mock("@/lib/crypto", () => ({
  decryptCardKey: (input: string) => "decrypted-" + input,
}));

vi.mock("@/server/services/email", () => ({
  sendCardKeyDelivery: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/server/services/notification", () => ({
  createNotification: vi.fn(),
}));

vi.mock("@/lib/pagination", () => ({
  parsePagination: (_sp: URLSearchParams, opts: { pageSize: number }) => ({
    page: Number(_sp.get("page")) || 1,
    pageSize: opts.pageSize,
  }),
  paginationMeta: (total: number, page: number, pageSize: number) => ({
    total, page, pageSize, totalPages: Math.ceil(total / pageSize),
  }),
}));

// ─── Import route AFTER mocks ────────────────────────────────────
const { GET, PUT, PATCH } = await import(
  "@/app/api/admin/orders/route"
);

// ─── Helpers ─────────────────────────────────────────────────────
const now = new Date();

function buildMockOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: "o1",
    orderNo: "ORD001",
    userId: "u1",
    user: { id: "u1", username: "buyer", email: "buyer@test.com" },
    email: "buyer@test.com",
    totalAmount: 99.99,
    payAmount: 89.99,
    status: "PAID",
    paymentMethod: "balance",
    paymentId: null,
    paidAt: now,
    expireAt: new Date(Date.now() + 3600000),
    couponId: null,
    createdAt: now,
    updatedAt: now,
    items: [
      {
        id: "item1",
        productId: "p1",
        product: { id: "p1", name: "Product", slug: "product" },
        quantity: 1,
        unitPrice: 99.99,
        cardKeys: [],
      },
    ],
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────
describe("Admin Orders API — /api/admin/orders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdminSession = { id: "admin-1", role: "ADMIN" };
  });

  // ──────────────────────────── GET ────────────────────────────

  describe("GET", () => {
    it("1. returns orders list with stats", async () => {
      const order = buildMockOrder();
      mockOrderFindMany.mockResolvedValue([order]);
      mockOrderCount
        .mockResolvedValueOnce(1)   // total
        .mockResolvedValueOnce(3)   // todayOrders
        .mockResolvedValueOnce(2)   // pendingCount
        .mockResolvedValueOnce(5);  // paidCount
      mockOrderAggregate.mockResolvedValue({ _sum: { payAmount: 199.98 } });

      const req = new NextRequest("http://localhost/api/admin/orders");
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.orders).toHaveLength(1);
      expect(json.orders[0].id).toBe("o1");
      expect(json.orders[0].orderNo).toBe("ORD001");
      expect(json.orders[0].totalAmount).toBe(99.99);
      expect(json.orders[0].payAmount).toBe(89.99);
      // Card keys should be empty for PAID status (only shown for DELIVERED/REFUNDED)
      expect(json.orders[0].items[0].cardKeys).toEqual([]);
      expect(json.stats).toEqual({
        todayOrders: 3,
        todayRevenue: 199.98,
        pendingCount: 2,
        paidCount: 5,
      });
      expect(json.pagination).toBeDefined();
      expect(json.pagination.total).toBe(1);
    });

    it("2. filters by status", async () => {
      mockOrderFindMany.mockResolvedValue([]);
      mockOrderCount
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);
      mockOrderAggregate.mockResolvedValue({ _sum: { payAmount: null } });

      const req = new NextRequest("http://localhost/api/admin/orders?status=PENDING");
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);

      const findManyCall = mockOrderFindMany.mock.calls[0][0];
      expect(findManyCall.where.status).toBe("PENDING");
    });

    it("3. filters by search", async () => {
      mockOrderFindMany.mockResolvedValue([]);
      mockOrderCount
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);
      mockOrderAggregate.mockResolvedValue({ _sum: { payAmount: null } });

      const req = new NextRequest("http://localhost/api/admin/orders?search=buyer");
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);

      const findManyCall = mockOrderFindMany.mock.calls[0][0];
      expect(findManyCall.where.OR).toBeDefined();
      expect(findManyCall.where.OR).toHaveLength(4);
      expect(findManyCall.where.OR[0]).toEqual({
        orderNo: { contains: "buyer", mode: "insensitive" },
      });
    });

    it("4. filters by paymentMethod", async () => {
      mockOrderFindMany.mockResolvedValue([]);
      mockOrderCount
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);
      mockOrderAggregate.mockResolvedValue({ _sum: { payAmount: null } });

      const req = new NextRequest("http://localhost/api/admin/orders?paymentMethod=alipay");
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);

      const findManyCall = mockOrderFindMany.mock.calls[0][0];
      expect(findManyCall.where.paymentMethod).toBe("alipay");
    });

    it("5. returns 400 for invalid status", async () => {
      const req = new NextRequest("http://localhost/api/admin/orders?status=INVALID");
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message).toBe("无效的订单状态");
    });

    it("6. returns 401 when not authenticated", async () => {
      mockAdminSession = null;

      const req = new NextRequest("http://localhost/api/admin/orders");
      const res = await GET(req);

      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.success).toBe(false);
    });

    it("7. returns 403 when not admin", async () => {
      mockAdminSession = { id: "user-1", role: "USER" };

      const req = new NextRequest("http://localhost/api/admin/orders");
      const res = await GET(req);

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.success).toBe(false);
    });
  });

  // ──────────────────────────── PUT ────────────────────────────

  describe("PUT", () => {
    it("8. updates order status (normal, PENDING → CANCELLED)", async () => {
      const existing = buildMockOrder({ status: "PENDING" });
      const updated = buildMockOrder({
        status: "CANCELLED",
        items: [
          {
            id: "item1",
            productId: "p1",
            product: { id: "p1", name: "Product", slug: "product" },
            quantity: 1,
            unitPrice: 99.99,
          },
        ],
      });

      mockOrderFindUnique.mockResolvedValue(existing);
      mockOrderUpdate.mockResolvedValue(updated);

      const req = new NextRequest("http://localhost/api/admin/orders?id=o1", {
        method: "PUT",
        body: JSON.stringify({ status: "CANCELLED" }),
      });

      const res = await PUT(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.message).toBe("订单状态已更新");
      expect(json.order.status).toBe("CANCELLED");
    });

    it("9. returns 400 when id missing", async () => {
      const req = new NextRequest("http://localhost/api/admin/orders", {
        method: "PUT",
        body: JSON.stringify({ status: "CANCELLED" }),
      });

      const res = await PUT(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message).toBe("缺少订单ID参数");
    });

    it("10. returns 404 when order not found", async () => {
      mockOrderFindUnique.mockResolvedValue(null);

      const req = new NextRequest("http://localhost/api/admin/orders?id=nonexistent", {
        method: "PUT",
        body: JSON.stringify({ status: "CANCELLED" }),
      });

      const res = await PUT(req);
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.success).toBe(false);
      expect(json.message).toBe("订单不存在");
    });

    it("11. returns 400 when status is same", async () => {
      const existing = buildMockOrder({ status: "PAID" });
      mockOrderFindUnique.mockResolvedValue(existing);

      const req = new NextRequest("http://localhost/api/admin/orders?id=o1", {
        method: "PUT",
        body: JSON.stringify({ status: "PAID" }),
      });

      const res = await PUT(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message).toBe("订单状态未改变");
    });

    it("12. returns 400 for invalid status", async () => {
      const existing = buildMockOrder({ status: "PAID" });
      mockOrderFindUnique.mockResolvedValue(existing);

      const req = new NextRequest("http://localhost/api/admin/orders?id=o1", {
        method: "PUT",
        body: JSON.stringify({ status: "INVALID_STATUS" }),
      });

      const res = await PUT(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message).toContain("无效的订单状态");
    });
  });

  // ──────────────────────────── PATCH ────────────────────────────

  describe("PATCH", () => {
    it("13. batch cancels orders", async () => {
      mockOrderUpdateMany.mockResolvedValue({ count: 2 });

      const req = new NextRequest("http://localhost/api/admin/orders", {
        method: "PATCH",
        body: JSON.stringify({ ids: ["o1", "o2", "o3"], status: "CANCELLED" }),
      });

      const res = await PATCH(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.affected).toBe(2);
      expect(json.message).toContain("已取消 2 个订单");

      // Verify updateMany was called with correct filters
      expect(mockOrderUpdateMany).toHaveBeenCalledWith({
        where: {
          id: { in: ["o1", "o2", "o3"] },
          status: { in: ["PENDING", "PAID"] },
        },
        data: { status: "CANCELLED" },
      });
    });

    it("14. returns 400 for unsupported batch status", async () => {
      const req = new NextRequest("http://localhost/api/admin/orders", {
        method: "PATCH",
        body: JSON.stringify({ ids: ["o1"], status: "REFUNDED" }),
      });

      const res = await PATCH(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message).toBe("批量操作仅支持取消或发货");
    });
  });
});
