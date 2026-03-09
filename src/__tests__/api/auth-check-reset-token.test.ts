import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockPasswordResetFindUnique = vi.fn();

vi.mock("@/server/db", () => ({
  db: {
    passwordReset: {
      findUnique: (...args: unknown[]) => mockPasswordResetFindUnique(...args),
    },
  },
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

const { GET } = await import("@/app/api/auth/check-reset-token/route");

function makeReq(token?: string) {
  const url = token
    ? `http://localhost/api/auth/check-reset-token?token=${token}`
    : "http://localhost/api/auth/check-reset-token";
  return new NextRequest(url, { method: "GET" });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("GET /api/auth/check-reset-token", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns invalid when no token provided", async () => {
    const res = await GET(makeReq());
    const data = await res.json();
    expect(data.valid).toBe(false);
    expect(data.reason).toBe("invalid");
  });

  it("returns invalid for non-existent token", async () => {
    mockPasswordResetFindUnique.mockResolvedValue(null);

    const res = await GET(makeReq("nonexistent-token"));
    const data = await res.json();
    expect(data.valid).toBe(false);
    expect(data.reason).toBe("invalid");
  });

  it("returns used for already-used token", async () => {
    mockPasswordResetFindUnique.mockResolvedValue({
      expiresAt: new Date(Date.now() + 3600000),
      usedAt: new Date(),
    });

    const res = await GET(makeReq("used-token"));
    const data = await res.json();
    expect(data.valid).toBe(false);
    expect(data.reason).toBe("used");
  });

  it("returns expired for expired token", async () => {
    mockPasswordResetFindUnique.mockResolvedValue({
      expiresAt: new Date(Date.now() - 3600000), // expired
      usedAt: null,
    });

    const res = await GET(makeReq("expired-token"));
    const data = await res.json();
    expect(data.valid).toBe(false);
    expect(data.reason).toBe("expired");
  });

  it("returns valid for active token", async () => {
    mockPasswordResetFindUnique.mockResolvedValue({
      expiresAt: new Date(Date.now() + 3600000),
      usedAt: null,
    });

    const res = await GET(makeReq("good-token"));
    const data = await res.json();
    expect(data.valid).toBe(true);
  });

  it("returns invalid for token exceeding 200 chars", async () => {
    const longToken = "a".repeat(201);
    const res = await GET(makeReq(longToken));
    const data = await res.json();
    expect(data.valid).toBe(false);
    expect(data.reason).toBe("invalid");
    // Should not query DB for oversized tokens
    expect(mockPasswordResetFindUnique).not.toHaveBeenCalled();
  });

  it("returns error reason on database failure", async () => {
    mockPasswordResetFindUnique.mockRejectedValue(new Error("DB error"));

    const res = await GET(makeReq("some-token"));
    const data = await res.json();
    expect(data.valid).toBe(false);
    expect(data.reason).toBe("error");
  });

  it("queries DB with correct token", async () => {
    mockPasswordResetFindUnique.mockResolvedValue({
      expiresAt: new Date(Date.now() + 3600000),
      usedAt: null,
    });

    await GET(makeReq("abc123"));
    expect(mockPasswordResetFindUnique).toHaveBeenCalledWith({
      where: { token: "abc123" },
      select: { expiresAt: true, usedAt: true },
    });
  });
});
