import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockCouponFindUnique = vi.fn();
const mockUserCouponCount = vi.fn();
const mockUserCouponFindFirst = vi.fn();
const mockUserCouponCreate = vi.fn();

vi.mock("@/server/db", () => ({
  db: {
    coupon: {
      findUnique: (...args: unknown[]) => mockCouponFindUnique(...args),
    },
    userCoupon: {
      count: (...args: unknown[]) => mockUserCouponCount(...args),
      findFirst: (...args: unknown[]) => mockUserCouponFindFirst(...args),
      create: (...args: unknown[]) => mockUserCouponCreate(...args),
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

vi.mock("@/lib/validators", () => ({
  claimCouponSchema: {
    safeParse: (data: Record<string, unknown>) => {
      if (!data.code || typeof data.code !== "string") {
        return { success: false, error: { issues: [{ message: "优惠码不能为空" }] } };
      }
      return { success: true, data: { code: data.code } };
    },
  },
  formatZodError: (err: { issues: Array<{ message: string }> }) => err.issues[0]?.message ?? "验证错误",
}));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

const { POST } = await import("@/app/api/coupons/claim/route");

const mockSession = { id: "user-1", username: "testuser", email: "test@example.com", role: "USER" };

const mockCoupon = {
  id: "coupon-1",
  code: "SAVE10",
  type: "FIXED",
  value: 10,
  minAmount: 50,
  maxUses: 100,
  isActive: true,
  startAt: new Date(Date.now() - 86400000),
  expireAt: new Date(Date.now() + 86400000),
};

function makeReq(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/coupons/claim", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/coupons/claim", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserSession.mockReturnValue({ session: mockSession, error: null });
  });

  it("returns 401 when not authenticated", async () => {
    const { NextResponse } = await import("next/server");
    mockGetUserSession.mockReturnValue({
      session: null,
      error: NextResponse.json({ success: false, message: "未登录" }, { status: 401 }),
    });

    const res = await POST(makeReq({ code: "SAVE10" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 for missing code", async () => {
    const res = await POST(makeReq({}));
    expect(res.status).toBe(400);
  });

  it("returns 404 for non-existent coupon code", async () => {
    mockCouponFindUnique.mockResolvedValue(null);

    const res = await POST(makeReq({ code: "INVALID" }));
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.message).toContain("不存在");
  });

  it("returns 400 when coupon is inactive", async () => {
    mockCouponFindUnique.mockResolvedValue({ ...mockCoupon, isActive: false });

    const res = await POST(makeReq({ code: "SAVE10" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.message).toContain("停用");
  });

  it("returns 400 when coupon has not started yet", async () => {
    mockCouponFindUnique.mockResolvedValue({
      ...mockCoupon,
      startAt: new Date(Date.now() + 86400000),
    });

    const res = await POST(makeReq({ code: "SAVE10" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.message).toContain("尚未开始");
  });

  it("returns 400 when coupon has expired", async () => {
    mockCouponFindUnique.mockResolvedValue({
      ...mockCoupon,
      expireAt: new Date(Date.now() - 86400000),
    });

    const res = await POST(makeReq({ code: "SAVE10" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.message).toContain("过期");
  });

  it("returns 400 when coupon is fully claimed", async () => {
    mockCouponFindUnique.mockResolvedValue({ ...mockCoupon, maxUses: 10 });
    mockUserCouponCount.mockResolvedValue(10);

    const res = await POST(makeReq({ code: "SAVE10" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.message).toContain("领完");
  });

  it("returns 400 when user already claimed this coupon", async () => {
    mockCouponFindUnique.mockResolvedValue(mockCoupon);
    mockUserCouponFindFirst.mockResolvedValue({ id: "uc-1" });

    const res = await POST(makeReq({ code: "SAVE10" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.message).toContain("已领取");
  });

  it("claims coupon successfully", async () => {
    mockCouponFindUnique.mockResolvedValue(mockCoupon);
    mockUserCouponFindFirst.mockResolvedValue(null);
    mockUserCouponCreate.mockResolvedValue({ id: "uc-new" });

    const res = await POST(makeReq({ code: "SAVE10" }));
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.message).toContain("领取成功");
    expect(data.coupon.code).toBe("SAVE10");
    expect(data.coupon.type).toBe("FIXED");
    expect(data.coupon.value).toBe(10);

    expect(mockUserCouponCreate).toHaveBeenCalledWith({
      data: { userId: "user-1", couponId: "coupon-1" },
    });
  });

  it("allows claiming coupon with no maxUses limit", async () => {
    mockCouponFindUnique.mockResolvedValue({ ...mockCoupon, maxUses: null });
    mockUserCouponFindFirst.mockResolvedValue(null);
    mockUserCouponCreate.mockResolvedValue({ id: "uc-new" });

    const res = await POST(makeReq({ code: "SAVE10" }));
    expect(res.status).toBe(200);
    // Should not check count when maxUses is null
    expect(mockUserCouponCount).not.toHaveBeenCalled();
  });
});
