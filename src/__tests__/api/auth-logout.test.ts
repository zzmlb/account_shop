import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockApiLimiter = vi.fn();

vi.mock("@/lib/rate-limit", () => ({
  apiLimiter: (...args: unknown[]) => mockApiLimiter(...args),
  getClientIp: () => "127.0.0.1",
  rateLimitResponse: (rl: { reset: number }) => {
    const { NextResponse } = require("next/server");
    return NextResponse.json(
      { success: false, message: "请求过于频繁" },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil((rl.reset - Date.now()) / 1000)) },
      },
    );
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

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

const { POST } = await import("@/app/api/auth/logout/route");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeReq() {
  return new NextRequest("http://localhost/api/auth/logout", { method: "POST" });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/auth/logout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiLimiter.mockReturnValue({ success: true, remaining: 10, reset: Date.now() + 60000 });
  });

  // -----------------------------------------------------------------------
  // 1. Successfully logs out and returns 200
  // -----------------------------------------------------------------------
  it("successfully logs out and returns 200 with success true", async () => {
    const res = await POST(makeReq());

    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
  });

  // -----------------------------------------------------------------------
  // 2. Returns the correct success message
  // -----------------------------------------------------------------------
  it('returns success JSON with message "已成功退出登录"', async () => {
    const res = await POST(makeReq());
    const data = await res.json();

    expect(data).toEqual({
      success: true,
      message: "已成功退出登录",
    });
  });

  // -----------------------------------------------------------------------
  // 3. Clears session cookie with correct attributes
  // -----------------------------------------------------------------------
  it("clears session cookie with maxAge=0, httpOnly, and path=/", async () => {
    const res = await POST(makeReq());

    const setCookie = res.headers.get("set-cookie");
    expect(setCookie).toBeTruthy();

    // Cookie name is "session" and value is cleared
    expect(setCookie).toContain("session=");
    // maxAge=0 tells the browser to expire the cookie immediately
    expect(setCookie).toContain("Max-Age=0");
    // httpOnly prevents client-side JS access
    expect(setCookie).toContain("HttpOnly");
    // path=/ ensures the cookie is cleared site-wide
    expect(setCookie).toContain("Path=/");
  });

  // -----------------------------------------------------------------------
  // 4. Rate limited requests return 429
  // -----------------------------------------------------------------------
  it("returns 429 when rate limited", async () => {
    mockApiLimiter.mockReturnValue({
      success: false,
      remaining: 0,
      reset: Date.now() + 30000,
    });

    const res = await POST(makeReq());
    const data = await res.json();

    expect(res.status).toBe(429);
    expect(data.success).toBe(false);
    expect(data.message).toBe("请求过于频繁");
  });
});
