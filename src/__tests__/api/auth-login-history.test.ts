import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockLoginLogFindMany = vi.fn();

vi.mock("@/server/db", () => ({
  db: {
    loginLog: {
      findMany: (...args: unknown[]) => mockLoginLogFindMany(...args),
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
    return NextResponse.json({ success: false, message: "请求过于频繁" }, { status: 429 });
  },
}));

vi.mock("@/lib/logger", () => ({
  createLogger: () => ({
    info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(),
  }),
}));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

const { GET } = await import("@/app/api/auth/login-history/route");

const mockSession = { id: "user-1", username: "testuser", email: "test@example.com", role: "USER" };

function makeReq() {
  return new NextRequest("http://localhost/api/auth/login-history", { method: "GET" });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("GET /api/auth/login-history", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    const { NextResponse } = await import("next/server");
    mockGetUserSession.mockReturnValue({
      session: null,
      error: NextResponse.json({ success: false, message: "未登录" }, { status: 401 }),
    });

    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns empty array when no login history", async () => {
    mockGetUserSession.mockReturnValue({ session: mockSession, error: null });
    mockLoginLogFindMany.mockResolvedValue([]);

    const res = await GET(makeReq());
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.logs).toEqual([]);
  });

  it("returns login history entries", async () => {
    mockGetUserSession.mockReturnValue({ session: mockSession, error: null });
    const now = new Date();
    mockLoginLogFindMany.mockResolvedValue([
      {
        id: "log-1",
        success: true,
        ip: "192.168.1.1",
        userAgent: "Mozilla/5.0 Chrome/120",
        reason: null,
        createdAt: now,
      },
      {
        id: "log-2",
        success: false,
        ip: "10.0.0.1",
        userAgent: "Mozilla/5.0 Firefox/120",
        reason: "密码错误",
        createdAt: new Date(now.getTime() - 3600000),
      },
    ]);

    const res = await GET(makeReq());
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.logs).toHaveLength(2);
    expect(data.logs[0].id).toBe("log-1");
    expect(data.logs[0].success).toBe(true);
    expect(data.logs[0].ip).toBe("192.168.1.1");
    expect(data.logs[1].success).toBe(false);
    expect(data.logs[1].reason).toBe("密码错误");
  });

  it("serializes createdAt as ISO string", async () => {
    mockGetUserSession.mockReturnValue({ session: mockSession, error: null });
    const date = new Date("2026-03-08T12:00:00Z");
    mockLoginLogFindMany.mockResolvedValue([{
      id: "log-1",
      success: true,
      ip: "127.0.0.1",
      userAgent: null,
      reason: null,
      createdAt: date,
    }]);

    const res = await GET(makeReq());
    const data = await res.json();
    expect(data.logs[0].createdAt).toBe("2026-03-08T12:00:00.000Z");
  });

  it("queries only the authenticated user's logs with correct ordering", async () => {
    mockGetUserSession.mockReturnValue({ session: mockSession, error: null });
    mockLoginLogFindMany.mockResolvedValue([]);

    await GET(makeReq());

    expect(mockLoginLogFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-1" },
        orderBy: { createdAt: "desc" },
        take: 20,
      })
    );
  });
});
