import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mock functions ───────────────────────────────────────────────
const mockUserFindUnique = vi.fn();
const mockOrderFindMany = vi.fn();
const mockOrderAggregate = vi.fn();
const mockBalanceLogFindMany = vi.fn();
const mockLoginLogFindMany = vi.fn();

vi.mock("@/server/db", () => ({
  db: {
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
    },
    order: {
      findMany: (...args: unknown[]) => mockOrderFindMany(...args),
      aggregate: (...args: unknown[]) => mockOrderAggregate(...args),
    },
    balanceLog: {
      findMany: (...args: unknown[]) => mockBalanceLogFindMany(...args),
    },
    loginLog: {
      findMany: (...args: unknown[]) => mockLoginLogFindMany(...args),
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

// ─── Import route AFTER mocks ────────────────────────────────────
const { GET } = await import("@/app/api/admin/users/[id]/route");

// ─── Mock data ───────────────────────────────────────────────────
const now = new Date("2026-03-08T10:00:00Z");

const mockUser = {
  id: "user-1",
  username: "testuser",
  email: "test@example.com",
  avatar: "/avatar.jpg",
  balance: 500.50,
  role: "USER",
  status: "ACTIVE",
  createdAt: now,
  updatedAt: now,
  _count: { orders: 10, reviews: 5, favorites: 3, notifications: 20 },
};

const mockRecentOrders = [
  {
    id: "order-1",
    orderNo: "PJ37-20260308-AAA1",
    totalAmount: 99.99,
    payAmount: 89.99,
    status: "DELIVERED",
    paymentMethod: "BALANCE",
    createdAt: now,
  },
  {
    id: "order-2",
    orderNo: "PJ37-20260307-BBB2",
    totalAmount: 49.99,
    payAmount: 49.99,
    status: "PAID",
    paymentMethod: "BALANCE",
    createdAt: now,
  },
];

const mockRecentBalanceLogs = [
  {
    id: "bl-1",
    amount: -89.99,
    type: "PURCHASE",
    description: "购买商品",
    createdAt: now,
  },
];

const mockRecentLoginLogs = [
  {
    id: "ll-1",
    ip: "192.168.1.1",
    userAgent: "Mozilla/5.0",
    success: true,
    createdAt: now,
  },
];

const mockAggregateResult = {
  _sum: { payAmount: 139.98 },
};

// ─── Tests ───────────────────────────────────────────────────────
describe("Admin User Detail API — /api/admin/users/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdminSession = { id: "admin-1", role: "ADMIN" };
  });

  describe("GET", () => {
    it("1. returns user detail with counts, recent orders/balanceLogs/loginLogs, and totalSpent", async () => {
      mockUserFindUnique.mockResolvedValue({ ...mockUser });
      mockOrderFindMany.mockResolvedValue([...mockRecentOrders]);
      mockBalanceLogFindMany.mockResolvedValue([...mockRecentBalanceLogs]);
      mockLoginLogFindMany.mockResolvedValue([...mockRecentLoginLogs]);
      mockOrderAggregate.mockResolvedValue({ ...mockAggregateResult });

      const req = new NextRequest("http://localhost/api/admin/users/user-1");
      const res = await GET(req, { params: Promise.resolve({ id: "user-1" }) });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);

      // User fields
      expect(json.user.id).toBe("user-1");
      expect(json.user.username).toBe("testuser");
      expect(json.user.email).toBe("test@example.com");
      expect(json.user.avatar).toBe("/avatar.jpg");
      expect(json.user.role).toBe("USER");
      expect(json.user.status).toBe("ACTIVE");
      expect(json.user.createdAt).toBe(now.toISOString());
      expect(json.user.updatedAt).toBe(now.toISOString());

      // Counts
      expect(json.user.counts.orders).toBe(10);
      expect(json.user.counts.reviews).toBe(5);
      expect(json.user.counts.favorites).toBe(3);
      expect(json.user.counts.notifications).toBe(20);

      // Total spent
      expect(json.user.totalSpent).toBe(139.98);

      // Recent orders
      expect(json.recentOrders).toHaveLength(2);
      expect(json.recentOrders[0].id).toBe("order-1");
      expect(json.recentOrders[0].orderNo).toBe("PJ37-20260308-AAA1");
      expect(json.recentOrders[0].status).toBe("DELIVERED");

      // Recent balance logs
      expect(json.recentBalanceLogs).toHaveLength(1);
      expect(json.recentBalanceLogs[0].id).toBe("bl-1");
      expect(json.recentBalanceLogs[0].type).toBe("PURCHASE");

      // Recent login logs
      expect(json.recentLoginLogs).toHaveLength(1);
      expect(json.recentLoginLogs[0].id).toBe("ll-1");
      expect(json.recentLoginLogs[0].ip).toBe("192.168.1.1");
      expect(json.recentLoginLogs[0].success).toBe(true);
    });

    it("2. returns 401 when not authenticated", async () => {
      mockAdminSession = null;

      const req = new NextRequest("http://localhost/api/admin/users/user-1");
      const res = await GET(req, { params: Promise.resolve({ id: "user-1" }) });
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.success).toBe(false);
      expect(mockUserFindUnique).not.toHaveBeenCalled();
    });

    it("3. returns 404 when user not found", async () => {
      mockUserFindUnique.mockResolvedValue(null);

      const req = new NextRequest("http://localhost/api/admin/users/nonexistent");
      const res = await GET(req, { params: Promise.resolve({ id: "nonexistent" }) });
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.success).toBe(false);
      expect(json.message).toBe("用户不存在");
      expect(mockOrderFindMany).not.toHaveBeenCalled();
      expect(mockOrderAggregate).not.toHaveBeenCalled();
    });

    it("4. converts balance and totalSpent to numbers", async () => {
      // Prisma Decimal type returns objects; Number() converts them
      const userWithDecimalBalance = { ...mockUser, balance: { toNumber: () => 500.50, toString: () => "500.50" } };
      mockUserFindUnique.mockResolvedValue(userWithDecimalBalance);
      mockOrderFindMany.mockResolvedValue([]);
      mockBalanceLogFindMany.mockResolvedValue([]);
      mockLoginLogFindMany.mockResolvedValue([]);
      mockOrderAggregate.mockResolvedValue({ _sum: { payAmount: { toNumber: () => 250.75, toString: () => "250.75" } } });

      const req = new NextRequest("http://localhost/api/admin/users/user-1");
      const res = await GET(req, { params: Promise.resolve({ id: "user-1" }) });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(typeof json.user.balance).toBe("number");
      expect(typeof json.user.totalSpent).toBe("number");
      expect(json.user.balance).toBe(500.50);
      expect(json.user.totalSpent).toBe(250.75);
    });

    it("5. queries recent orders/logs with correct userId and take:10", async () => {
      mockUserFindUnique.mockResolvedValue({ ...mockUser });
      mockOrderFindMany.mockResolvedValue([]);
      mockBalanceLogFindMany.mockResolvedValue([]);
      mockLoginLogFindMany.mockResolvedValue([]);
      mockOrderAggregate.mockResolvedValue({ _sum: { payAmount: null } });

      const req = new NextRequest("http://localhost/api/admin/users/user-1");
      await GET(req, { params: Promise.resolve({ id: "user-1" }) });

      // Check order.findMany call
      expect(mockOrderFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: "user-1" },
          orderBy: { createdAt: "desc" },
          take: 10,
        })
      );

      // Check balanceLog.findMany call
      expect(mockBalanceLogFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: "user-1" },
          orderBy: { createdAt: "desc" },
          take: 10,
        })
      );

      // Check loginLog.findMany call
      expect(mockLoginLogFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: "user-1" },
          orderBy: { createdAt: "desc" },
          take: 10,
        })
      );

      // Check order.aggregate call
      expect(mockOrderAggregate).toHaveBeenCalledWith({
        where: { userId: "user-1", status: { in: ["PAID", "DELIVERED"] } },
        _sum: { payAmount: true },
      });
    });

    it("6. returns 500 on server error", async () => {
      mockUserFindUnique.mockRejectedValue(new Error("DB connection failed"));

      const req = new NextRequest("http://localhost/api/admin/users/user-1");
      const res = await GET(req, { params: Promise.resolve({ id: "user-1" }) });
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.success).toBe(false);
      expect(json.message).toBe("服务器内部错误");
    });

    it("7. handles null totalSpent (no paid orders) as 0", async () => {
      mockUserFindUnique.mockResolvedValue({ ...mockUser });
      mockOrderFindMany.mockResolvedValue([]);
      mockBalanceLogFindMany.mockResolvedValue([]);
      mockLoginLogFindMany.mockResolvedValue([]);
      mockOrderAggregate.mockResolvedValue({ _sum: { payAmount: null } });

      const req = new NextRequest("http://localhost/api/admin/users/user-1");
      const res = await GET(req, { params: Promise.resolve({ id: "user-1" }) });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.user.totalSpent).toBe(0);
    });

    // -------------------------------------------------------------------
    // Edge cases
    // -------------------------------------------------------------------

    it("returns 403 for non-admin users", async () => {
      mockAdminSession = { id: "user-1", role: "USER" };

      const req = new NextRequest("http://localhost/api/admin/users/user-1");
      const res = await GET(req, { params: Promise.resolve({ id: "user-1" }) });

      expect(res.status).toBe(403);
      expect(mockUserFindUnique).not.toHaveBeenCalled();
    });

    it("selects correct user fields including _count", async () => {
      mockUserFindUnique.mockResolvedValue({ ...mockUser });
      mockOrderFindMany.mockResolvedValue([]);
      mockBalanceLogFindMany.mockResolvedValue([]);
      mockLoginLogFindMany.mockResolvedValue([]);
      mockOrderAggregate.mockResolvedValue({ _sum: { payAmount: null } });

      const req = new NextRequest("http://localhost/api/admin/users/user-1");
      await GET(req, { params: Promise.resolve({ id: "user-1" }) });

      const selectArg = mockUserFindUnique.mock.calls[0][0].select;
      expect(selectArg._count.select).toEqual({
        orders: true,
        reviews: true,
        favorites: true,
        notifications: true,
      });
    });
  });
});
