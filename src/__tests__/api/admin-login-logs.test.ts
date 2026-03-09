import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Mock functions — declared BEFORE importing the route handler
// ---------------------------------------------------------------------------

const mockLoginLogFindMany = vi.fn();
const mockLoginLogCount = vi.fn();

vi.mock("@/server/db", () => ({
  db: {
    loginLog: {
      findMany: (...args: unknown[]) => mockLoginLogFindMany(...args),
      count: (...args: unknown[]) => mockLoginLogCount(...args),
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

// ---------------------------------------------------------------------------
// Import route handler AFTER all mocks are in place
// ---------------------------------------------------------------------------

const { GET } = await import("@/app/api/admin/login-logs/route");

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const now = new Date("2026-03-08T10:00:00Z");

const mockLog = {
  id: "log-1",
  userId: "user-1",
  username: "testuser",
  success: true,
  ip: "192.168.1.1",
  userAgent: "Mozilla/5.0",
  reason: null,
  createdAt: now,
  user: { id: "user-1", username: "testuser", email: "test@example.com", role: "USER" },
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Admin Login Logs API — /api/admin/login-logs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdminSession = { id: "admin-1", role: "ADMIN" };
  });

  it("1. returns login logs with stats", async () => {
    // count is called 3 times: todayTotal, todayFailed, paginated total
    mockLoginLogCount
      .mockResolvedValueOnce(10)   // todayTotal
      .mockResolvedValueOnce(3)    // todayFailed
      .mockResolvedValueOnce(1);   // paginated total

    // findMany is called 2 times: todayUniqueIPs (distinct), paginated logs
    mockLoginLogFindMany
      .mockResolvedValueOnce([{ ip: "192.168.1.1" }, { ip: "10.0.0.1" }])  // todayUniqueIPs
      .mockResolvedValueOnce([mockLog]);                                      // paginated logs

    const req = new NextRequest("http://localhost/api/admin/login-logs");
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.stats).toEqual({
      todayTotal: 10,
      todayFailed: 3,
      todaySuccess: 7,
      todayUniqueIPs: 2,
    });
    expect(json.logs).toHaveLength(1);
    expect(json.logs[0]).toMatchObject({
      id: "log-1",
      userId: "user-1",
      username: "testuser",
      success: true,
      ip: "192.168.1.1",
      userAgent: "Mozilla/5.0",
      reason: null,
      createdAt: now.toISOString(),
      user: { id: "user-1", username: "testuser", email: "test@example.com", role: "USER" },
    });
    expect(json.pagination).toBeDefined();
    expect(json.pagination.total).toBe(1);
  });

  it("2. returns 401 when not authenticated", async () => {
    mockAdminSession = null;

    const req = new NextRequest("http://localhost/api/admin/login-logs");
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.success).toBe(false);
    expect(json.message).toBe("未登录");
  });

  it("3. returns 403 for non-admin", async () => {
    mockAdminSession = { id: "user-1", role: "USER" };

    const req = new NextRequest("http://localhost/api/admin/login-logs");
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.success).toBe(false);
    expect(json.message).toBe("无权限");
  });

  it("4. filters by status=success", async () => {
    mockLoginLogCount
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);
    mockLoginLogFindMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const req = new NextRequest("http://localhost/api/admin/login-logs?status=success");
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);

    // The paginated findMany (2nd call) should have where.success = true
    const paginatedFindManyCall = mockLoginLogFindMany.mock.calls[1][0];
    expect(paginatedFindManyCall.where.success).toBe(true);

    // The paginated count (3rd call) should have where.success = true
    const paginatedCountCall = mockLoginLogCount.mock.calls[2][0];
    expect(paginatedCountCall.where.success).toBe(true);
  });

  it("5. filters by status=failed", async () => {
    mockLoginLogCount
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(0);
    mockLoginLogFindMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const req = new NextRequest("http://localhost/api/admin/login-logs?status=failed");
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);

    // The paginated findMany (2nd call) should have where.success = false
    const paginatedFindManyCall = mockLoginLogFindMany.mock.calls[1][0];
    expect(paginatedFindManyCall.where.success).toBe(false);

    // The paginated count (3rd call) should have where.success = false
    const paginatedCountCall = mockLoginLogCount.mock.calls[2][0];
    expect(paginatedCountCall.where.success).toBe(false);
  });

  it("6. filters by search term", async () => {
    mockLoginLogCount
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0);
    mockLoginLogFindMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const req = new NextRequest("http://localhost/api/admin/login-logs?search=test");
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);

    // The paginated findMany (2nd call) should have the OR search filter
    const paginatedFindManyCall = mockLoginLogFindMany.mock.calls[1][0];
    expect(paginatedFindManyCall.where.OR).toBeDefined();
    expect(paginatedFindManyCall.where.OR).toEqual([
      { username: { contains: "test", mode: "insensitive" } },
      { ip: { contains: "test" } },
      { user: { email: { contains: "test", mode: "insensitive" } } },
    ]);
  });

  it("7. calculates todaySuccess as todayTotal - todayFailed", async () => {
    mockLoginLogCount
      .mockResolvedValueOnce(25)   // todayTotal
      .mockResolvedValueOnce(8)    // todayFailed
      .mockResolvedValueOnce(0);   // paginated total
    mockLoginLogFindMany
      .mockResolvedValueOnce([{ ip: "1.1.1.1" }])  // todayUniqueIPs
      .mockResolvedValueOnce([]);                     // paginated logs

    const req = new NextRequest("http://localhost/api/admin/login-logs");
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.stats.todayTotal).toBe(25);
    expect(json.stats.todayFailed).toBe(8);
    expect(json.stats.todaySuccess).toBe(17); // 25 - 8
    expect(json.stats.todayUniqueIPs).toBe(1);
  });

  it("8. returns 500 on error", async () => {
    mockLoginLogCount.mockRejectedValue(new Error("DB connection failed"));

    const req = new NextRequest("http://localhost/api/admin/login-logs");
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.success).toBe(false);
    expect(json.message).toBe("服务器内部错误");
  });
});
