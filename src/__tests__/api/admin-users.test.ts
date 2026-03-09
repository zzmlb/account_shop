import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mock functions ───────────────────────────────────────────────
const mockUserFindMany = vi.fn();
const mockUserFindUnique = vi.fn();
const mockUserCount = vi.fn();
const mockUserUpdate = vi.fn();
const mockUserUpdateMany = vi.fn();
const mockBalanceLogCreate = vi.fn();
const mockTransaction = vi.fn().mockImplementation(async (fn: Function) => {
  return fn({
    user: { update: mockUserUpdate },
    balanceLog: { create: mockBalanceLogCreate },
  });
});

vi.mock("@/server/db", () => ({
  db: {
    user: {
      findMany: (...args: unknown[]) => mockUserFindMany(...args),
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
      count: (...args: unknown[]) => mockUserCount(...args),
      update: (...args: unknown[]) => mockUserUpdate(...args),
      updateMany: (...args: unknown[]) => mockUserUpdateMany(...args),
    },
    balanceLog: {
      create: (...args: unknown[]) => mockBalanceLogCreate(...args),
    },
    $transaction: (...args: unknown[]) => mockTransaction(...args),
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
    if (mockAdminSession.role === "USER") {
      const { NextResponse } = require("next/server");
      return { session: null, error: NextResponse.json({ success: false, message: "无管理员权限" }, { status: 403 }) };
    }
    return { session: mockAdminSession, error: null };
  },
}));

vi.mock("@/lib/audit", () => ({
  logAdminAction: vi.fn(),
}));

vi.mock("@/server/services/email", () => ({
  sendBalanceAdjustment: vi.fn().mockResolvedValue(undefined),
  sendAccountStatusChange: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/pagination", () => ({
  parsePagination: (_sp: URLSearchParams, opts: { pageSize: number }) => ({
    page: Number(_sp.get("page")) || 1,
    pageSize: opts.pageSize,
  }),
  paginationMeta: (total: number, page: number, pageSize: number) => ({
    total, page, pageSize, totalPages: Math.ceil(total / pageSize),
  }),
}));

// ─── Import route AFTER mocks ────────────────────────────────────
const { GET, PUT, PATCH } = await import(
  "@/app/api/admin/users/route"
);

// ─── Helpers ─────────────────────────────────────────────────────
const now = new Date();

