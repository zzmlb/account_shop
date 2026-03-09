import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mock functions ───────────────────────────────────────────────
const mockOrderAggregate = vi.fn();
const mockOrderCount = vi.fn();
const mockOrderFindMany = vi.fn();
const mockOrderGroupBy = vi.fn();
const mockUserCount = vi.fn();
const mockProductCount = vi.fn();
const mockProductFindMany = vi.fn();
const mockRefundRequestCount = vi.fn();
const mockContactMessageCount = vi.fn();
const mockLoginLogFindMany = vi.fn();
const mockQueryRaw = vi.fn();

vi.mock("@/server/db", () => ({
  db: {
    order: {
      aggregate: (...args: unknown[]) => mockOrderAggregate(...args),
      count: (...args: unknown[]) => mockOrderCount(...args),
      findMany: (...args: unknown[]) => mockOrderFindMany(...args),
      groupBy: (...args: unknown[]) => mockOrderGroupBy(...args),
    },
    user: {
      count: (...args: unknown[]) => mockUserCount(...args),
    },
    product: {
      count: (...args: unknown[]) => mockProductCount(...args),
      findMany: (...args: unknown[]) => mockProductFindMany(...args),
    },
    refundRequest: {
      count: (...args: unknown[]) => mockRefundRequestCount(...args),
    },
    contactMessage: {
      count: (...args: unknown[]) => mockContactMessageCount(...args),
    },
    loginLog: {
      findMany: (...args: unknown[]) => mockLoginLogFindMany(...args),
    },
    $queryRaw: (...args: unknown[]) => mockQueryRaw(...args),
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

// ─── Import route AFTER mocks ────────────────────────────────────
const { GET } = await import("@/app/api/admin/stats/route");

// ─── Helpers ─────────────────────────────────────────────────────
function setupAllMocks() {
  // aggregate: todaySales, yesterdaySales, totalRevenue, thisMonthRevenue, lastMonthRevenue
  mockOrderAggregate.mockResolvedValue({ _sum: { payAmount: 100 } });

  // count calls: todayOrders, yesterdayOrders, todayPaidOrders, yesterdayPaidOrders,
  //   thisMonthOrders, lastMonthOrders
  mockOrderCount.mockResolvedValue(5);

  // user.count: newUsers, yesterdayUsers, totalUsers
  mockUserCount.mockResolvedValue(5);

  // product.count: lowStockCount, totalProducts
  mockProductCount.mockResolvedValue(5);

  // refundRequest.count, contactMessage.count
  mockRefundRequestCount.mockResolvedValue(2);
  mockContactMessageCount.mockResolvedValue(3);

  // order.findMany (recentOrders)
  mockOrderFindMany.mockResolvedValue([
    {
      orderNo: "ORD001",
      items: [{ product: { name: "P1" }, quantity: 1 }],
      totalAmount: 99,
      status: "PAID",
      createdAt: new Date(),
    },
  ]);

  // product.findMany: hotProducts (1st call), lowStockProducts (2nd call)
  mockProductFindMany
    .mockResolvedValueOnce([
      { id: "p1", name: "Hot Product", price: 50, soldCount: 100, viewCount: 500 },
    ])
    .mockResolvedValueOnce([
      { id: "p2", name: "Low Stock", slug: "low-stock", stockCount: 2, soldCount: 10, price: 30 },
    ]);

  // order.groupBy: statusDistribution, paymentMethodStats
  mockOrderGroupBy
    .mockResolvedValueOnce([{ status: "PAID", _count: { id: 3 } }])
    .mockResolvedValueOnce([{ paymentMethod: "alipay", _sum: { payAmount: 200 }, _count: { id: 4 } }]);

  // loginLog.findMany
  mockLoginLogFindMany.mockResolvedValue([
    { id: "log1", username: "admin", success: true, ip: "127.0.0.1", createdAt: new Date() },
  ]);

  // $queryRaw: salesChart, userGrowthChart
  mockQueryRaw.mockResolvedValue([]);
}

// ─── Tests ───────────────────────────────────────────────────────
describe("Admin Stats API — /api/admin/stats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdminSession = { id: "admin-1", role: "ADMIN" };
  });

  it("1. returns stats with admin auth", async () => {
    setupAllMocks();

    const req = new NextRequest("http://localhost/api/admin/stats");
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.stats).toBeDefined();
    expect(json.stats.todaySales).toBeDefined();
    expect(json.recentOrders).toBeDefined();
    expect(json.hotProducts).toBeDefined();
    expect(json.salesChart).toBeDefined();
    expect(json.userGrowthChart).toBeDefined();
  });

  it("2. returns 401 when not authenticated", async () => {
    mockAdminSession = null;

    const req = new NextRequest("http://localhost/api/admin/stats");
    const res = await GET(req);

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.success).toBe(false);
  });

  it("3. returns 403 when not admin", async () => {
    mockAdminSession = { id: "user-1", role: "USER" };

    const req = new NextRequest("http://localhost/api/admin/stats");
    const res = await GET(req);

    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.success).toBe(false);
  });

  it("4. returns correct stat fields in response", async () => {
    setupAllMocks();

    const req = new NextRequest("http://localhost/api/admin/stats");
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);

    // Stats fields
    const { stats } = json;
    expect(stats).toMatchObject({
      todaySales: expect.any(Number),
      todayOrders: expect.any(Number),
      newUsers: expect.any(Number),
      lowStockCount: expect.any(Number),
      yesterdaySales: expect.any(Number),
      yesterdayOrders: expect.any(Number),
      yesterdayUsers: expect.any(Number),
      todayConversion: expect.any(Number),
      yesterdayConversion: expect.any(Number),
      totalProducts: expect.any(Number),
      totalUsers: expect.any(Number),
      totalRevenue: expect.any(Number),
      pendingRefunds: expect.any(Number),
      pendingMessages: expect.any(Number),
    });

    // Top-level sections
    expect(json.recentOrders).toBeInstanceOf(Array);
    expect(json.hotProducts).toBeInstanceOf(Array);
    expect(json.salesChart).toBeInstanceOf(Array);
    expect(json.userGrowthChart).toBeInstanceOf(Array);
    expect(json.ordersByStatus).toBeInstanceOf(Array);
    expect(json.revenueByMethod).toBeInstanceOf(Array);
    expect(json.monthlyComparison).toBeDefined();
    expect(json.recentLogins).toBeInstanceOf(Array);
    expect(json.lowStockProducts).toBeInstanceOf(Array);
    expect(json.chartPeriod).toBe(7);
  });

  it("5. returns empty charts when no data", async () => {
    // All aggregates return zero/empty
    mockOrderAggregate.mockResolvedValue({ _sum: { payAmount: null } });
    mockOrderCount.mockResolvedValue(0);
    mockUserCount.mockResolvedValue(0);
    mockProductCount.mockResolvedValue(0);
    mockRefundRequestCount.mockResolvedValue(0);
    mockContactMessageCount.mockResolvedValue(0);
    mockOrderFindMany.mockResolvedValue([]);
    mockProductFindMany.mockResolvedValue([]);
    mockOrderGroupBy.mockResolvedValue([]);
    mockLoginLogFindMany.mockResolvedValue([]);
    mockQueryRaw.mockResolvedValue([]);

    const req = new NextRequest("http://localhost/api/admin/stats");
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);

    // Charts should have entries (one per day) but with zero values
    expect(json.salesChart).toBeInstanceOf(Array);
    expect(json.salesChart.length).toBe(7); // default period
    json.salesChart.forEach((entry: { amount: number; orders: number }) => {
      expect(entry.amount).toBe(0);
      expect(entry.orders).toBe(0);
    });

    expect(json.userGrowthChart).toBeInstanceOf(Array);
    expect(json.userGrowthChart.length).toBe(7);
    json.userGrowthChart.forEach((entry: { users: number }) => {
      expect(entry.users).toBe(0);
    });

    expect(json.recentOrders).toEqual([]);
    expect(json.hotProducts).toEqual([]);
    expect(json.ordersByStatus).toEqual([]);
    expect(json.revenueByMethod).toEqual([]);
    expect(json.stats.todaySales).toBe(0);
  });

  it("6. returns 500 on error", async () => {
    mockOrderAggregate.mockRejectedValue(new Error("DB connection failed"));

    const req = new NextRequest("http://localhost/api/admin/stats");
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.success).toBe(false);
    expect(json.message).toBe("服务器内部错误");
  });

  // -----------------------------------------------------------------------
  // Edge cases
  // -----------------------------------------------------------------------

  it("accepts period=30 for sales chart", async () => {
    setupAllMocks();

    const req = new NextRequest("http://localhost/api/admin/stats?period=30");
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.chartPeriod).toBe(30);
    expect(json.salesChart.length).toBe(30);
    expect(json.userGrowthChart.length).toBe(30);
  });

  it("defaults to period=7 for invalid period param", async () => {
    setupAllMocks();

    const req = new NextRequest("http://localhost/api/admin/stats?period=99");
    const res = await GET(req);
    const json = await res.json();

    expect(json.chartPeriod).toBe(7);
  });

  it("accepts period=14 for sales chart", async () => {
    setupAllMocks();

    const req = new NextRequest("http://localhost/api/admin/stats?period=14");
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.chartPeriod).toBe(14);
    expect(json.salesChart.length).toBe(14);
  });

  it("calculates conversion rate correctly", async () => {
    mockOrderAggregate.mockResolvedValue({ _sum: { payAmount: 500 } });
    // Setup counts: todayOrders=10, yesterdayOrders=0, todayPaidOrders=4, yesterdayPaidOrders=0, ...
    mockOrderCount
      .mockResolvedValueOnce(10)  // todayOrders
      .mockResolvedValueOnce(0)   // yesterdayOrders
      .mockResolvedValueOnce(4)   // todayPaidOrders
      .mockResolvedValueOnce(0)   // yesterdayPaidOrders
      .mockResolvedValue(5);      // remaining counts (thisMonthOrders, lastMonthOrders)
    mockUserCount.mockResolvedValue(5);
    mockProductCount.mockResolvedValue(5);
    mockRefundRequestCount.mockResolvedValue(0);
    mockContactMessageCount.mockResolvedValue(0);
    mockOrderFindMany.mockResolvedValue([]);
    mockProductFindMany.mockResolvedValue([]);
    mockOrderGroupBy.mockResolvedValue([]);
    mockLoginLogFindMany.mockResolvedValue([]);
    mockQueryRaw.mockResolvedValue([]);

    const req = new NextRequest("http://localhost/api/admin/stats");
    const res = await GET(req);
    const json = await res.json();

    // 4/10 = 0.4 → 40%
    expect(json.stats.todayConversion).toBe(40);
    // 0 orders yesterday → conversion is 0
    expect(json.stats.yesterdayConversion).toBe(0);
  });
});
