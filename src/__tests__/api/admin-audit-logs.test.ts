import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Mock functions — declared BEFORE importing the route handler
// ---------------------------------------------------------------------------

const mockAuditLogFindMany = vi.fn();
const mockAuditLogCount = vi.fn();

vi.mock("@/server/db", () => ({
  db: {
    adminAuditLog: {
      findMany: (...args: unknown[]) => mockAuditLogFindMany(...args),
      count: (...args: unknown[]) => mockAuditLogCount(...args),
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
      return { session: null, error: NextResponse.json({ success: false, message: "无权限" }, { status: 403 }) };
    }
    return { session: mockAdminSession, error: null };
  },
}));

vi.mock("@/lib/pagination", () => ({
  parsePagination: (_sp: URLSearchParams, opts: { pageSize: number }) => ({
    page: Number(_sp.get("page")) || 1,
    pageSize: opts.pageSize,
  }),
  paginationMeta: (total: number, page: number, pageSize: number) => ({
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }),
}));

// ---------------------------------------------------------------------------
// Import route handler AFTER all mocks are in place
// ---------------------------------------------------------------------------

const { GET } = await import("@/app/api/admin/audit-logs/route");

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const now = new Date("2026-03-08T12:00:00Z");

const mockLog = {
  id: "log-1",
  adminId: "admin-1",
  action: "user.ban",
  target: "user-42",
  detail: "封禁违规用户",
  ip: "192.168.1.1",
  createdAt: now,
  admin: { id: "admin-1", username: "superadmin" },
};

const mockLog2 = {
  id: "log-2",
  adminId: "admin-1",
  action: "product.update",
  target: "product-7",
  detail: "修改价格",
  ip: "10.0.0.1",
  createdAt: new Date("2026-03-07T10:00:00Z"),
  admin: { id: "admin-1", username: "superadmin" },
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Admin Audit Logs API — /api/admin/audit-logs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdminSession = { id: "admin-1", role: "ADMIN" };
  });

  it("1. returns audit logs with admin username", async () => {
    mockAuditLogFindMany.mockResolvedValue([mockLog, mockLog2]);
    mockAuditLogCount.mockResolvedValue(2);

    const req = new NextRequest("http://localhost/api/admin/audit-logs");
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.logs).toHaveLength(2);
    expect(json.logs[0]).toMatchObject({
      id: "log-1",
      adminUsername: "superadmin",
      action: "user.ban",
      target: "user-42",
      detail: "封禁违规用户",
      ip: "192.168.1.1",
      createdAt: now.toISOString(),
    });
    expect(json.logs[1]).toMatchObject({
      id: "log-2",
      adminUsername: "superadmin",
      action: "product.update",
      target: "product-7",
      detail: "修改价格",
      ip: "10.0.0.1",
    });
  });

  it("2. returns 401 when not authenticated", async () => {
    mockAdminSession = null;

    const req = new NextRequest("http://localhost/api/admin/audit-logs");
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.success).toBe(false);
    expect(json.message).toBe("未登录");
  });

  it("3. returns 403 for non-admin", async () => {
    mockAdminSession = { id: "user-1", role: "USER" };

    const req = new NextRequest("http://localhost/api/admin/audit-logs");
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.success).toBe(false);
    expect(json.message).toBe("无权限");
  });

  it("4. filters by action (startsWith)", async () => {
    mockAuditLogFindMany.mockResolvedValue([]);
    mockAuditLogCount.mockResolvedValue(0);

    const req = new NextRequest("http://localhost/api/admin/audit-logs?action=user");
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);

    const findManyCall = mockAuditLogFindMany.mock.calls[0][0];
    expect(findManyCall.where).toEqual({ action: { startsWith: "user" } });

    const countCall = mockAuditLogCount.mock.calls[0][0];
    expect(countCall.where).toEqual({ action: { startsWith: "user" } });
  });

  it("5. paginates correctly", async () => {
    mockAuditLogFindMany.mockResolvedValue([mockLog2]);
    mockAuditLogCount.mockResolvedValue(25);

    const req = new NextRequest("http://localhost/api/admin/audit-logs?page=2");
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);

    // Verify skip/take passed to findMany
    const findManyCall = mockAuditLogFindMany.mock.calls[0][0];
    expect(findManyCall.skip).toBe(20); // (page 2 - 1) * pageSize 20
    expect(findManyCall.take).toBe(20);
    expect(findManyCall.orderBy).toEqual({ createdAt: "desc" });
  });

  it("6. returns 500 on error", async () => {
    mockAuditLogFindMany.mockRejectedValue(new Error("DB connection failed"));

    const req = new NextRequest("http://localhost/api/admin/audit-logs");
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.success).toBe(false);
    expect(json.message).toBe("服务器内部错误");
  });

  it("7. spreads paginationMeta into response", async () => {
    mockAuditLogFindMany.mockResolvedValue([mockLog]);
    mockAuditLogCount.mockResolvedValue(45);

    const req = new NextRequest("http://localhost/api/admin/audit-logs");
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);

    // paginationMeta is spread at top level (not nested under "pagination")
    expect(json.total).toBe(45);
    expect(json.page).toBe(1);
    expect(json.pageSize).toBe(20);
    expect(json.totalPages).toBe(3); // Math.ceil(45 / 20)

    // Should NOT have a nested pagination object
    expect(json.pagination).toBeUndefined();
  });
});
