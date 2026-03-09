import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mock functions ───────────────────────────────────────────────
const mockOrderCount = vi.fn();
const mockOrderAggregate = vi.fn();
const mockProductCount = vi.fn();
const mockUserCount = vi.fn();
const mockUserFindMany = vi.fn();
const mockCouponCount = vi.fn();
const mockRefundRequestCount = vi.fn();
const mockContactMessageCount = vi.fn();
const mockQueryRaw = vi.fn();
const mockNotificationCreateMany = vi.fn();

vi.mock("@/server/db", () => ({
  db: {
    order: {
      count: (...args: unknown[]) => mockOrderCount(...args),
      aggregate: (...args: unknown[]) => mockOrderAggregate(...args),
    },
    product: {
      count: (...args: unknown[]) => mockProductCount(...args),
    },
    user: {
      count: (...args: unknown[]) => mockUserCount(...args),
      findMany: (...args: unknown[]) => mockUserFindMany(...args),
    },
    coupon: {
      count: (...args: unknown[]) => mockCouponCount(...args),
    },
    refundRequest: {
      count: (...args: unknown[]) => mockRefundRequestCount(...args),
    },
    contactMessage: {
      count: (...args: unknown[]) => mockContactMessageCount(...args),
    },
    notification: {
      createMany: (...args: unknown[]) => mockNotificationCreateMany(...args),
    },
    $queryRaw: (...args: unknown[]) => mockQueryRaw(...args),
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
    info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(),
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
      return { session: null, error: NextResponse.json({ success: false, message: "无管理员权限" }, { status: 403 }) };
    }
    return { session: mockAdminSession, error: null };
  },
}));

vi.mock("@/lib/audit", () => ({
  logAdminAction: vi.fn(),
}));

const mockSafeParse = vi.fn();
vi.mock("@/lib/validators", () => ({
  broadcastNotificationSchema: {
    safeParse: (...args: unknown[]) => mockSafeParse(...args),
  },
  formatZodError: () => "验证失败",
}));

// ─── Import route AFTER mocks ────────────────────────────────────
const { GET, POST } = await import("@/app/api/admin/notifications/route");

// ─── Helpers ─────────────────────────────────────────────────────
function setupDefaultGetMocks() {
  // order.count is called twice: pendingOrders, then todayOrders
  mockOrderCount
    .mockResolvedValueOnce(0)   // pendingOrders
    .mockResolvedValueOnce(0);  // todayOrders

  // product.count is called twice: lowStockProducts, then outOfStockProducts
  mockProductCount
    .mockResolvedValueOnce(0)   // lowStockProducts
    .mockResolvedValueOnce(0);  // outOfStockProducts

  mockOrderAggregate.mockResolvedValue({ _sum: { payAmount: 0 } });
  mockUserCount.mockResolvedValue(0);
  mockCouponCount.mockResolvedValue(0);
  mockRefundRequestCount.mockResolvedValue(0);
  mockContactMessageCount.mockResolvedValue(0);
  mockQueryRaw.mockResolvedValue([{ cnt: BigInt(0) }]);
}

