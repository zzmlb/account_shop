import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Mocks — declared BEFORE importing the route handler
// ---------------------------------------------------------------------------

const mockRefundFindMany = vi.fn();
const mockRefundCount = vi.fn();
const mockRefundFindFirst = vi.fn();
const mockRefundCreate = vi.fn();
const mockOrderFindUnique = vi.fn();

vi.mock("@/server/db", () => ({
  db: {
    refundRequest: {
      findMany: (...args: unknown[]) => mockRefundFindMany(...args),
      count: (...args: unknown[]) => mockRefundCount(...args),
      findFirst: (...args: unknown[]) => mockRefundFindFirst(...args),
      create: (...args: unknown[]) => mockRefundCreate(...args),
    },
    order: {
      findUnique: (...args: unknown[]) => mockOrderFindUnique(...args),
    },
  },
}));

const mockGetUserSession = vi.fn();
vi.mock("@/lib/auth", () => ({
  getUserSession: (...args: unknown[]) => mockGetUserSession(...args),
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

const mockStripHtml = vi.fn((s: string) => s.replace(/<[^>]*>/g, ""));
vi.mock("@/lib/sanitize", () => ({
  stripHtml: (...args: unknown[]) => mockStripHtml(...(args as [string])),
}));

vi.mock("@/lib/validators", () => ({
  refundRequestSchema: {
    safeParse: (data: any) => {
      if (!data?.orderId || !data?.reason || data.reason.length < 5) {
        return {
          success: false,
          error: { errors: [{ message: "验证失败" }] },
        };
      }
      return { success: true, data };
    },
  },
  formatZodError: () => "验证失败",
}));

// ---------------------------------------------------------------------------
// Import the route handler AFTER all mocks are in place
// ---------------------------------------------------------------------------

const { GET, POST } = await import("@/app/api/refunds/route");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setupAuth(userId = "user-1") {
  mockGetUserSession.mockReturnValue({
    session: {
      id: userId,
      username: "testuser",
      email: "test@example.com",
      role: "USER",
    },
    error: null,
  });
}

function setupUnauth() {
  const { NextResponse } = require("next/server");
  mockGetUserSession.mockReturnValue({
    session: null,
    error: NextResponse.json(
      { success: false, message: "未登录" },
      { status: 401 }
    ),
  });
}

function makeRequest(
  method: string,
  url = "http://localhost:3000/api/refunds",
  body?: Record<string, unknown>
) {
  if (method === "GET") {
    return new NextRequest(url, { method });
  }
  return new NextRequest(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeMockOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: "order-1",
    userId: "user-1",
    status: "DELIVERED",
    payAmount: 99.99,
    paidAt: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
    updatedAt: new Date(),
    items: [{ product: { afterSaleHours: 24 } }],
    ...overrides,
  };
}

function makeMockRefund(overrides: Record<string, unknown> = {}) {
  const now = new Date();
  return {
    id: "refund-1",
    orderId: "order-1",
    userId: "user-1",
    reason: "商品有问题",
    status: "PENDING",
    amount: 99.99,
    adminNote: null,
    createdAt: now,
    updatedAt: now,
    order: {
      orderNo: "ORD202601010001",
      totalAmount: 99.99,
      payAmount: 99.99,
      status: "DELIVERED",
      items: [{ product: { name: "测试商品", slug: "test-product" } }],
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/refunds", () => {
  it("returns refund list with order details", async () => {
    setupAuth();
    const refunds = [makeMockRefund()];
    mockRefundFindMany.mockResolvedValue(refunds);
    mockRefundCount.mockResolvedValue(1);

    const req = makeRequest("GET");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.refunds).toHaveLength(1);
    expect(data.refunds[0]).toMatchObject({
      id: "refund-1",
      orderId: "order-1",
      orderNo: "ORD202601010001",
      reason: "商品有问题",
      status: "PENDING",
      amount: 99.99,
      orderStatus: "DELIVERED",
      products: "测试商品",
    });
    expect(data.pagination).toMatchObject({
      page: 1,
      total: 1,
      totalPages: 1,
    });
  });

  it("returns 401 when not authenticated", async () => {
    setupUnauth();

    const req = makeRequest("GET");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.success).toBe(false);
  });

  it("shows rejectReason when status is REJECTED", async () => {
    setupAuth();
    const refunds = [
      makeMockRefund({
        status: "REJECTED",
        adminNote: "不符合退款条件",
      }),
    ];
    mockRefundFindMany.mockResolvedValue(refunds);
    mockRefundCount.mockResolvedValue(1);

    const req = makeRequest("GET");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.refunds[0].rejectReason).toBe("不符合退款条件");
  });

  it("does not expose rejectReason when status is not REJECTED", async () => {
    setupAuth();
    const refunds = [
      makeMockRefund({
        status: "PENDING",
        adminNote: "internal note should not leak",
      }),
    ];
    mockRefundFindMany.mockResolvedValue(refunds);
    mockRefundCount.mockResolvedValue(1);

    const req = makeRequest("GET");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.refunds[0].rejectReason).toBeUndefined();
  });
});

