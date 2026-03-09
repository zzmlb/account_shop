import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Mocks — declared BEFORE importing the route handler
// ---------------------------------------------------------------------------

const mockBalanceLogFindMany = vi.fn();
const mockBalanceLogCount = vi.fn();
const mockUserFindUnique = vi.fn();

vi.mock("@/server/db", () => ({
  db: {
    balanceLog: {
      findMany: (...args: unknown[]) => mockBalanceLogFindMany(...args),
      count: (...args: unknown[]) => mockBalanceLogCount(...args),
    },
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
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

let mockUserSession: { id: string; role: string } | null = { id: "user-1", role: "USER" };

vi.mock("@/lib/auth", () => ({
  getUserSession: () => {
    if (!mockUserSession) {
      const { NextResponse } = require("next/server");
      return { session: null, error: NextResponse.json({ success: false, message: "未登录" }, { status: 401 }) };
    }
    return { session: mockUserSession, error: null };
  },
}));

// ---------------------------------------------------------------------------
// Import the route handler AFTER all mocks are in place
// ---------------------------------------------------------------------------

const { GET } = await import("@/app/api/balance-logs/route");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setupAuth(userId = "user-1") {
  mockUserSession = { id: userId, role: "USER" };
}

function setupUnauth() {
  mockUserSession = null;
}

function createGetRequest(params: Record<string, string> = {}) {
  const url = new URL("http://localhost:3001/api/balance-logs");
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return new NextRequest(url);
}

const now = new Date("2026-03-09T10:00:00Z");

const mockLog = {
  id: "log1",
  amount: 100.50,
  type: "RECHARGE",
  description: "充值",
  createdAt: now,
  userId: "user-1",
};

const mockUser = { balance: 500.25 };

// ===========================================================================
// Tests — GET /api/balance-logs
// ===========================================================================

describe("GET /api/balance-logs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuth();
    mockBalanceLogFindMany.mockResolvedValue([mockLog]);
    mockBalanceLogCount.mockResolvedValue(1);
    mockUserFindUnique.mockResolvedValue(mockUser);
  });

  // -------------------------------------------------------------------------
  // 1. Returns balance logs with user balance
  // -------------------------------------------------------------------------

  it("returns balance logs with user balance", async () => {
    const req = createGetRequest();
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.logs).toHaveLength(1);
    expect(data.logs[0]).toEqual({
      id: "log1",
      amount: 100.50,
      type: "RECHARGE",
      description: "充值",
      createdAt: now.toISOString(),
    });
    expect(data.balance).toBe(500.25);
    expect(data.pagination).toEqual({
      page: 1,
      pageSize: 200,
      total: 1,
      totalPages: 1,
    });
  });

  // -------------------------------------------------------------------------
  // 2. Returns 401 when not authenticated
  // -------------------------------------------------------------------------

  it("returns 401 when not authenticated", async () => {
    setupUnauth();

    const req = createGetRequest();
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.message).toBe("未登录");
  });

  // -------------------------------------------------------------------------
  // 3. Filters by valid type (RECHARGE)
  // -------------------------------------------------------------------------

  it("filters by valid type (RECHARGE)", async () => {
    const req = createGetRequest({ type: "RECHARGE" });
    await GET(req);

    const whereArg = mockBalanceLogFindMany.mock.calls[0][0].where;
    expect(whereArg.type).toBe("RECHARGE");
    expect(whereArg.userId).toBe("user-1");
  });

  // -------------------------------------------------------------------------
  // 4. Ignores invalid type filter
  // -------------------------------------------------------------------------

  it("ignores invalid type filter", async () => {
    const req = createGetRequest({ type: "INVALID_TYPE" });
    await GET(req);

    const whereArg = mockBalanceLogFindMany.mock.calls[0][0].where;
    expect(whereArg.type).toBeUndefined();
    expect(whereArg.userId).toBe("user-1");
  });

  // -------------------------------------------------------------------------
  // 5. Paginates correctly
  // -------------------------------------------------------------------------

  it("paginates correctly", async () => {
    mockBalanceLogCount.mockResolvedValue(50);

    const req = createGetRequest({ page: "3", pageSize: "10" });
    const response = await GET(req);
    const data = await response.json();

    const findManyArg = mockBalanceLogFindMany.mock.calls[0][0];
    expect(findManyArg.skip).toBe(20); // (3 - 1) * 10
    expect(findManyArg.take).toBe(10);
    expect(findManyArg.orderBy).toEqual({ createdAt: "desc" });

    expect(data.pagination).toEqual({
      page: 3,
      pageSize: 10,
      total: 50,
      totalPages: 5,
    });
  });

  // -------------------------------------------------------------------------
  // 6. Converts amount to number
  // -------------------------------------------------------------------------

  it("converts amount to number", async () => {
    const decimalLog = {
      ...mockLog,
      id: "log2",
      amount: { toNumber: () => 250.75, toString: () => "250.75" },
    };
    mockBalanceLogFindMany.mockResolvedValue([decimalLog]);

    const req = createGetRequest();
    const response = await GET(req);
    const data = await response.json();

    expect(typeof data.logs[0].amount).toBe("number");
    expect(data.logs[0].amount).toBe(250.75);
  });

  // -------------------------------------------------------------------------
  // 7. Returns balance 0 when user not found
  // -------------------------------------------------------------------------

  it("returns balance 0 when user not found", async () => {
    mockUserFindUnique.mockResolvedValue(null);

    const req = createGetRequest();
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.balance).toBe(0);
    expect(data.logs).toHaveLength(1);
  });

  // -------------------------------------------------------------------------
  // 8. Returns 500 on error
  // -------------------------------------------------------------------------

  it("returns 500 on error", async () => {
    mockBalanceLogFindMany.mockRejectedValue(new Error("DB connection failed"));

    const req = createGetRequest();
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.message).toBe("服务器内部错误");
  });

  // -----------------------------------------------------------------------
  // Edge cases
  // -----------------------------------------------------------------------

  it("filters by PURCHASE type", async () => {
    const req = createGetRequest({ type: "PURCHASE" });
    await GET(req);

    const whereArg = mockBalanceLogFindMany.mock.calls[0][0].where;
    expect(whereArg.type).toBe("PURCHASE");
  });

  it("clamps pageSize to max 500", async () => {
    const req = createGetRequest({ pageSize: "999" });
    await GET(req);

    const findManyArg = mockBalanceLogFindMany.mock.calls[0][0];
    expect(findManyArg.take).toBe(500);
  });
});
