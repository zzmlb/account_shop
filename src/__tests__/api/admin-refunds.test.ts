import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Mock functions — declared BEFORE importing the route handler
// ---------------------------------------------------------------------------

const mockRefundFindMany = vi.fn();
const mockRefundFindUnique = vi.fn();
const mockRefundCount = vi.fn();
const mockRefundAggregate = vi.fn();
const mockRefundUpdate = vi.fn();
const mockRefundUpdateMany = vi.fn();
const mockOrderUpdate = vi.fn();
const mockUserUpdate = vi.fn();
const mockBalanceLogCreate = vi.fn();
const mockCouponUpdate = vi.fn();
const mock$transaction = vi.fn().mockImplementation(async (fn) =>
  fn({
    refundRequest: {
      findUnique: mockRefundFindUnique,
      update: mockRefundUpdate,
    },
    order: { update: mockOrderUpdate },
    user: { update: mockUserUpdate },
    balanceLog: { create: mockBalanceLogCreate },
    coupon: { update: mockCouponUpdate },
  })
);

vi.mock("@/server/db", () => ({
  db: {
    refundRequest: {
      findMany: (...args: unknown[]) => mockRefundFindMany(...args),
      findUnique: (...args: unknown[]) => mockRefundFindUnique(...args),
      count: (...args: unknown[]) => mockRefundCount(...args),
      aggregate: (...args: unknown[]) => mockRefundAggregate(...args),
      update: (...args: unknown[]) => mockRefundUpdate(...args),
      updateMany: (...args: unknown[]) => mockRefundUpdateMany(...args),
    },
    order: {
      update: (...args: unknown[]) => mockOrderUpdate(...args),
    },
    user: {
      update: (...args: unknown[]) => mockUserUpdate(...args),
    },
    balanceLog: {
      create: (...args: unknown[]) => mockBalanceLogCreate(...args),
    },
    coupon: {
      update: (...args: unknown[]) => mockCouponUpdate(...args),
    },
    $transaction: (...args: unknown[]) => mock$transaction(...args),
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
      return { session: null, error: NextResponse.json({ success: false, message: "无权限" }, { status: 403 }) };
    }
    return { session: mockAdminSession, error: null };
  },
}));

vi.mock("@/lib/pagination", () => ({
  parsePagination: (_sp: URLSearchParams, opts: { pageSize: number }) => ({
    page: Number(_sp.get("page")) || 1,
    pageSize: opts.pageSize,
  }),
  paginationMeta: (total: number, page: number, pageSize: number) => ({
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }),
}));

vi.mock("@/lib/sanitize", () => ({
  stripHtml: (s: string) => s.replace(/<[^>]*>/g, ""),
}));