describe("POST /api/refunds", () => {
  it("submits refund successfully", async () => {
    setupAuth();
    const order = makeMockOrder();
    mockOrderFindUnique.mockResolvedValue(order);
    mockRefundFindFirst.mockResolvedValue(null); // no existing pending or rejected

    const now = new Date();
    mockRefundCreate.mockResolvedValue({
      id: "refund-new",
      orderId: "order-1",
      userId: "user-1",
      reason: "商品与描述不符",
      status: "PENDING",
      amount: 99.99,
      createdAt: now,
      updatedAt: now,
    });

    const req = makeRequest("POST", "http://localhost:3000/api/refunds", {
      orderId: "order-1",
      reason: "商品与描述不符",
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.refund).toMatchObject({
      id: "refund-new",
      status: "PENDING",
      amount: 99.99,
    });
    expect(mockRefundCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        orderId: "order-1",
        userId: "user-1",
        amount: 99.99,
      }),
    });
  });

  it("returns 401 when not authenticated", async () => {
    setupUnauth();

    const req = makeRequest("POST", "http://localhost:3000/api/refunds", {
      orderId: "order-1",
      reason: "商品与描述不符",
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.success).toBe(false);
  });

  it("returns 400 on validation error", async () => {
    setupAuth();

    const req = makeRequest("POST", "http://localhost:3000/api/refunds", {
      orderId: "",
      reason: "",
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.message).toBe("验证失败");
  });

  it("returns 404 when order not found", async () => {
    setupAuth();
    mockOrderFindUnique.mockResolvedValue(null);

    const req = makeRequest("POST", "http://localhost:3000/api/refunds", {
      orderId: "nonexistent-order",
      reason: "我要退款这个订单",
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.success).toBe(false);
    expect(data.message).toBe("订单不存在");
  });

  it("returns 403 when order doesn't belong to user", async () => {
    setupAuth("user-1");
    const order = makeMockOrder({ userId: "user-other" });
    mockOrderFindUnique.mockResolvedValue(order);

    const req = makeRequest("POST", "http://localhost:3000/api/refunds", {
      orderId: "order-1",
      reason: "我要退款这个订单",
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.success).toBe(false);
    expect(data.message).toBe("无权操作此订单");
  });

  it("returns 400 when order status is not DELIVERED", async () => {
    setupAuth();
    const order = makeMockOrder({ status: "PENDING" });
    mockOrderFindUnique.mockResolvedValue(order);

    const req = makeRequest("POST", "http://localhost:3000/api/refunds", {
      orderId: "order-1",
      reason: "我要退款这个订单",
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.message).toBe("只有已发货的订单才能申请退款");
  });

  it("returns 400 when after-sale window expired", async () => {
    setupAuth();
    // paidAt was 48 hours ago, window is 24 hours
    const order = makeMockOrder({
      paidAt: new Date(Date.now() - 1000 * 60 * 60 * 48),
      items: [{ product: { afterSaleHours: 24 } }],
    });
    mockOrderFindUnique.mockResolvedValue(order);

    const req = makeRequest("POST", "http://localhost:3000/api/refunds", {
      orderId: "order-1",
      reason: "我要退款这个订单",
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.message).toContain("已超过售后时限");
    expect(data.message).toContain("24");
  });

  it("returns 400 when pending refund already exists", async () => {
    setupAuth();
    const order = makeMockOrder();
    mockOrderFindUnique.mockResolvedValue(order);
    // First findFirst call returns an existing pending refund
    mockRefundFindFirst.mockResolvedValueOnce({
      id: "existing-refund",
      status: "PENDING",
    });

    const req = makeRequest("POST", "http://localhost:3000/api/refunds", {
      orderId: "order-1",
      reason: "我要退款这个订单",
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.message).toBe("该订单已有待处理的退款申请");
  });

  it("returns 400 during 24h cooldown after rejection", async () => {
    setupAuth();
    const order = makeMockOrder();
    mockOrderFindUnique.mockResolvedValue(order);
    // First findFirst (pending check) returns null
    mockRefundFindFirst.mockResolvedValueOnce(null);
    // Second findFirst (rejected cooldown check) returns a recent rejection
    mockRefundFindFirst.mockResolvedValueOnce({
      id: "rejected-refund",
      status: "REJECTED",
      updatedAt: new Date(Date.now() - 1000 * 60 * 60), // 1h ago (within 24h)
    });

    const req = makeRequest("POST", "http://localhost:3000/api/refunds", {
      orderId: "order-1",
      reason: "我要再次退款这个订单",
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.message).toBe("退款申请被拒绝后需等待24小时才能重新提交");
  });

  it("strips HTML from reason", async () => {
    setupAuth();
    const order = makeMockOrder();
    mockOrderFindUnique.mockResolvedValue(order);
    mockRefundFindFirst.mockResolvedValue(null);

    const now = new Date();
    mockRefundCreate.mockResolvedValue({
      id: "refund-html",
      orderId: "order-1",
      userId: "user-1",
      reason: "商品有问题alert(1)",
      status: "PENDING",
      amount: 99.99,
      createdAt: now,
      updatedAt: now,
    });

    const req = makeRequest("POST", "http://localhost:3000/api/refunds", {
      orderId: "order-1",
      reason: "<b>商品有问题</b><script>alert(1)</script>",
    });
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mockStripHtml).toHaveBeenCalledWith(
      "<b>商品有问题</b><script>alert(1)</script>"
    );
    expect(mockRefundCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        reason: expect.any(String),
      }),
    });
  });

  it("uses order.payAmount as refund amount", async () => {
    setupAuth();
    const order = makeMockOrder({ payAmount: 188.88 });
    mockOrderFindUnique.mockResolvedValue(order);
    mockRefundFindFirst.mockResolvedValue(null);

    const now = new Date();
    mockRefundCreate.mockResolvedValue({
      id: "refund-amount",
      orderId: "order-1",
      userId: "user-1",
      reason: "退款金额测试理由",
      status: "PENDING",
      amount: 188.88,
      createdAt: now,
      updatedAt: now,
    });

    const req = makeRequest("POST", "http://localhost:3000/api/refunds", {
      orderId: "order-1",
      reason: "退款金额测试理由",
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.refund.amount).toBe(188.88);
    expect(mockRefundCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        amount: 188.88,
      }),
    });
  });
});
