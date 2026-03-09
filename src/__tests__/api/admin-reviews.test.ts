import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Mocks -- must be declared before importing the route module
// ---------------------------------------------------------------------------

const mockReviewFindMany = vi.fn();
const mockReviewCount = vi.fn();
const mockReviewFindUnique = vi.fn();
const mockReviewUpdate = vi.fn();
const mockReviewUpdateMany = vi.fn();
const mockReviewDelete = vi.fn();

vi.mock("@/server/db", () => ({
  db: {
    review: {
      findMany: (...args: unknown[]) => mockReviewFindMany(...args),
      count: (...args: unknown[]) => mockReviewCount(...args),
      findUnique: (...args: unknown[]) => mockReviewFindUnique(...args),
      update: (...args: unknown[]) => mockReviewUpdate(...args),
      updateMany: (...args: unknown[]) => mockReviewUpdateMany(...args),
      delete: (...args: unknown[]) => mockReviewDelete(...args),
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

vi.mock("@/lib/sanitize", () => ({
  stripHtml: (input: string) => input.replace(/<[^>]*>/g, ""),
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

// ---------------------------------------------------------------------------
// Import route handlers AFTER mocks
// ---------------------------------------------------------------------------

const { GET, PUT, PATCH, POST, DELETE: DELETE_HANDLER } = await import(
  "@/app/api/admin/reviews/route"
);

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const now = new Date("2026-03-08T10:00:00Z");
const mockReview = {
  id: "rev-1",
  rating: 5,
  content: "很好",
  adminReply: null,
  repliedAt: null,
  isVisible: true,
  createdAt: now,
  userId: "user-1",
  user: { id: "user-1", username: "testuser" },
  product: { id: "prod-1", name: "Test Product", slug: "test-product" },
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Admin Reviews API -- /api/admin/reviews", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdminSession = { id: "admin-1", role: "ADMIN" };
  });

  // =========================================================================
  // GET
  // =========================================================================

  describe("GET", () => {
    it("1. returns reviews list with pagination", async () => {
      mockReviewFindMany.mockResolvedValue([mockReview]);
      mockReviewCount.mockResolvedValue(1);

      const req = new NextRequest("http://localhost/api/admin/reviews");
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.reviews).toHaveLength(1);
      expect(json.reviews[0].id).toBe("rev-1");
      expect(json.reviews[0].rating).toBe(5);
      expect(json.reviews[0].content).toBe("很好");
      expect(json.reviews[0].adminReply).toBeNull();
      expect(json.reviews[0].repliedAt).toBeNull();
      expect(json.reviews[0].isVisible).toBe(true);
      expect(json.reviews[0].createdAt).toBe("2026-03-08T10:00:00.000Z");
      expect(json.reviews[0].user).toEqual({ id: "user-1", username: "testuser" });
      expect(json.reviews[0].product).toEqual({ id: "prod-1", name: "Test Product", slug: "test-product" });
      expect(json.total).toBe(1);
      expect(json.page).toBe(1);
      expect(json.limit).toBe(20);
    });

    it("2. returns 401 when not authenticated", async () => {
      mockAdminSession = null;

      const req = new NextRequest("http://localhost/api/admin/reviews");
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.success).toBe(false);
      expect(json.message).toBe("未登录");
    });

    it("3. filters by rating", async () => {
      mockReviewFindMany.mockResolvedValue([]);
      mockReviewCount.mockResolvedValue(0);

      const req = new NextRequest("http://localhost/api/admin/reviews?rating=3");
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);

      const findManyCall = mockReviewFindMany.mock.calls[0][0];
      expect(findManyCall.where.rating).toBe(3);
    });

    it("4. filters by visible=true", async () => {
      mockReviewFindMany.mockResolvedValue([]);
      mockReviewCount.mockResolvedValue(0);

      const req = new NextRequest("http://localhost/api/admin/reviews?visible=true");
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);

      const findManyCall = mockReviewFindMany.mock.calls[0][0];
      expect(findManyCall.where.isVisible).toBe(true);
    });

    it("5. filters by search term", async () => {
      mockReviewFindMany.mockResolvedValue([]);
      mockReviewCount.mockResolvedValue(0);

      const req = new NextRequest("http://localhost/api/admin/reviews?search=测试");
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);

      const findManyCall = mockReviewFindMany.mock.calls[0][0];
      expect(findManyCall.where.OR).toEqual([
        { content: { contains: "测试", mode: "insensitive" } },
        { user: { username: { contains: "测试", mode: "insensitive" } } },
        { product: { name: { contains: "测试", mode: "insensitive" } } },
      ]);
    });

    it("6. returns 500 on database error", async () => {
      mockReviewFindMany.mockRejectedValue(new Error("DB connection failed"));
      mockReviewCount.mockRejectedValue(new Error("DB connection failed"));

      const req = new NextRequest("http://localhost/api/admin/reviews");
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.success).toBe(false);
      expect(json.message).toBe("服务器内部错误");
    });
  });

  // =========================================================================
  // PUT - Toggle visibility
  // =========================================================================

  describe("PUT", () => {
    it("7. toggles review visibility (true -> false)", async () => {
      mockReviewFindUnique.mockResolvedValue({ ...mockReview, isVisible: true });
      mockReviewUpdate.mockResolvedValue({ ...mockReview, isVisible: false });

      const req = new NextRequest("http://localhost/api/admin/reviews?id=rev-1", {
        method: "PUT",
      });
      const res = await PUT(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.isVisible).toBe(false);
      expect(json.message).toBe("评价已隐藏");

      expect(mockReviewUpdate).toHaveBeenCalledWith({
        where: { id: "rev-1" },
        data: { isVisible: false },
      });
    });

    it("8. returns 400 when id is missing", async () => {
      const req = new NextRequest("http://localhost/api/admin/reviews", {
        method: "PUT",
      });
      const res = await PUT(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message).toBe("缺少评价ID");
    });

    it("9. returns 404 when review not found", async () => {
      mockReviewFindUnique.mockResolvedValue(null);

      const req = new NextRequest("http://localhost/api/admin/reviews?id=nonexistent", {
        method: "PUT",
      });
      const res = await PUT(req);
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.success).toBe(false);
      expect(json.message).toBe("评价不存在");
    });
  });

  // =========================================================================
  // PATCH - Reply to review
  // =========================================================================

  describe("PATCH", () => {
    it("10. replies to a review", async () => {
      mockReviewFindUnique.mockResolvedValue(mockReview);
      const replyDate = new Date("2026-03-08T12:00:00Z");
      mockReviewUpdate.mockResolvedValue({
        ...mockReview,
        adminReply: "感谢您的评价",
        repliedAt: replyDate,
      });

      const req = new NextRequest("http://localhost/api/admin/reviews", {
        method: "PATCH",
        body: JSON.stringify({ id: "rev-1", reply: "感谢您的评价" }),
      });
      const res = await PATCH(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.message).toBe("回复已保存");
      expect(json.adminReply).toBe("感谢您的评价");
      expect(json.repliedAt).toBe("2026-03-08T12:00:00.000Z");

      expect(mockReviewUpdate).toHaveBeenCalledWith({
        where: { id: "rev-1" },
        data: {
          adminReply: "感谢您的评价",
          repliedAt: expect.any(Date),
        },
      });
    });

    it("11. clears reply with empty string", async () => {
      mockReviewFindUnique.mockResolvedValue({
        ...mockReview,
        adminReply: "旧回复",
        repliedAt: now,
      });
      mockReviewUpdate.mockResolvedValue({
        ...mockReview,
        adminReply: null,
        repliedAt: null,
      });

      const req = new NextRequest("http://localhost/api/admin/reviews", {
        method: "PATCH",
        body: JSON.stringify({ id: "rev-1", reply: "" }),
      });
      const res = await PATCH(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.message).toBe("回复已清除");
      expect(json.adminReply).toBeNull();
      expect(json.repliedAt).toBeNull();

      expect(mockReviewUpdate).toHaveBeenCalledWith({
        where: { id: "rev-1" },
        data: {
          adminReply: null,
          repliedAt: null,
        },
      });
    });

    it("12. returns 400 when id is missing", async () => {
      const req = new NextRequest("http://localhost/api/admin/reviews", {
        method: "PATCH",
        body: JSON.stringify({ reply: "回复内容" }),
      });
      const res = await PATCH(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message).toBe("缺少评价ID");
    });

    it("13. returns 404 when review not found", async () => {
      mockReviewFindUnique.mockResolvedValue(null);

      const req = new NextRequest("http://localhost/api/admin/reviews", {
        method: "PATCH",
        body: JSON.stringify({ id: "nonexistent", reply: "回复" }),
      });
      const res = await PATCH(req);
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.success).toBe(false);
      expect(json.message).toBe("评价不存在");
    });

    it("14. returns 400 when reply is not a string", async () => {
      const req = new NextRequest("http://localhost/api/admin/reviews", {
        method: "PATCH",
        body: JSON.stringify({ id: "rev-1", reply: 123 }),
      });
      const res = await PATCH(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message).toBe("回复内容格式错误");
    });
  });

  // =========================================================================
  // POST - Batch toggle visibility
  // =========================================================================

  describe("POST", () => {
    it("15. batch toggles visibility", async () => {
      mockReviewUpdateMany.mockResolvedValue({ count: 3 });

      const req = new NextRequest("http://localhost/api/admin/reviews", {
        method: "POST",
        body: JSON.stringify({ ids: ["rev-1", "rev-2", "rev-3"], visible: false }),
      });
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.affected).toBe(3);
      expect(json.message).toContain("隐藏");
      expect(json.message).toContain("3");

      expect(mockReviewUpdateMany).toHaveBeenCalledWith({
        where: { id: { in: ["rev-1", "rev-2", "rev-3"] } },
        data: { isVisible: false },
      });
    });

    it("16. returns 400 for empty ids array", async () => {
      const req = new NextRequest("http://localhost/api/admin/reviews", {
        method: "POST",
        body: JSON.stringify({ ids: [], visible: true }),
      });
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message).toBe("请选择至少一条评价");
    });

    it("17. returns 400 when ids exceed 100", async () => {
      const ids = Array.from({ length: 101 }, (_, i) => `rev-${i}`);

      const req = new NextRequest("http://localhost/api/admin/reviews", {
        method: "POST",
        body: JSON.stringify({ ids, visible: true }),
      });
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message).toBe("单次批量操作最多100条");
    });

    it("18. returns 400 when visible is not a boolean", async () => {
      const req = new NextRequest("http://localhost/api/admin/reviews", {
        method: "POST",
        body: JSON.stringify({ ids: ["rev-1"], visible: "yes" }),
      });
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message).toBe("visible 参数必须为布尔值");
    });
  });

  // =========================================================================
  // DELETE
  // =========================================================================

  describe("DELETE", () => {
    it("19. deletes review successfully", async () => {
      mockReviewFindUnique.mockResolvedValue(mockReview);
      mockReviewDelete.mockResolvedValue(mockReview);

      const req = new NextRequest("http://localhost/api/admin/reviews?id=rev-1", {
        method: "DELETE",
      });
      const res = await DELETE_HANDLER(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.message).toBe("评价已删除");

      expect(mockReviewDelete).toHaveBeenCalledWith({ where: { id: "rev-1" } });
    });

    it("20. returns 400 when id is missing", async () => {
      const req = new NextRequest("http://localhost/api/admin/reviews", {
        method: "DELETE",
      });
      const res = await DELETE_HANDLER(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message).toBe("缺少评价ID");
    });

    it("21. returns 404 when review not found", async () => {
      mockReviewFindUnique.mockResolvedValue(null);

      const req = new NextRequest("http://localhost/api/admin/reviews?id=nonexistent", {
        method: "DELETE",
      });
      const res = await DELETE_HANDLER(req);
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.success).toBe(false);
      expect(json.message).toBe("评价不存在");
    });
  });
});
