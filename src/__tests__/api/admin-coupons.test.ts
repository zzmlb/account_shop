import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Mocks – must be declared before importing the route module
// ---------------------------------------------------------------------------

const mockCouponFindMany = vi.fn();
const mockCouponFindUnique = vi.fn();
const mockCouponCreate = vi.fn();
const mockCouponUpdate = vi.fn();
const mockCouponDelete = vi.fn();
const mockCouponDeleteMany = vi.fn();
const mockUserCouponDeleteMany = vi.fn();

vi.mock("@/server/db", () => ({
  db: {
    coupon: {
      findMany: (...args: unknown[]) => mockCouponFindMany(...args),
      findUnique: (...args: unknown[]) => mockCouponFindUnique(...args),
      create: (...args: unknown[]) => mockCouponCreate(...args),
      update: (...args: unknown[]) => mockCouponUpdate(...args),
      delete: (...args: unknown[]) => mockCouponDelete(...args),
      deleteMany: (...args: unknown[]) => mockCouponDeleteMany(...args),
    },
    userCoupon: {
      deleteMany: (...args: unknown[]) => mockUserCouponDeleteMany(...args),
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

// Mock admin auth
const mockGetAdminSession = vi.fn();
vi.mock("@/lib/admin-auth", () => ({
  getAdminSession: (...args: unknown[]) => mockGetAdminSession(...args),
}));

// Mock validators
vi.mock("@/lib/validators", () => ({
  createCouponSchema: {
    safeParse: (data: any) => {
      if (!data?.code || !data?.type || data?.value === undefined || !data?.startAt || !data?.expireAt) {
        return {
          success: false,
          error: { errors: [{ message: "验证失败" }] },
        };
      }
      return { success: true, data };
    },
  },
  updateCouponSchema: {
    safeParse: (data: any) => {
      if (!data?.id) {
        return {
          success: false,
          error: { errors: [{ message: "缺少优惠券ID" }] },
        };
      }
      return { success: true, data };
    },
  },
  formatZodError: () => "验证失败",
}));

// ---------------------------------------------------------------------------
// Import route handlers AFTER mocks
// ---------------------------------------------------------------------------

import { GET, POST, PUT, DELETE } from "@/app/api/admin/coupons/route";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setupAdmin(id = "admin-1") {
  mockGetAdminSession.mockReturnValue({
    session: { id, username: "admin", email: "admin@test.com", role: "ADMIN" },
    error: null,
  });
}

function setupUnauth() {
  const { NextResponse } = require("next/server");
  mockGetAdminSession.mockReturnValue({
    session: null,
    error: NextResponse.json({ success: false, message: "未登录" }, { status: 401 }),
  });
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const now = new Date();
const tomorrow = new Date(Date.now() + 86400000);

const mockCoupon = {
  id: "c1",
  code: "SAVE10",
  type: "PERCENTAGE",
  value: 10,
  minAmount: null,
  maxUses: 100,
  usedCount: 0,
  startAt: now,
  expireAt: tomorrow,
  isActive: true,
  createdAt: now,
  _count: { users: 5 },
};

// ---------------------------------------------------------------------------
// Request factories
// ---------------------------------------------------------------------------

function createGetRequest(params?: Record<string, string>) {
  const url = new URL("http://localhost:3001/api/admin/coupons");
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  return new NextRequest(url.toString(), { method: "GET" });
}

function createPostRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost:3001/api/admin/coupons", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function createPutRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost:3001/api/admin/coupons", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function createDeleteRequest(params?: Record<string, string>) {
  const url = new URL("http://localhost:3001/api/admin/coupons");
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  return new NextRequest(url.toString(), { method: "DELETE" });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Admin Coupons API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // GET
  // =========================================================================

  describe("GET /api/admin/coupons", () => {
    it("should return coupons list", async () => {
      setupAdmin();
      mockCouponFindMany.mockResolvedValue([mockCoupon]);

      const response = await GET(createGetRequest());
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.coupons).toHaveLength(1);
      expect(data.coupons[0]).toMatchObject({
        id: "c1",
        code: "SAVE10",
        type: "PERCENTAGE",
        value: 10,
        minAmount: null,
        maxUses: 100,
        usedCount: 0,
        isActive: true,
        claimedCount: 5,
      });
    });

    it("should filter active coupons", async () => {
      setupAdmin();
      mockCouponFindMany.mockResolvedValue([mockCoupon]);

      const response = await GET(createGetRequest({ status: "active" }));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockCouponFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
            expireAt: expect.objectContaining({ gt: expect.any(Date) }),
          }),
        })
      );
    });

    it("should return 401 when not authenticated", async () => {
      setupUnauth();

      const response = await GET(createGetRequest());
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.message).toBe("未登录");
    });
  });

  // =========================================================================
  // POST
  // =========================================================================

  describe("POST /api/admin/coupons", () => {
    const validBody = {
      code: "save10",
      type: "PERCENTAGE",
      value: 10,
      minAmount: null,
      maxUses: 100,
      startAt: now.toISOString(),
      expireAt: tomorrow.toISOString(),
    };

    it("should create coupon successfully with code uppercased", async () => {
      setupAdmin();
      mockCouponFindUnique.mockResolvedValue(null); // code not taken
      mockCouponCreate.mockResolvedValue({
        id: "c-new",
        code: "SAVE10",
        type: "PERCENTAGE",
        value: 10,
      });

      const response = await POST(createPostRequest(validBody));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.coupon.code).toBe("SAVE10");
      expect(data.message).toBe("优惠券创建成功");
      // Verify findUnique was called with uppercased code
      expect(mockCouponFindUnique).toHaveBeenCalledWith({
        where: { code: "SAVE10" },
      });
      // Verify create was called with uppercased code and isActive true
      expect(mockCouponCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          code: "SAVE10",
          isActive: true,
        }),
      });
    });

    it("should return 400 on validation error", async () => {
      setupAdmin();

      const response = await POST(createPostRequest({ code: "TEST" }));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toBe("验证失败");
    });

    it("should return 400 when code already exists", async () => {
      setupAdmin();
      mockCouponFindUnique.mockResolvedValue({ id: "existing", code: "SAVE10" });

      const response = await POST(createPostRequest(validBody));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toBe("优惠码已存在");
    });

    it("should return 401 when not admin", async () => {
      setupUnauth();

      const response = await POST(createPostRequest(validBody));
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.message).toBe("未登录");
    });
  });

  // =========================================================================
  // PUT
  // =========================================================================

  describe("PUT /api/admin/coupons", () => {
    it("should update coupon successfully", async () => {
      setupAdmin();
      mockCouponFindUnique.mockResolvedValue({ ...mockCoupon });
      mockCouponUpdate.mockResolvedValue({
        id: "c1",
        code: "SAVE10",
        isActive: false,
      });

      const response = await PUT(
        createPutRequest({ id: "c1", isActive: false })
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe("优惠券更新成功");
      expect(data.coupon).toEqual({
        id: "c1",
        code: "SAVE10",
        isActive: false,
      });
      expect(mockCouponUpdate).toHaveBeenCalledWith({
        where: { id: "c1" },
        data: expect.objectContaining({ isActive: false }),
      });
    });

    it("should return 404 when coupon not found", async () => {
      setupAdmin();
      mockCouponFindUnique.mockResolvedValue(null);

      const response = await PUT(
        createPutRequest({ id: "nonexistent", isActive: false })
      );
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.message).toBe("优惠券不存在");
    });

    it("should return 400 on validation error", async () => {
      setupAdmin();

      const response = await PUT(createPutRequest({ isActive: false }));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toBe("验证失败");
    });
  });

  // =========================================================================
  // DELETE
  // =========================================================================

  describe("DELETE /api/admin/coupons", () => {
    it("should delete coupon with userCoupon cleanup", async () => {
      setupAdmin();
      mockCouponFindUnique.mockResolvedValue({ ...mockCoupon, usedCount: 0 });
      mockUserCouponDeleteMany.mockResolvedValue({ count: 2 });
      mockCouponDelete.mockResolvedValue({ id: "c1" });

      const response = await DELETE(createDeleteRequest({ id: "c1" }));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe("优惠券已删除");
      // Verify userCoupon cleanup happened before coupon delete
      expect(mockUserCouponDeleteMany).toHaveBeenCalledWith({
        where: { couponId: "c1" },
      });
      expect(mockCouponDelete).toHaveBeenCalledWith({
        where: { id: "c1" },
      });
    });

    it("should return 400 when usedCount > 0", async () => {
      setupAdmin();
      mockCouponFindUnique.mockResolvedValue({ ...mockCoupon, usedCount: 3 });

      const response = await DELETE(createDeleteRequest({ id: "c1" }));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toBe("已使用的优惠券不能删除");
    });

    it("should return 404 when coupon not found", async () => {
      setupAdmin();
      mockCouponFindUnique.mockResolvedValue(null);

      const response = await DELETE(createDeleteRequest({ id: "nonexistent" }));
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.message).toBe("优惠券不存在");
    });

    it("should batch delete expired coupons with mode=expired", async () => {
      setupAdmin();
      const expiredCoupons = [
        { id: "exp-1", code: "OLD1" },
        { id: "exp-2", code: "OLD2" },
      ];
      mockCouponFindMany.mockResolvedValue(expiredCoupons);
      mockUserCouponDeleteMany.mockResolvedValue({ count: 0 });
      mockCouponDeleteMany.mockResolvedValue({ count: 2 });

      const response = await DELETE(createDeleteRequest({ mode: "expired" }));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.deleted).toBe(2);
      // Verify userCoupon cleanup for all expired IDs
      expect(mockUserCouponDeleteMany).toHaveBeenCalledWith({
        where: { couponId: { in: ["exp-1", "exp-2"] } },
      });
      // Verify batch coupon delete
      expect(mockCouponDeleteMany).toHaveBeenCalledWith({
        where: { id: { in: ["exp-1", "exp-2"] } },
      });
    });
  });
});
