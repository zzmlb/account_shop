import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Mocks — declared BEFORE importing the route handler
// ---------------------------------------------------------------------------

const mockOrderFindMany = vi.fn();
const mockOrderCount = vi.fn();
const mockOrderCreate = vi.fn();
const mockOrderFindUnique = vi.fn();
const mockProductFindMany = vi.fn();
const mockCouponFindUnique = vi.fn();

vi.mock("@/server/db", () => ({
  db: {
    order: {
      findMany: (...args: unknown[]) => mockOrderFindMany(...args),
      count: (...args: unknown[]) => mockOrderCount(...args),
      create: (...args: unknown[]) => mockOrderCreate(...args),
      findUnique: (...args: unknown[]) => mockOrderFindUnique(...args),
    },
    product: {
      findMany: (...args: unknown[]) => mockProductFindMany(...args),
    },
    coupon: {
      findUnique: (...args: unknown[]) => mockCouponFindUnique(...args),
    },
  },
}));

vi.mock("@/lib/rate-limit", () => ({
  apiLimiter: () => ({ success: true, remaining: 10, reset: Date.now() + 60000 }),
  orderLimiter: () => ({ success: true, remaining: 10, reset: Date.now() + 60000 }),
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

// Mock auth - getUserSession and decodeSession
const mockGetUserSession = vi.fn();
const mockDecodeSession = vi.fn();
vi.mock("@/lib/auth", () => ({
  getUserSession: (...args: unknown[]) => mockGetUserSession(...args),
  decodeSession: (...args: unknown[]) => mockDecodeSession(...args),
}));

// Mock crypto
vi.mock("@/lib/crypto", () => ({
  safeDecryptCardKey: (k: string) => k, // pass through
}));

// Mock validators
vi.mock("@/lib/validators", () => ({
  createOrderSchema: {
    safeParse: (data: any) => {
      if (!data?.items?.length) {
        return { success: false, error: { flatten: () => ({ fieldErrors: {} }) } };
      }
      return { success: true, data };
    },
  },
  formatZodError: () => "验证失败",
}));

// Mock notification and cleanup (fire-and-forget)
vi.mock("@/server/services/notification", () => ({
  notifyAdminsNewOrder: vi.fn(),
}));
vi.mock("@/server/services/order-cleanup", () => ({
  maybeCleanupExpiredOrders: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Import the route handler AFTER all mocks are in place
// ---------------------------------------------------------------------------

const { GET, POST } = await import("@/app/api/orders/route");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setupAuth(userId = "user-1") {
  mockGetUserSession.mockReturnValue({
    session: { id: userId, username: "testuser", email: "test@example.com", role: "USER" },
    error: null,
  });
  mockDecodeSession.mockReturnValue({
    id: userId,
    username: "testuser",
    email: "test@example.com",
    role: "USER",
  });
}

function setupUnauth() {
  const { NextResponse } = require("next/server");
  mockGetUserSession.mockReturnValue({
    session: null,
    error: NextResponse.json({ success: false, message: "未登录" }, { status: 401 }),
  });
  mockDecodeSession.mockReturnValue(null);
}

function createGetRequest(params: Record<string, string> = {}) {
  const url = new URL("http://localhost:3001/api/orders");
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return new NextRequest(url);
}

function createPostRequest(body: unknown, headers?: Record<string, string>) {
  return new NextRequest("http://localhost:3001/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

const mockOrder = {
  id: "order-1",
  orderNo: "PJ37-20250101-ABCD",
  totalAmount: 99.9,
  payAmount: 89.9,
  status: "DELIVERED",
  paymentMethod: "balance",
  email: "test@example.com",
  createdAt: new Date("2025-01-01"),
  paidAt: new Date("2025-01-01"),
  items: [
    {
      product: { name: "Test Product", slug: "test-product" },
      quantity: 1,
      unitPrice: 99.9,
      cardKeys: [{ content: "KEY-1234" }],
    },
  ],
};

const mockProduct = {
  id: "prod-1",
  name: "Test Product",
  slug: "test-product",
  price: 99.9,
  isActive: true,
  stockCount: 10,
};

// ---------------------------------------------------------------------------
// Tests — GET /api/orders
// ---------------------------------------------------------------------------

describe("GET /api/orders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuth();
    mockOrderFindMany.mockResolvedValue([mockOrder]);
    mockOrderCount.mockResolvedValue(1);
  });

  // -----------------------------------------------------------------------
  // 1. Returns user's orders with pagination
  // -----------------------------------------------------------------------

  it("returns user's orders with pagination", async () => {
    const req = createGetRequest();
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.orders).toHaveLength(1);
    expect(data.pagination).toEqual({
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    });

    // Verify the order was queried with the correct userId
    const whereArg = mockOrderFindMany.mock.calls[0][0].where;
    expect(whereArg.userId).toBe("user-1");
  });

  // -----------------------------------------------------------------------
  // 2. Filters by status
  // -----------------------------------------------------------------------

  it("filters by status", async () => {
    const req = createGetRequest({ status: "PENDING" });
    await GET(req);

    const whereArg = mockOrderFindMany.mock.calls[0][0].where;
    expect(whereArg.status).toBe("PENDING");
  });

  it("ignores invalid status values", async () => {
    const req = createGetRequest({ status: "INVALID" });
    await GET(req);

    const whereArg = mockOrderFindMany.mock.calls[0][0].where;
    expect(whereArg.status).toBeUndefined();
  });

  // -----------------------------------------------------------------------
  // 3. Returns 401 for unauthenticated users
  // -----------------------------------------------------------------------

  it("returns 401 for unauthenticated users", async () => {
    setupUnauth();

    const req = createGetRequest();
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.message).toBe("未登录");
  });

  // -----------------------------------------------------------------------
  // 4. Only decrypts card keys for DELIVERED orders
  // -----------------------------------------------------------------------

  it("decrypts card keys for DELIVERED orders", async () => {
    mockOrderFindMany.mockResolvedValue([{ ...mockOrder, status: "DELIVERED" }]);

    const req = createGetRequest();
    const response = await GET(req);
    const data = await response.json();

    expect(data.orders[0].items[0].cardKeys).toEqual(["KEY-1234"]);
  });

  it("decrypts card keys for REFUNDED orders", async () => {
    mockOrderFindMany.mockResolvedValue([{ ...mockOrder, status: "REFUNDED" }]);

    const req = createGetRequest();
    const response = await GET(req);
    const data = await response.json();

    expect(data.orders[0].items[0].cardKeys).toEqual(["KEY-1234"]);
  });

  it("returns empty card keys for PENDING orders", async () => {
    mockOrderFindMany.mockResolvedValue([{ ...mockOrder, status: "PENDING" }]);

    const req = createGetRequest();
    const response = await GET(req);
    const data = await response.json();

    expect(data.orders[0].items[0].cardKeys).toEqual([]);
  });

  it("returns empty card keys for PAID orders", async () => {
    mockOrderFindMany.mockResolvedValue([{ ...mockOrder, status: "PAID" }]);

    const req = createGetRequest();
    const response = await GET(req);
    const data = await response.json();

    expect(data.orders[0].items[0].cardKeys).toEqual([]);
  });

  // -----------------------------------------------------------------------
  // 5. Returns 500 on database error
  // -----------------------------------------------------------------------

  it("returns 500 on database error", async () => {
    mockOrderFindMany.mockRejectedValue(new Error("DB connection failed"));

    const req = createGetRequest();
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.message).toBe("服务器内部错误");
  });

  // -----------------------------------------------------------------------
  // 6. Formats order data correctly
  // -----------------------------------------------------------------------

  it("formats order data correctly", async () => {
    const req = createGetRequest();
    const response = await GET(req);
    const data = await response.json();

    const order = data.orders[0];
    expect(order).toEqual({
      id: "order-1",
      orderNo: "PJ37-20250101-ABCD",
      totalAmount: 99.9,
      payAmount: 89.9,
      status: "DELIVERED",
      paymentMethod: "balance",
      email: "test@example.com",
      createdAt: new Date("2025-01-01").toISOString(),
      paidAt: new Date("2025-01-01").toISOString(),
      items: [
        {
          productName: "Test Product",
          productSlug: "test-product",
          quantity: 1,
          unitPrice: 99.9,
          cardKeys: ["KEY-1234"],
        },
      ],
    });

    // Verify types
    expect(typeof order.totalAmount).toBe("number");
    expect(typeof order.payAmount).toBe("number");
    expect(typeof order.createdAt).toBe("string");
  });
});

// ---------------------------------------------------------------------------
// Tests — POST /api/orders
// ---------------------------------------------------------------------------

describe("POST /api/orders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuth();
  });

  const validBody = {
    items: [{ productId: "prod-1", quantity: 1 }],
    paymentMethod: "balance",
    email: "test@example.com",
  };

  const createdOrder = {
    id: "order-new",
    orderNo: "PJ37-20250101-XXXX",
    totalAmount: 99.9,
    payAmount: 99.9,
    status: "PENDING",
    createdAt: new Date("2025-01-01"),
    expireAt: new Date("2025-01-16"),
    items: [{ product: { name: "Test Product" }, quantity: 1, unitPrice: 99.9 }],
  };

  function setupProductMocks() {
    mockProductFindMany
      .mockResolvedValueOnce([mockProduct]) // byId
      .mockResolvedValueOnce([]); // bySlug
  }

  // -----------------------------------------------------------------------
  // 1. Creates order successfully
  // -----------------------------------------------------------------------

  it("creates order successfully", async () => {
    setupProductMocks();
    mockOrderCreate.mockResolvedValue(createdOrder);

    const req = createPostRequest(validBody);
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.order).toBeDefined();
    expect(data.order.id).toBe("order-new");
    expect(data.order.orderNo).toBe("PJ37-20250101-XXXX");
    expect(data.order.totalAmount).toBe(99.9);
    expect(data.order.payAmount).toBe(99.9);
    expect(data.order.status).toBe("PENDING");
    expect(data.order.items).toHaveLength(1);
    expect(data.order.items[0].productName).toBe("Test Product");
  });

  // -----------------------------------------------------------------------
  // 2. Returns 400 for invalid body
  // -----------------------------------------------------------------------

  it("returns 400 for invalid body (no items)", async () => {
    const req = createPostRequest({ items: [] });
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.message).toBe("验证失败");
  });

  it("returns 400 for malformed JSON body", async () => {
    const req = new NextRequest("http://localhost:3001/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-valid-json",
    });
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.message).toBe("请求格式错误");
  });

  // -----------------------------------------------------------------------
  // 3. Returns 400 for duplicate product IDs
  // -----------------------------------------------------------------------

  it("returns 400 for duplicate product IDs", async () => {
    const req = createPostRequest({
      items: [
        { productId: "prod-1", quantity: 1 },
        { productId: "prod-1", quantity: 2 },
      ],
      paymentMethod: "balance",
      email: "test@example.com",
    });
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.message).toBe("订单中存在重复商品，请合并数量");
  });

  // -----------------------------------------------------------------------
  // 4. Returns 400 for inactive product
  // -----------------------------------------------------------------------

  it("returns 400 for inactive product", async () => {
    const inactiveProduct = { ...mockProduct, isActive: false };
    mockProductFindMany
      .mockResolvedValueOnce([inactiveProduct]) // byId
      .mockResolvedValueOnce([]); // bySlug

    const req = createPostRequest(validBody);
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.message).toContain("商品不存在或已下架");
  });

  it("returns 400 for non-existent product", async () => {
    mockProductFindMany
      .mockResolvedValueOnce([]) // byId - not found
      .mockResolvedValueOnce([]); // bySlug - not found

    const req = createPostRequest(validBody);
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.message).toContain("商品不存在或已下架");
  });

  // -----------------------------------------------------------------------
  // 5. Returns 400 for insufficient stock
  // -----------------------------------------------------------------------

  it("returns 400 for insufficient stock", async () => {
    const lowStockProduct = { ...mockProduct, stockCount: 2 };
    mockProductFindMany
      .mockResolvedValueOnce([lowStockProduct]) // byId
      .mockResolvedValueOnce([]); // bySlug

    const req = createPostRequest({
      items: [{ productId: "prod-1", quantity: 5 }],
      paymentMethod: "balance",
      email: "test@example.com",
    });
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.message).toContain("库存不足");
    expect(data.code).toBe("STOCK_INSUFFICIENT");
  });

  it("returns sold-out message when stock is 0", async () => {
    const soldOutProduct = { ...mockProduct, stockCount: 0 };
    mockProductFindMany
      .mockResolvedValueOnce([soldOutProduct]) // byId
      .mockResolvedValueOnce([]); // bySlug

    const req = createPostRequest(validBody);
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.message).toContain("已售罄");
  });

  // -----------------------------------------------------------------------
  // 6. Applies fixed coupon discount
  // -----------------------------------------------------------------------

  it("applies fixed coupon discount", async () => {
    setupProductMocks();

    const mockCoupon = {
      id: "coupon-1",
      code: "SAVE10",
      isActive: true,
      type: "FIXED",
      value: 10,
      startAt: new Date("2024-01-01"),
      expireAt: new Date("2030-12-31"),
      maxUses: null,
      usedCount: 0,
      minAmount: 0,
    };
    mockCouponFindUnique.mockResolvedValue(mockCoupon);

    const discountedOrder = {
      ...createdOrder,
      totalAmount: 99.9,
      payAmount: 89.9,
    };
    mockOrderCreate.mockResolvedValue(discountedOrder);

    const req = createPostRequest({
      ...validBody,
      couponCode: "save10",
    });
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.order.discount).toBe(10);
    expect(data.order.payAmount).toBe(89.9);

    // Verify coupon was looked up with uppercase trimmed code
    expect(mockCouponFindUnique).toHaveBeenCalledWith({
      where: { code: "SAVE10" },
    });

    // Verify order was created with couponId
    const createArgs = mockOrderCreate.mock.calls[0][0];
    expect(createArgs.data.couponId).toBe("coupon-1");
  });

  // -----------------------------------------------------------------------
  // 7. Returns 500 on database error
  // -----------------------------------------------------------------------

  it("returns 500 on database error during order creation", async () => {
    setupProductMocks();
    mockOrderCreate.mockRejectedValue(new Error("DB write failed"));

    const req = createPostRequest(validBody);
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.message).toBe("服务器内部错误");
  });
});