// ─── Tests ───────────────────────────────────────────────────────
describe("Admin Notifications API — /api/admin/notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdminSession = { id: "admin-1", role: "ADMIN" };
  });

  // ──────────────────────────── GET ────────────────────────────

  describe("GET", () => {
    it("1. returns empty notifications when all counts are 0", async () => {
      setupDefaultGetMocks();

      const req = new NextRequest("http://localhost/api/admin/notifications");
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.count).toBe(0);
      expect(json.notifications).toEqual([]);
    });

    it("2. returns 401 when not authenticated", async () => {
      mockAdminSession = null;

      const req = new NextRequest("http://localhost/api/admin/notifications");
      const res = await GET(req);

      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.success).toBe(false);
    });

    it("3. generates out-of-stock alert when outOfStockProducts > 0", async () => {
      // pendingOrders = 0
      mockOrderCount
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);
      // lowStockProducts = 0, outOfStockProducts = 3
      mockProductCount
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(3);
      mockOrderAggregate.mockResolvedValue({ _sum: { payAmount: 0 } });
      mockUserCount.mockResolvedValue(0);
      mockCouponCount.mockResolvedValue(0);
      mockRefundRequestCount.mockResolvedValue(0);
      mockContactMessageCount.mockResolvedValue(0);
      mockQueryRaw.mockResolvedValue([{ cnt: BigInt(0) }]);

      const req = new NextRequest("http://localhost/api/admin/notifications");
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      const outOfStock = json.notifications.find(
        (n: { id: string }) => n.id === "out-of-stock"
      );
      expect(outOfStock).toBeDefined();
      expect(outOfStock.type).toBe("alert");
      expect(outOfStock.title).toContain("3");
      expect(outOfStock.title).toContain("售罄");
    });

    it("4. generates pending-orders warning when pendingOrders > 0", async () => {
      // pendingOrders = 5, todayOrders = 0
      mockOrderCount
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(0);
      mockProductCount
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);
      mockOrderAggregate.mockResolvedValue({ _sum: { payAmount: 0 } });
      mockUserCount.mockResolvedValue(0);
      mockCouponCount.mockResolvedValue(0);
      mockRefundRequestCount.mockResolvedValue(0);
      mockContactMessageCount.mockResolvedValue(0);
      mockQueryRaw.mockResolvedValue([{ cnt: BigInt(0) }]);

      const req = new NextRequest("http://localhost/api/admin/notifications");
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      const pending = json.notifications.find(
        (n: { id: string }) => n.id === "pending-orders"
      );
      expect(pending).toBeDefined();
      expect(pending.type).toBe("warning");
      expect(pending.title).toContain("5");
      expect(pending.title).toContain("待处理订单");
    });

    it("5. generates stock-mismatch alert when $queryRaw returns non-zero", async () => {
      mockOrderCount
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);
      mockProductCount
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);
      mockOrderAggregate.mockResolvedValue({ _sum: { payAmount: 0 } });
      mockUserCount.mockResolvedValue(0);
      mockCouponCount.mockResolvedValue(0);
      mockRefundRequestCount.mockResolvedValue(0);
      mockContactMessageCount.mockResolvedValue(0);
      mockQueryRaw.mockResolvedValue([{ cnt: BigInt(7) }]);

      const req = new NextRequest("http://localhost/api/admin/notifications");
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      const mismatch = json.notifications.find(
        (n: { id: string }) => n.id === "stock-mismatch"
      );
      expect(mismatch).toBeDefined();
      expect(mismatch.type).toBe("alert");
      expect(mismatch.title).toContain("7");
      expect(mismatch.title).toContain("库存数据不一致");
    });

    it("6. returns correct count matching notifications array length", async () => {
      // Set multiple conditions to trigger several notifications
      // pendingOrders = 2, todayOrders = 10
      mockOrderCount
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(10);
      // lowStockProducts = 3, outOfStockProducts = 1
      mockProductCount
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(1);
      mockOrderAggregate.mockResolvedValue({ _sum: { payAmount: 500 } });
      mockUserCount.mockResolvedValue(4);
      mockCouponCount.mockResolvedValue(2);
      mockRefundRequestCount.mockResolvedValue(1);
      mockContactMessageCount.mockResolvedValue(5);
      mockQueryRaw.mockResolvedValue([{ cnt: BigInt(2) }]);

      const req = new NextRequest("http://localhost/api/admin/notifications");
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.count).toBe(json.notifications.length);
      // All conditions are non-zero, so all 9 notification types should be present
      expect(json.count).toBe(9);
    });

    it("7. returns 500 on error", async () => {
      mockOrderCount.mockRejectedValue(new Error("DB connection failed"));

      const req = new NextRequest("http://localhost/api/admin/notifications");
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.success).toBe(false);
      expect(json.message).toBe("服务器内部错误");
    });
  });

  // ──────────────────────────── POST ────────────────────────────

  describe("POST", () => {
    it("8. broadcasts to specific userIds", async () => {
      mockSafeParse.mockReturnValue({
        success: true,
        data: {
          title: "系统通知",
          content: "测试内容",
          href: "/news",
          userIds: ["u1", "u2", "u3"],
        },
      });
      mockNotificationCreateMany.mockResolvedValue({ count: 3 });

      const req = new NextRequest("http://localhost/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "系统通知",
          content: "测试内容",
          href: "/news",
          userIds: ["u1", "u2", "u3"],
        }),
      });

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.count).toBe(3);
      expect(json.message).toContain("3");
      expect(mockNotificationCreateMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ userId: "u1", type: "SYSTEM", title: "系统通知" }),
          expect.objectContaining({ userId: "u2", type: "SYSTEM", title: "系统通知" }),
          expect.objectContaining({ userId: "u3", type: "SYSTEM", title: "系统通知" }),
        ]),
      });
      // Should NOT call user.findMany when specific userIds are provided
      expect(mockUserFindMany).not.toHaveBeenCalled();
    });

    it("9. broadcasts to all active users when no userIds provided", async () => {
      mockSafeParse.mockReturnValue({
        success: true,
        data: {
          title: "全站公告",
          content: "系统维护通知",
        },
      });
      mockUserFindMany.mockResolvedValue([
        { id: "u1" },
        { id: "u2" },
        { id: "u5" },
      ]);
      mockNotificationCreateMany.mockResolvedValue({ count: 3 });

      const req = new NextRequest("http://localhost/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "全站公告",
          content: "系统维护通知",
        }),
      });

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.count).toBe(3);
      expect(mockUserFindMany).toHaveBeenCalledWith({
        where: { status: "ACTIVE" },
        select: { id: true },
      });
      expect(mockNotificationCreateMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ userId: "u1", type: "SYSTEM", title: "全站公告" }),
          expect.objectContaining({ userId: "u2", type: "SYSTEM", title: "全站公告" }),
          expect.objectContaining({ userId: "u5", type: "SYSTEM", title: "全站公告" }),
        ]),
      });
    });

    it("10. returns 400 for validation error", async () => {
      mockSafeParse.mockReturnValue({
        success: false,
        error: { errors: [{ message: "验证失败" }] },
      });

      const req = new NextRequest("http://localhost/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "" }),
      });

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message).toBe("验证失败");
    });

    it("11. returns 400 when no target users", async () => {
      mockSafeParse.mockReturnValue({
        success: true,
        data: {
          title: "公告",
          content: "无人可接收",
        },
      });
      // No userIds provided, and no active users exist
      mockUserFindMany.mockResolvedValue([]);

      const req = new NextRequest("http://localhost/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "公告",
          content: "无人可接收",
        }),
      });

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message).toBe("没有可发送的目标用户");
    });

    it("12. returns 500 on error", async () => {
      mockSafeParse.mockReturnValue({
        success: true,
        data: {
          title: "公告",
          content: "出错了",
          userIds: ["u1"],
        },
      });
      mockNotificationCreateMany.mockRejectedValue(new Error("DB write failed"));

      const req = new NextRequest("http://localhost/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "公告",
          content: "出错了",
          userIds: ["u1"],
        }),
      });

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.success).toBe(false);
      expect(json.message).toBe("发送失败");
    });
  });
});
