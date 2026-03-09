import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Mock functions — declared BEFORE importing the route handler
// ---------------------------------------------------------------------------

const mockContactMessageFindMany = vi.fn();
const mockContactMessageCount = vi.fn();
const mockContactMessageFindUnique = vi.fn();
const mockContactMessageUpdate = vi.fn();
const mockContactMessageUpdateMany = vi.fn();
const mockSendContactReply = vi.fn().mockResolvedValue(undefined);

vi.mock("@/server/db", () => ({
  db: {
    contactMessage: {
      findMany: (...args: unknown[]) => mockContactMessageFindMany(...args),
      count: (...args: unknown[]) => mockContactMessageCount(...args),
      findUnique: (...args: unknown[]) => mockContactMessageFindUnique(...args),
      update: (...args: unknown[]) => mockContactMessageUpdate(...args),
      updateMany: (...args: unknown[]) => mockContactMessageUpdateMany(...args),
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

vi.mock("@/lib/sanitize", () => ({
  stripHtml: (s: string) => s.replace(/<[^>]*>/g, ""),
}));

vi.mock("@/server/services/email", () => ({
  sendContactReply: (...args: unknown[]) => mockSendContactReply(...args),
}));

// ---------------------------------------------------------------------------
// Import route handlers AFTER all mocks are in place
// ---------------------------------------------------------------------------

const { GET, PUT, PATCH } = await import("@/app/api/admin/messages/route");

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const now = new Date("2026-03-08T10:00:00Z");

const mockMessage = {
  id: "msg-1",
  name: "张三",
  email: "zhang@example.com",
  subject: "售后问题",
  message: "商品有问题",
  status: "PENDING",
  adminNote: null,
  createdAt: now,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Admin Messages API — /api/admin/messages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdminSession = { id: "admin-1", role: "ADMIN" };
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GET
  // ═══════════════════════════════════════════════════════════════════════════

  describe("GET", () => {
    it("1. returns message list with pagination", async () => {
      mockContactMessageFindMany.mockResolvedValue([mockMessage]);
      mockContactMessageCount.mockResolvedValue(1);

      const req = new NextRequest("http://localhost/api/admin/messages");
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.messages).toHaveLength(1);
      expect(json.messages[0]).toMatchObject({
        id: "msg-1",
        name: "张三",
        email: "zhang@example.com",
        subject: "售后问题",
        message: "商品有问题",
        status: "PENDING",
        adminNote: null,
        createdAt: now.toISOString(),
      });
      expect(json.pagination).toMatchObject({
        total: 1,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      });
    });

    it("2. returns 401 when not authenticated", async () => {
      mockAdminSession = null;

      const req = new NextRequest("http://localhost/api/admin/messages");
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.success).toBe(false);
      expect(json.message).toBe("未登录");
    });

    it("3. filters by status", async () => {
      mockContactMessageFindMany.mockResolvedValue([]);
      mockContactMessageCount.mockResolvedValue(0);

      const req = new NextRequest("http://localhost/api/admin/messages?status=REPLIED");
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);

      const findManyCall = mockContactMessageFindMany.mock.calls[0][0];
      expect(findManyCall.where.status).toBe("REPLIED");
    });

    it("4. filters by search term (OR across name/email/subject/message)", async () => {
      mockContactMessageFindMany.mockResolvedValue([]);
      mockContactMessageCount.mockResolvedValue(0);

      const req = new NextRequest("http://localhost/api/admin/messages?search=张三");
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);

      const findManyCall = mockContactMessageFindMany.mock.calls[0][0];
      expect(findManyCall.where.OR).toBeDefined();
      expect(findManyCall.where.OR).toHaveLength(4);
      expect(findManyCall.where.OR[0]).toEqual({
        name: { contains: "张三", mode: "insensitive" },
      });
      expect(findManyCall.where.OR[1]).toEqual({
        email: { contains: "张三", mode: "insensitive" },
      });
      expect(findManyCall.where.OR[2]).toEqual({
        subject: { contains: "张三", mode: "insensitive" },
      });
      expect(findManyCall.where.OR[3]).toEqual({
        message: { contains: "张三", mode: "insensitive" },
      });
    });

    it("5. returns 500 on database error", async () => {
      mockContactMessageFindMany.mockRejectedValue(new Error("DB failure"));
      mockContactMessageCount.mockRejectedValue(new Error("DB failure"));

      const req = new NextRequest("http://localhost/api/admin/messages");
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.success).toBe(false);
      expect(json.message).toBe("服务器内部错误");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PUT
  // ═══════════════════════════════════════════════════════════════════════════

  describe("PUT", () => {
    it("6. updates message status successfully", async () => {
      mockContactMessageFindUnique.mockResolvedValue({ ...mockMessage });
      mockContactMessageUpdate.mockResolvedValue({ ...mockMessage, status: "CLOSED" });

      const req = new NextRequest("http://localhost/api/admin/messages", {
        method: "PUT",
        body: JSON.stringify({ id: "msg-1", status: "CLOSED" }),
      });

      const res = await PUT(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.message).toBe("状态已更新");

      expect(mockContactMessageUpdate).toHaveBeenCalledWith({
        where: { id: "msg-1" },
        data: { status: "CLOSED", adminNote: null },
      });
    });

    it("7. sends email reply when status is REPLIED with adminNote", async () => {
      mockContactMessageFindUnique.mockResolvedValue({ ...mockMessage });
      mockContactMessageUpdate.mockResolvedValue({ ...mockMessage, status: "REPLIED", adminNote: "已处理" });

      const req = new NextRequest("http://localhost/api/admin/messages", {
        method: "PUT",
        body: JSON.stringify({ id: "msg-1", status: "REPLIED", adminNote: "已处理您的问题" }),
      });

      const res = await PUT(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);

      expect(mockSendContactReply).toHaveBeenCalledWith({
        to: "zhang@example.com",
        name: "张三",
        subject: "售后问题",
        originalMessage: "商品有问题",
        reply: "已处理您的问题",
      });
    });

    it("8. returns 400 for missing params (no id or status)", async () => {
      const req = new NextRequest("http://localhost/api/admin/messages", {
        method: "PUT",
        body: JSON.stringify({ id: "msg-1" }), // missing status
      });

      const res = await PUT(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message).toBe("缺少参数");
    });

    it("9. returns 400 for invalid status", async () => {
      const req = new NextRequest("http://localhost/api/admin/messages", {
        method: "PUT",
        body: JSON.stringify({ id: "msg-1", status: "INVALID" }),
      });

      const res = await PUT(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message).toBe("无效状态");
    });

    it("10. returns 404 for non-existent message", async () => {
      mockContactMessageFindUnique.mockResolvedValue(null);

      const req = new NextRequest("http://localhost/api/admin/messages", {
        method: "PUT",
        body: JSON.stringify({ id: "nonexistent", status: "CLOSED" }),
      });

      const res = await PUT(req);
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.success).toBe(false);
      expect(json.message).toBe("留言不存在");
    });

    it("11. returns 500 on database error", async () => {
      mockContactMessageFindUnique.mockRejectedValue(new Error("DB failure"));

      const req = new NextRequest("http://localhost/api/admin/messages", {
        method: "PUT",
        body: JSON.stringify({ id: "msg-1", status: "CLOSED" }),
      });

      const res = await PUT(req);
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.success).toBe(false);
      expect(json.message).toBe("服务器内部错误");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PATCH
  // ═══════════════════════════════════════════════════════════════════════════

  describe("PATCH", () => {
    it("12. batch closes messages successfully", async () => {
      mockContactMessageUpdateMany.mockResolvedValue({ count: 3 });

      const req = new NextRequest("http://localhost/api/admin/messages", {
        method: "PATCH",
        body: JSON.stringify({ ids: ["msg-1", "msg-2", "msg-3"], status: "CLOSED" }),
      });

      const res = await PATCH(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.affected).toBe(3);
      expect(json.message).toContain("已更新 3 条留言");

      expect(mockContactMessageUpdateMany).toHaveBeenCalledWith({
        where: { id: { in: ["msg-1", "msg-2", "msg-3"] } },
        data: { status: "CLOSED" },
      });
    });

    it("13. returns 400 for empty ids array", async () => {
      const req = new NextRequest("http://localhost/api/admin/messages", {
        method: "PATCH",
        body: JSON.stringify({ ids: [], status: "CLOSED" }),
      });

      const res = await PATCH(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message).toBe("请选择至少一条留言");
    });

    it("14. returns 400 for ids exceeding 100", async () => {
      const ids = Array.from({ length: 101 }, (_, i) => `msg-${i}`);

      const req = new NextRequest("http://localhost/api/admin/messages", {
        method: "PATCH",
        body: JSON.stringify({ ids, status: "CLOSED" }),
      });

      const res = await PATCH(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message).toBe("单次批量操作最多100条");
    });

    it("15. returns 400 for invalid batch status (PENDING not allowed)", async () => {
      const req = new NextRequest("http://localhost/api/admin/messages", {
        method: "PATCH",
        body: JSON.stringify({ ids: ["msg-1"], status: "PENDING" }),
      });

      const res = await PATCH(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message).toBe("批量操作仅支持标记已回复或关闭");
    });
  });
});
