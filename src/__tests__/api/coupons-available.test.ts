import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockCouponFindMany = vi.fn();
const mockUserCouponFindMany = vi.fn();

vi.mock("@/server/db", () => ({
  db: {
    coupon: {
      findMany: (...args: unknown[]) => mockCouponFindMany(...args),
    },
    userCoupon: {
      findMany: (...args: unknown[]) => mockUserCouponFindMany(...args),
    },
  },
}));

const mockDecodeSession = vi.fn();

vi.mock("@/lib/auth", () => ({
  decodeSession: (...args: unknown[]) => mockDecodeSession(...args),
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

const { GET } = await import("@/app/api/coupons/available/route");

const now = new Date();
const future = new Date(Date.now() + 86400000);

const mockCoupon = {
  id: "coupon-1",
  code: "SAVE10",
  type: "FIXED",
  value: 10,
  minAmount: 50,
  maxUses: 100,
  isActive: true,
  startAt: new Date(Date.now() - 86400000),
  expireAt: future,
  createdAt: now,
  _count: { users: 5 },
};

function makeReq() {
  return new NextRequest("http://localhost/api/coupons/available", { method: "GET" });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("GET /api/coupons/available", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDecodeSession.mockReturnValue(null); // no session by default
  });

  it("returns available coupons for unauthenticated users", async () => {
    mockCouponFindMany.mockResolvedValue([mockCoupon]);

    const res = await GET(makeReq());
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.coupons).toHaveLength(1);
    expect(data.coupons[0].code).toBe("SAVE10");
    expect(data.coupons[0].isClaimed).toBe(false);
  });

  it("returns empty array when no coupons available", async () => {
    mockCouponFindMany.mockResolvedValue([]);

    const res = await GET(makeReq());
    const data = await res.json();
    expect(data.coupons).toEqual([]);
  });

  it("filters out fully claimed coupons", async () => {
    mockCouponFindMany.mockResolvedValue([
      { ...mockCoupon, maxUses: 5, _count: { users: 5 } }, // fully claimed
      { ...mockCoupon, id: "coupon-2", code: "SAVE20", maxUses: 10, _count: { users: 3 } }, // still available
    ]);

    const res = await GET(makeReq());
    const data = await res.json();
    expect(data.coupons).toHaveLength(1);
    expect(data.coupons[0].code).toBe("SAVE20");
  });

  it("marks coupons as claimed for authenticated users", async () => {
    mockDecodeSession.mockReturnValue({ id: "user-1", username: "testuser" });
    mockCouponFindMany.mockResolvedValue([mockCoupon]);
    mockUserCouponFindMany.mockResolvedValue([{ couponId: "coupon-1" }]);

    const res = await GET(makeReq());
    const data = await res.json();
    expect(data.coupons[0].isClaimed).toBe(true);
  });

  it("sets public cache header for unauthenticated users", async () => {
    mockCouponFindMany.mockResolvedValue([]);

    const res = await GET(makeReq());
    const cacheControl = res.headers.get("Cache-Control");
    expect(cacheControl).toContain("public");
  });

  it("sets private cache header for authenticated users", async () => {
    mockDecodeSession.mockReturnValue({ id: "user-1" });
    mockCouponFindMany.mockResolvedValue([]);
    mockUserCouponFindMany.mockResolvedValue([]);

    const res = await GET(makeReq());
    const cacheControl = res.headers.get("Cache-Control");
    expect(cacheControl).toContain("private");
  });

  it("formats coupon data correctly", async () => {
    mockCouponFindMany.mockResolvedValue([mockCoupon]);

    const res = await GET(makeReq());
    const data = await res.json();
    const coupon = data.coupons[0];

    expect(coupon.id).toBe("coupon-1");
    expect(coupon.type).toBe("FIXED");
    expect(coupon.value).toBe(10);
    expect(coupon.minAmount).toBe(50);
    expect(coupon.maxUses).toBe(100);
    expect(coupon.claimedCount).toBe(5);
    expect(typeof coupon.startAt).toBe("string");
    expect(typeof coupon.expireAt).toBe("string");
  });
});