function buildMockUser(overrides: Record<string, unknown> = {}) {
  return {
    id: "u1",
    username: "testuser",
    email: "test@test.com",
    avatar: null,
    balance: 100,
    role: "USER",
    status: "ACTIVE",
    createdAt: now,
    updatedAt: now,
    _count: { orders: 5 },
    orders: [
      { payAmount: 50 },
      { payAmount: 30 },
    ],
    loginLogs: [
      { createdAt: now },
    ],
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────
describe("Admin Users API — /api/admin/users", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdminSession = { id: "admin-1", role: "ADMIN" };
  });

  // ──────────────────────────── GET ────────────────────────────

  describe("GET", () => {
    it("1. returns users list with pagination", async () => {
      const user = buildMockUser();
      mockUserFindMany.mockResolvedValue([user]);
      mockUserCount.mockResolvedValue(1);

      const req = new NextRequest("http://localhost/api/admin/users");
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.users).toHaveLength(1);
      expect(json.users[0].id).toBe("u1");
      expect(json.users[0].username).toBe("testuser");
      expect(json.users[0].email).toBe("test@test.com");
      expect(json.users[0].balance).toBe(100);
      expect(json.users[0].role).toBe("USER");
      expect(json.users[0].status).toBe("ACTIVE");
      expect(json.users[0].orderCount).toBe(5);
      expect(json.users[0].totalSpent).toBe(80);
      expect(json.users[0].lastLoginAt).toBe(now.toISOString());
      expect(json.pagination).toBeDefined();
      expect(json.pagination.total).toBe(1);
    });

    it("2. filters by search query", async () => {
      mockUserFindMany.mockResolvedValue([]);
      mockUserCount.mockResolvedValue(0);

      const req = new NextRequest("http://localhost/api/admin/users?search=testuser");
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);

      const findManyCall = mockUserFindMany.mock.calls[0][0];
      expect(findManyCall.where.OR).toBeDefined();
      expect(findManyCall.where.OR).toHaveLength(2);
      expect(findManyCall.where.OR[0]).toEqual({
        username: { contains: "testuser", mode: "insensitive" },
      });
      expect(findManyCall.where.OR[1]).toEqual({
        email: { contains: "testuser", mode: "insensitive" },
      });
    });

    it("3. filters by role", async () => {
      mockUserFindMany.mockResolvedValue([]);
      mockUserCount.mockResolvedValue(0);

      const req = new NextRequest("http://localhost/api/admin/users?role=ADMIN");
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);

      const findManyCall = mockUserFindMany.mock.calls[0][0];
      expect(findManyCall.where.role).toBe("ADMIN");
    });

    it("4. filters by status", async () => {
      mockUserFindMany.mockResolvedValue([]);
      mockUserCount.mockResolvedValue(0);

      const req = new NextRequest("http://localhost/api/admin/users?status=BANNED");
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);

      const findManyCall = mockUserFindMany.mock.calls[0][0];
      expect(findManyCall.where.status).toBe("BANNED");
    });

    it("5. returns 401 for unauthenticated and 403 for non-admin", async () => {
      // 401 — not logged in
      mockAdminSession = null;
      const req1 = new NextRequest("http://localhost/api/admin/users");
      const res1 = await GET(req1);
      expect(res1.status).toBe(401);
      const json1 = await res1.json();
      expect(json1.success).toBe(false);

      // 403 — logged in but not admin
      mockAdminSession = { id: "user-1", role: "USER" };
      const req2 = new NextRequest("http://localhost/api/admin/users");
      const res2 = await GET(req2);
      expect(res2.status).toBe(403);
      const json2 = await res2.json();
      expect(json2.success).toBe(false);
    });
  });

  // ──────────────────────────── PUT ────────────────────────────

  describe("PUT", () => {
    it("6. updates user status (ban)", async () => {
      const existing = buildMockUser();
      mockUserFindUnique.mockResolvedValue(existing);

      const updated = buildMockUser({ status: "BANNED" });
      mockUserUpdate.mockResolvedValue(updated);

      const req = new NextRequest("http://localhost/api/admin/users?id=u1", {
        method: "PUT",
        body: JSON.stringify({ status: "BANNED" }),
      });

      const res = await PUT(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.message).toBe("用户信息已更新");
      expect(json.user.status).toBe("BANNED");
    });

    it("7. returns 400 when id missing", async () => {
      const req = new NextRequest("http://localhost/api/admin/users", {
        method: "PUT",
        body: JSON.stringify({ status: "BANNED" }),
      });

      const res = await PUT(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message).toBe("缺少用户ID参数");
    });

    it("8. returns 404 when user not found", async () => {
      mockUserFindUnique.mockResolvedValue(null);

      const req = new NextRequest("http://localhost/api/admin/users?id=nonexistent", {
        method: "PUT",
        body: JSON.stringify({ status: "BANNED" }),
      });

      const res = await PUT(req);
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.success).toBe(false);
      expect(json.message).toBe("用户不存在");
    });

    it("9. returns 400 when modifying self", async () => {
      const existing = buildMockUser({ id: "admin-1" });
      mockUserFindUnique.mockResolvedValue(existing);

      const req = new NextRequest("http://localhost/api/admin/users?id=admin-1", {
        method: "PUT",
        body: JSON.stringify({ status: "BANNED" }),
      });

      const res = await PUT(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message).toBe("不能修改自己的账户");
    });

    it("10. returns 403 when non-super-admin modifying super-admin", async () => {
      mockAdminSession = { id: "admin-1", role: "ADMIN" };
      const existing = buildMockUser({ id: "super-1", role: "SUPER_ADMIN" });
      mockUserFindUnique.mockResolvedValue(existing);

      const req = new NextRequest("http://localhost/api/admin/users?id=super-1", {
        method: "PUT",
        body: JSON.stringify({ status: "BANNED" }),
      });

      const res = await PUT(req);
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.success).toBe(false);
      expect(json.message).toBe("权限不足，无法修改超级管理员");
    });

    it("11. returns 400 for invalid status", async () => {
      const existing = buildMockUser();
      mockUserFindUnique.mockResolvedValue(existing);

      const req = new NextRequest("http://localhost/api/admin/users?id=u1", {
        method: "PUT",
        body: JSON.stringify({ status: "INVALID" }),
      });

      const res = await PUT(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message).toContain("无效的用户状态");
    });

    it("12. returns 400 for zero balance adjust", async () => {
      const existing = buildMockUser();
      mockUserFindUnique.mockResolvedValue(existing);

      const req = new NextRequest("http://localhost/api/admin/users?id=u1", {
        method: "PUT",
        body: JSON.stringify({ balanceAdjust: 0 }),
      });

      const res = await PUT(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message).toBe("余额调整金额必须为非零数值");
    });

    it("13. returns 400 when balance would go negative", async () => {
      const existing = buildMockUser({ balance: 100 });
      mockUserFindUnique.mockResolvedValue(existing);

      const req = new NextRequest("http://localhost/api/admin/users?id=u1", {
        method: "PUT",
        body: JSON.stringify({ balanceAdjust: -200 }),
      });

      const res = await PUT(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message).toContain("余额不足");
    });
  });

  // ──────────────────────────── PATCH ────────────────────────────

  describe("PATCH", () => {
    it("14. batch bans users", async () => {
      mockUserUpdateMany.mockResolvedValue({ count: 2 });

      const req = new NextRequest("http://localhost/api/admin/users", {
        method: "PATCH",
        body: JSON.stringify({ ids: ["u1", "u2", "u3"], status: "BANNED" }),
      });

      const res = await PATCH(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.affected).toBe(2);
      expect(json.message).toContain("封禁");
      expect(json.message).toContain("2");

      expect(mockUserUpdateMany).toHaveBeenCalledWith({
        where: {
          id: { in: ["u1", "u2", "u3"] },
          role: { not: "SUPER_ADMIN" },
          status: { not: "BANNED" },
        },
        data: { status: "BANNED" },
      });
    });

    it("15. returns 400 for invalid batch status", async () => {
      const req = new NextRequest("http://localhost/api/admin/users", {
        method: "PATCH",
        body: JSON.stringify({ ids: ["u1"], status: "INACTIVE" }),
      });

      const res = await PATCH(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message).toBe("批量操作仅支持封禁/解封");
    });

    it("16. returns 400 when no ids provided", async () => {
      const req = new NextRequest("http://localhost/api/admin/users", {
        method: "PATCH",
        body: JSON.stringify({ ids: [], status: "BANNED" }),
      });

      const res = await PATCH(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message).toBe("请选择至少一个用户");
    });
  });
});
