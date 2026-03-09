import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Mocks — declared BEFORE importing the route handler
// ---------------------------------------------------------------------------

const mockCouponFindUnique = vi.fn();

vi.mock("@/server/db", () => ({
  db: {
    coupon: {
      findUnique: (...args: unknown[]) => mockCouponFindUnique(...args),
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

// Mock validators
vi.mock("@/lib/validators", () => ({
  validateCouponSchema: {
    safeParse: (data: any) => {
      if (!data?.code || typeof data?.amount !== "number") {
        return { success: false, error: { flatten: () => ({ fieldErrors: {} }) } };
      }
      return { success: true, data: { code: data.code.toUpperCase(), amount: data.amount } };
    },
  },
  formatZodError: () => "验证失败",
}));

// ---------------------------------------------------------------------------
// Import the route handler AFTER all mocks are in place
// ---------------------------------------------------------------------------

const { POST } = await import("@/app/api/coupons/validate/route");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createRequest(body: unknown) {
  return new NextRequest("http://localhost:3001/api/coupons/validate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const now = new Date();
const mockCoupon = {
  id: "coupon-1",
  code: "SAVE10",
  type: "FIXED",
  value: 10,
  isActive: true,
  startAt: new Date(now.getTime() - 86400000), // yesterday
  expireAt: new Date(now.getTime() + 86400000), // tomorrow
  maxUses: 100,
  usedCount: 5,
  minAmount: 50,
};

// ---------------------------------------------------------------------------
// Tests — POST /api/coupons/validate
// ---------------------------------------------------------------------------

describe("POST /api/coupons/validate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCouponFindUnique.mockResolvedValue({ ...mockCoupon });
  });

  // -------------------------------------------------------------------------
  // 1. Valid FIXED coupon — returns discount correctly
  // -------------------------------------------------------------------------

  it("returns correct discount for a valid FIXED coupon", async () => {
    const req = createRequest({ code: "save10", amount: 100 });
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.discount).toBe(10);
    expect(data.couponId).toBe("coupon-1");
    expect(data.message).toContain("已减免");

    // Verify DB was queried with uppercased code
    expect(mockCouponFindUnique).toHaveBeenCalledWith({
      where: { code: "SAVE10" },
    });
  });

  // -------------------------------------------------------------------------
  // 2. Valid PERCENTAGE coupon — returns percentage discount
  // -------------------------------------------------------------------------

  it("returns correct discount for a valid PERCENTAGE coupon", async () => {
    mockCouponFindUnique.mockResolvedValue({
      ...mockCoupon,
      type: "PERCENTAGE",
      value: 20,
    });

    const req = createRequest({ code: "save10", amount: 200 });
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    // PERCENTAGE: Math.round(200 * 20) / 100 = 40
    expect(data.discount).toBe(40);
    expect(data.couponId).toBe("coupon-1");
    expect(data.message).toContain("折扣");
  });

  // -------------------------------------------------------------------------
  // 3. Invalid coupon code — returns 400
  // -------------------------------------------------------------------------

  it("returns 400 when coupon code does not exist", async () => {
    mockCouponFindUnique.mockResolvedValue(null);

    const req = createRequest({ code: "INVALID", amount: 100 });
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.message).toBe("无效的优惠券");
  });

  // -------------------------------------------------------------------------
  // 4. Inactive coupon — returns 400
  // -------------------------------------------------------------------------

  it("returns 400 when coupon is inactive", async () => {
    mockCouponFindUnique.mockResolvedValue({
      ...mockCoupon,
      isActive: false,
    });

    const req = createRequest({ code: "save10", amount: 100 });
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.message).toBe("该优惠券已停用");
  });

  // -------------------------------------------------------------------------
  // 5. Not yet started coupon — returns 400
  // -------------------------------------------------------------------------

  it("returns 400 when coupon has not started yet", async () => {
    mockCouponFindUnique.mockResolvedValue({
      ...mockCoupon,
      startAt: new Date(now.getTime() + 86400000 * 7), // 7 days in the future
    });

    const req = createRequest({ code: "save10", amount: 100 });
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.message).toBe("该优惠券尚未生效");
  });

  // -------------------------------------------------------------------------
  // 6. Expired coupon — returns 400
  // -------------------------------------------------------------------------

  it("returns 400 when coupon has expired", async () => {
    mockCouponFindUnique.mockResolvedValue({
      ...mockCoupon,
      expireAt: new Date(now.getTime() - 86400000 * 2), // 2 days ago
    });

    const req = createRequest({ code: "save10", amount: 100 });
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.message).toBe("该优惠券已过期");
  });

  // -------------------------------------------------------------------------
  // 7. Max uses exceeded — returns 400
  // -------------------------------------------------------------------------

  it("returns 400 when coupon has reached max usage limit", async () => {
    mockCouponFindUnique.mockResolvedValue({
      ...mockCoupon,
      maxUses: 100,
      usedCount: 100,
    });

    const req = createRequest({ code: "save10", amount: 100 });
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.message).toBe("该优惠券已达到使用上限");
  });

  // -------------------------------------------------------------------------
  // 8. Amount below minimum — returns 400
  // -------------------------------------------------------------------------

  it("returns 400 when order amount is below minimum requirement", async () => {
    const req = createRequest({ code: "save10", amount: 30 });
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.message).toContain("订单金额不满足最低要求");
    expect(data.message).toContain("50.00");
  });

  // -------------------------------------------------------------------------
  // 9. FIXED discount capped at order amount
  // -------------------------------------------------------------------------

  it("caps FIXED discount at order amount when coupon value exceeds it", async () => {
    mockCouponFindUnique.mockResolvedValue({
      ...mockCoupon,
      value: 200, // coupon worth more than the order
      minAmount: 0,
    });

    const req = createRequest({ code: "save10", amount: 50 });
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    // FIXED: Math.min(200, 50) = 50
    expect(data.discount).toBe(50);
    expect(data.couponId).toBe("coupon-1");
  });

  // -------------------------------------------------------------------------
  // 10. Invalid request body — returns 400
  // -------------------------------------------------------------------------

  it("returns 400 for missing code in request body", async () => {
    const req = createRequest({ amount: 100 });
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.message).toBe("验证失败");
  });

  it("returns 400 for missing amount in request body", async () => {
    const req = createRequest({ code: "save10" });
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.message).toBe("验证失败");
  });

  it("returns 400 for malformed JSON body", async () => {
    const req = new NextRequest("http://localhost:3001/api/coupons/validate", {
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

  // -------------------------------------------------------------------------
  // 11. Server error — returns 500
  // -------------------------------------------------------------------------

  it("returns 500 when the database throws an error", async () => {
    mockCouponFindUnique.mockRejectedValue(new Error("DB connection failed"));

    const req = createRequest({ code: "save10", amount: 100 });
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.message).toBe("服务器内部错误");
  });
});