vi.mock("@/server/services/email", () => ({
  sendRefundNotification: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/server/services/notification", () => ({
  createNotification: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Import route handlers AFTER all mocks are in place
// ---------------------------------------------------------------------------

const { GET, PUT, PATCH } = await import("@/app/api/admin/refunds/route");

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const mockRefund = {
  id: "ref-1",
  orderId: "order-1",
  userId: "user-1",
  amount: 99.99,
  reason: "商品有问题",
  status: "PENDING",
  adminNote: null,
  createdAt: new Date("2026-03-08T10:00:00Z"),
  updatedAt: new Date("2026-03-08T10:00:00Z"),
  order: {
    id: "order-1",
    orderNo: "PJ37-20260308-A1B2",
    userId: "user-1",
    payAmount: 99.99,
    totalAmount: 99.99,
    status: "DELIVERED",
    email: "buyer@example.com",
    couponId: null,
    paymentMethod: "BALANCE",
    createdAt: new Date("2026-03-07T10:00:00Z"),
    items: [{ product: { name: "Test Product" } }],
  },
  user: { id: "user-1", username: "testuser", email: "testuser@example.com", balance: 500 },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setupDefaultGetMocks(refunds = [mockRefund], total = 1) {
  mockRefundCount
    .mockResolvedValueOnce(2)   // pendingCount
    .mockResolvedValueOnce(1)   // rejectedCount
    .mockResolvedValueOnce(total); // total (filtered count)
  mockRefundAggregate.mockResolvedValue({
    _sum: { amount: 199.98 },
    _count: 3,
  });
  mockRefundFindMany.mockResolvedValue(refunds);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Admin Refunds API — /api/admin/refunds", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdminSession = { id: "admin-1", role: "ADMIN" };
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GET
  // ═══════════════════════════════════════════════════════════════════════════

  describe("GET", () => {
    it("1. returns refund list with stats and pagination", async () => {
      setupDefaultGetMocks();

      const req = new NextRequest("http://localhost/api/admin/refunds");
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);

      // Refunds array
      expect(json.refunds).toHaveLength(1);
      expect(json.refunds[0]).toMatchObject({
        id: "ref-1",
        orderId: "order-1",
        orderNo: "PJ37-20260308-A1B2",
        reason: "商品有问题",
        status: "PENDING",
        adminNote: null,
        amount: 99.99,
        orderStatus: "DELIVERED",
        paymentMethod: "BALANCE",
        products: "Test Product",
        user: {
          id: "user-1",
          username: "testuser",
          email: "testuser@example.com",
          balance: 500,
        },
      });

      // Stats
      expect(json.stats).toMatchObject({
        pendingCount: 2,
        approvedCount: 3,
        approvedAmount: 199.98,
        rejectedCount: 1,
      });

      // Pagination
      expect(json.pagination).toMatchObject({
        total: 1,
        page: 1,
        pageSize: 20,
      });
    });

    it("2. returns 401 when not authenticated", async () => {
      mockAdminSession = null;

      const req = new NextRequest("http://localhost/api/admin/refunds");
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.success).toBe(false);
      expect(json.message).toBe("未登录");
    });

    it("3. returns 403 for non-admin", async () => {
      mockAdminSession = { id: "user-1", role: "USER" };

      const req = new NextRequest("http://localhost/api/admin/refunds");
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.success).toBe(false);
      expect(json.message).toBe("无权限");
    });

    it("4. filters by status (PENDING, APPROVED, REJECTED)", async () => {
      setupDefaultGetMocks([], 0);

      const req = new NextRequest("http://localhost/api/admin/refunds?status=PENDING");
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);

      const findManyCall = mockRefundFindMany.mock.calls[0][0];
      expect(findManyCall.where.status).toBe("PENDING");
    });

    it("5. filters by search term", async () => {
      setupDefaultGetMocks([], 0);

      const req = new NextRequest("http://localhost/api/admin/refunds?search=testuser");
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);

      const findManyCall = mockRefundFindMany.mock.calls[0][0];
      expect(findManyCall.where.OR).toBeDefined();
      expect(findManyCall.where.OR).toHaveLength(4);
      expect(findManyCall.where.OR[0]).toEqual({
        order: { orderNo: { contains: "testuser", mode: "insensitive" } },
      });
      expect(findManyCall.where.OR[1]).toEqual({
        user: { username: { contains: "testuser", mode: "insensitive" } },
      });
      expect(findManyCall.where.OR[2]).toEqual({
        user: { email: { contains: "testuser", mode: "insensitive" } },
      });
      expect(findManyCall.where.OR[3]).toEqual({
        reason: { contains: "testuser", mode: "insensitive" },
      });
    });

    it("6. returns 500 on error", async () => {
      mockRefundCount.mockRejectedValue(new Error("DB failure"));

      const req = new NextRequest("http://localhost/api/admin/refunds");
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.success).toBe(false);
      expect(json.message).toBe("服务器内部错误");
    });

    it("7. calculates approvalRate correctly", async () => {
      // approvedCount=6, rejectedCount=4 => totalProcessed=10 => approvalRate=60%
      mockRefundCount
        .mockResolvedValueOnce(5)   // pendingCount
        .mockResolvedValueOnce(4)   // rejectedCount
        .mockResolvedValueOnce(0);  // total (filtered)
      mockRefundAggregate.mockResolvedValue({
        _sum: { amount: 600 },
        _count: 6,
      });
      mockRefundFindMany.mockResolvedValue([]);

      const req = new NextRequest("http://localhost/api/admin/refunds");
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.stats.approvedCount).toBe(6);
      expect(json.stats.rejectedCount).toBe(4);
      expect(json.stats.approvalRate).toBe(60); // Math.round((6 / 10) * 100)
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PUT
  // ═══════════════════════════════════════════════════════════════════════════

  describe("PUT", () => {
    it("8. approves refund — refunds balance, updates order status, creates balance log", async () => {
      // The outer findUnique (before transaction)
      mockRefundFindUnique
        .mockResolvedValueOnce({ ...mockRefund })
        // The inner findUnique (inside transaction, re-validation)
        .mockResolvedValueOnce({ ...mockRefund });

      mockRefundUpdate.mockResolvedValue({ ...mockRefund, status: "APPROVED" });
      mockOrderUpdate.mockResolvedValue({});
      mockUserUpdate.mockResolvedValue({});
      mockBalanceLogCreate.mockResolvedValue({});

      const req = new NextRequest("http://localhost/api/admin/refunds", {
        method: "PUT",
        body: JSON.stringify({ id: "ref-1", action: "approve", adminNote: "Looks good" }),
      });

      const res = await PUT(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.message).toContain("退款已批准");
      expect(json.message).toContain("99.99");

      // Transaction was called
      expect(mock$transaction).toHaveBeenCalledTimes(1);

      // Inside the transaction callback: verify the calls were made
      // refundRequest.update with APPROVED status
      expect(mockRefundUpdate).toHaveBeenCalledWith({
        where: { id: "ref-1" },
        data: { status: "APPROVED", adminNote: "Looks good" },
      });

      // order.update to REFUNDED
      expect(mockOrderUpdate).toHaveBeenCalledWith({
        where: { id: "order-1" },
        data: { status: "REFUNDED" },
      });

      // user.update with balance increment
      expect(mockUserUpdate).toHaveBeenCalledWith({
        where: { id: "user-1" },
        data: { balance: { increment: 99.99 } },
      });

      // balanceLog.create
      expect(mockBalanceLogCreate).toHaveBeenCalledWith({
        data: {
          userId: "user-1",
          amount: 99.99,
          type: "REFUND",
          description: "退款申请通过 - 订单 PJ37-20260308-A1B2",
          relatedId: "order-1",
        },
      });
    });

    it("9. approves refund with coupon — decrements coupon usage", async () => {
      const refundWithCoupon = {
        ...mockRefund,
        order: { ...mockRefund.order, couponId: "coupon-1" },
      };

      mockRefundFindUnique
        .mockResolvedValueOnce(refundWithCoupon)   // outer findUnique
        .mockResolvedValueOnce(refundWithCoupon);   // inner findUnique (transaction)

      mockRefundUpdate.mockResolvedValue({ ...refundWithCoupon, status: "APPROVED" });
      mockOrderUpdate.mockResolvedValue({});
      mockUserUpdate.mockResolvedValue({});
      mockBalanceLogCreate.mockResolvedValue({});
      mockCouponUpdate.mockResolvedValue({});

      const req = new NextRequest("http://localhost/api/admin/refunds", {
        method: "PUT",
        body: JSON.stringify({ id: "ref-1", action: "approve" }),
      });

      const res = await PUT(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);

      // coupon.update should be called to decrement usedCount
      expect(mockCouponUpdate).toHaveBeenCalledWith({
        where: { id: "coupon-1" },
        data: { usedCount: { decrement: 1 } },
      });
    });

    it("10. rejects refund — updates status atomically", async () => {
      mockRefundFindUnique.mockResolvedValue({ ...mockRefund });
      mockRefundUpdateMany.mockResolvedValue({ count: 1 });

      const req = new NextRequest("http://localhost/api/admin/refunds", {
        method: "PUT",
        body: JSON.stringify({ id: "ref-1", action: "reject", adminNote: "不符合条件" }),
      });

      const res = await PUT(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.message).toBe("退款申请已拒绝");

      // Uses updateMany for atomic check (where: { id, status: PENDING })
      expect(mockRefundUpdateMany).toHaveBeenCalledWith({
        where: { id: "ref-1", status: "PENDING" },
        data: { status: "REJECTED", adminNote: "不符合条件" },
      });

      // Transaction should NOT be called for reject
      expect(mock$transaction).not.toHaveBeenCalled();
    });

    it("11. returns 400 for missing id/action", async () => {
      const req = new NextRequest("http://localhost/api/admin/refunds", {
        method: "PUT",
        body: JSON.stringify({ id: "ref-1" }), // missing action
      });

      const res = await PUT(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message).toBe("缺少必要参数");
    });

    it("12. returns 400 for invalid action", async () => {
      const req = new NextRequest("http://localhost/api/admin/refunds", {
        method: "PUT",
        body: JSON.stringify({ id: "ref-1", action: "cancel" }),
      });

      const res = await PUT(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message).toBe("无效操作，只能 approve 或 reject");
    });

    it("13. returns 400 for adminNote > 500 chars", async () => {
      const longNote = "a".repeat(501);

      const req = new NextRequest("http://localhost/api/admin/refunds", {
        method: "PUT",
        body: JSON.stringify({ id: "ref-1", action: "approve", adminNote: longNote }),
      });

      const res = await PUT(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message).toBe("管理员备注不能超过500个字符");
    });

    it("14. returns 404 for non-existent refund", async () => {
      mockRefundFindUnique.mockResolvedValue(null);

      const req = new NextRequest("http://localhost/api/admin/refunds", {
        method: "PUT",
        body: JSON.stringify({ id: "nonexistent", action: "approve" }),
      });

      const res = await PUT(req);
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.success).toBe(false);
      expect(json.message).toBe("退款申请不存在");
    });

    it("15. returns 400 for already processed refund", async () => {
      mockRefundFindUnique.mockResolvedValue({
        ...mockRefund,
        status: "APPROVED", // already processed
      });

      const req = new NextRequest("http://localhost/api/admin/refunds", {
        method: "PUT",
        body: JSON.stringify({ id: "ref-1", action: "approve" }),
      });

      const res = await PUT(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message).toBe("该退款申请已处理");
    });

    it("16. returns 400 if ALREADY_PROCESSED thrown in transaction", async () => {
      // Outer findUnique returns PENDING (passes the pre-check)
      mockRefundFindUnique.mockResolvedValueOnce({ ...mockRefund });

      // Transaction callback: inner findUnique returns already-processed status
      mock$transaction.mockImplementationOnce(async (fn) => {
        return fn({
          refundRequest: {
            findUnique: vi.fn().mockResolvedValue({ ...mockRefund, status: "APPROVED" }),
            update: mockRefundUpdate,
          },
          order: { update: mockOrderUpdate },
          user: { update: mockUserUpdate },
          balanceLog: { create: mockBalanceLogCreate },
          coupon: { update: mockCouponUpdate },
        });
      });

      const req = new NextRequest("http://localhost/api/admin/refunds", {
        method: "PUT",
        body: JSON.stringify({ id: "ref-1", action: "approve" }),
      });

      const res = await PUT(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message).toBe("该退款申请已处理");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PATCH
  // ═══════════════════════════════════════════════════════════════════════════

  describe("PATCH", () => {
    it("17. batch rejects refunds", async () => {
      mockRefundUpdateMany.mockResolvedValue({ count: 3 });

      const req = new NextRequest("http://localhost/api/admin/refunds", {
        method: "PATCH",
        body: JSON.stringify({
          ids: ["ref-1", "ref-2", "ref-3"],
          action: "reject",
          adminNote: "批量拒绝",
        }),
      });

      const res = await PATCH(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.affected).toBe(3);
      expect(json.message).toContain("已拒绝 3 个退款申请");

      expect(mockRefundUpdateMany).toHaveBeenCalledWith({
        where: {
          id: { in: ["ref-1", "ref-2", "ref-3"] },
          status: "PENDING",
        },
        data: {
          status: "REJECTED",
          adminNote: "批量拒绝",
        },
      });
    });

    it("18. returns 400 for non-reject action (batch approve not allowed)", async () => {
      const req = new NextRequest("http://localhost/api/admin/refunds", {
        method: "PATCH",
        body: JSON.stringify({
          ids: ["ref-1"],
          action: "approve",
        }),
      });

      const res = await PATCH(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message).toContain("批量操作仅支持拒绝");
    });

    it("19. returns 400 for empty ids array", async () => {
      const req = new NextRequest("http://localhost/api/admin/refunds", {
        method: "PATCH",
        body: JSON.stringify({
          ids: [],
          action: "reject",
        }),
      });

      const res = await PATCH(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message).toBe("请选择至少一个退款申请");
    });

    it("20. returns 400 for ids.length > 50", async () => {
      const ids = Array.from({ length: 51 }, (_, i) => `ref-${i}`);

      const req = new NextRequest("http://localhost/api/admin/refunds", {
        method: "PATCH",
        body: JSON.stringify({
          ids,
          action: "reject",
        }),
      });

      const res = await PATCH(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message).toBe("单次批量操作最多50个");
    });
  });
});
