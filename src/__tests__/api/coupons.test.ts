import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Mocks — declared BEFORE importing the route handler
// ---------------------------------------------------------------------------

const mockUserCouponFindMany = vi.fn();

vi.mock("@/server/db", () => ({
  db: {
    userCoupon: {
      findMany: (...args: unknown[]) => mockUserCouponFindMany(...args),
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

const { GET } = await import("@/app/api/coupons/route");

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const now = new Date("2026-03-08T10:00:00Z");

const mockUserCoupon = {
  id: "uc-1",
  couponId: "coupon-1",
  userId: "user-1",
  usedAt: null,
  coupon: {
    code: "SAVE10",
    type: "PERCENTAGE",
    value: 10,
    minAmount: 50,
    startAt: now,
    expireAt: new Date("2026-04-08T10:00:00Z"),
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeReq() {
  return new NextRequest("http://localhost/api/coupons", { method: "GET" });
}

// ---------------------------------------------------------------------------
// Tests — GET /api/coupons
// ---------------------------------------------------------------------------

describe("GET /api/coupons", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserSession = { id: "user-1", role: "USER" };
    mockUserCouponFindMany.mockResolvedValue([{ ...mockUserCoupon }]);
  });

  // -------------------------------------------------------------------------
  // 1. Returns user's coupons formatted correctly
  // -------------------------------------------------------------------------

  it("returns user's coupons formatted correctly", async () => {
    const res = await GET(makeReq());
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.coupons).toHaveLength(1);

    const coupon = data.coupons[0];
    expect(coupon.id).toBe("uc-1");
    expect(coupon.couponId).toBe("coupon-1");
    expect(coupon.name).toBe("SAVE10");
    expect(coupon.code).toBe("SAVE10");
    expect(coupon.type).toBe("PERCENTAGE");
    expect(coupon.value).toBe(10);
    expect(coupon.minAmount).toBe(50);
    expect(coupon.startDate).toBe("2026-03-08T10:00:00.000Z");
    expect(coupon.endDate).toBe("2026-04-08T10:00:00.000Z");
    expect(coupon.isUsed).toBe(false);
    expect(coupon.usedAt).toBeNull();

    expect(mockUserCouponFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-1" },
        include: { coupon: true },
        orderBy: { coupon: { expireAt: "desc" } },
        take: 100,
      })
    );
  });

  // -------------------------------------------------------------------------
  // 2. Returns 401 when not authenticated
  // -------------------------------------------------------------------------

  it("returns 401 when not authenticated", async () => {
    mockUserSession = null;

    const res = await GET(makeReq());
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.success).toBe(false);
    expect(mockUserCouponFindMany).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // 3. Converts value and minAmount to numbers
  // -------------------------------------------------------------------------

  it("converts value and minAmount to numbers", async () => {
    mockUserCouponFindMany.mockResolvedValue([
      {
        ...mockUserCoupon,
        coupon: {
          ...mockUserCoupon.coupon,
          value: "15.5" as unknown,
          minAmount: "100" as unknown,
        },
      },
    ]);

    const res = await GET(makeReq());
    const data = await res.json();

    expect(data.success).toBe(true);
    const coupon = data.coupons[0];
    expect(coupon.value).toBe(15.5);
    expect(typeof coupon.value).toBe("number");
    expect(coupon.minAmount).toBe(100);
    expect(typeof coupon.minAmount).toBe("number");
  });

  // -------------------------------------------------------------------------
  // 4. Sets isUsed=true when usedAt is non-null
  // -------------------------------------------------------------------------

  it("sets isUsed to true when usedAt is non-null", async () => {
    const usedDate = new Date("2026-03-09T12:00:00Z");
    mockUserCouponFindMany.mockResolvedValue([
      {
        ...mockUserCoupon,
        usedAt: usedDate,
      },
    ]);

    const res = await GET(makeReq());
    const data = await res.json();

    expect(data.success).toBe(true);
    const coupon = data.coupons[0];
    expect(coupon.isUsed).toBe(true);
    expect(coupon.usedAt).toBe("2026-03-09T12:00:00.000Z");
  });

  // -------------------------------------------------------------------------
  // 5. Handles null minAmount (maps to null not 0)
  // -------------------------------------------------------------------------

  it("handles null minAmount by returning null instead of 0", async () => {
    mockUserCouponFindMany.mockResolvedValue([
      {
        ...mockUserCoupon,
        coupon: {
          ...mockUserCoupon.coupon,
          minAmount: null,
        },
      },
    ]);

    const res = await GET(makeReq());
    const data = await res.json();

    expect(data.success).toBe(true);
    const coupon = data.coupons[0];
    expect(coupon.minAmount).toBeNull();
  });

  // -------------------------------------------------------------------------
  // 6. Returns 500 on error
  // -------------------------------------------------------------------------

  it("returns 500 when the database throws an error", async () => {
    mockUserCouponFindMany.mockRejectedValue(new Error("DB connection failed"));

    const res = await GET(makeReq());
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.message).toBe("服务器内部错误");
  });

  // -----------------------------------------------------------------------
  // Edge cases
  // -----------------------------------------------------------------------

  it("returns empty array when user has no coupons", async () => {
    mockUserCouponFindMany.mockResolvedValue([]);

    const res = await GET(makeReq());
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.coupons).toEqual([]);
  });

  it("orders coupons by expireAt desc and limits to 100", async () => {
    mockUserCouponFindMany.mockResolvedValue([]);

    await GET(makeReq());

    const args = mockUserCouponFindMany.mock.calls[0][0];
    expect(args.orderBy).toEqual({ coupon: { expireAt: "desc" } });
    expect(args.take).toBe(100);
  });
});
