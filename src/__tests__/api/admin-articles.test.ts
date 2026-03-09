import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Mocks -- must be declared before importing the route module
// ---------------------------------------------------------------------------

const mockArticleFindMany = vi.fn();
const mockArticleCount = vi.fn();
const mockArticleFindUnique = vi.fn();
const mockArticleCreate = vi.fn();
const mockArticleUpdate = vi.fn();
const mockArticleUpdateMany = vi.fn();
const mockArticleDelete = vi.fn();

vi.mock("@/server/db", () => ({
  db: {
    article: {
      findMany: (...args: unknown[]) => mockArticleFindMany(...args),
      count: (...args: unknown[]) => mockArticleCount(...args),
      findUnique: (...args: unknown[]) => mockArticleFindUnique(...args),
      create: (...args: unknown[]) => mockArticleCreate(...args),
      update: (...args: unknown[]) => mockArticleUpdate(...args),
      updateMany: (...args: unknown[]) => mockArticleUpdateMany(...args),
      delete: (...args: unknown[]) => mockArticleDelete(...args),
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
  parsePagination: (params: URLSearchParams) => ({
    page: Number(params.get("page") || 1),
    pageSize: Number(params.get("pageSize") || 20),
  }),
}));

const mockCreateArticleSchema = {
  safeParse: vi.fn(),
};
const mockUpdateArticleSchema = {
  safeParse: vi.fn(),
};
vi.mock("@/lib/validators", () => ({
  createArticleSchema: { safeParse: (...args: unknown[]) => mockCreateArticleSchema.safeParse(...args) },
  updateArticleSchema: { safeParse: (...args: unknown[]) => mockUpdateArticleSchema.safeParse(...args) },
  formatZodError: () => "验证失败",
}));

vi.mock("@/lib/sanitize", () => ({
  sanitizeHtml: (html: string) => html,
}));

vi.mock("@/lib/utils", () => ({
  slugify: (s: string) => s.toLowerCase().replace(/\s+/g, "-"),
}));

// ---------------------------------------------------------------------------
// Import route handlers AFTER mocks
// ---------------------------------------------------------------------------

const { GET, POST, PUT, PATCH, DELETE: DELETE_HANDLER } = await import(
  "@/app/api/admin/articles/route"
);

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const now = new Date("2026-03-08T10:00:00Z");
const mockArticle = {
  id: "art-1",
  title: "测试文章",
  slug: "test-article",
  content: "<p>文章内容</p>",
  category: "公告",
  tags: ["tag1", "tag2"],
  isPublished: true,
  viewCount: 42,
  createdAt: now,
  updatedAt: now,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Admin Articles API -- /api/admin/articles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdminSession = { id: "admin-1", role: "ADMIN" };
  });

  // =========================================================================
  // GET
  // =========================================================================

  describe("GET", () => {
    it("1. returns article list with pagination info", async () => {
      mockArticleFindMany.mockResolvedValue([mockArticle]);
      mockArticleCount.mockResolvedValue(1);

      const req = new NextRequest("http://localhost/api/admin/articles");
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.articles).toHaveLength(1);
      expect(json.articles[0].id).toBe("art-1");
      expect(json.articles[0].title).toBe("测试文章");
      expect(json.articles[0].slug).toBe("test-article");
      expect(json.articles[0].content).toBe("<p>文章内容</p>");
      expect(json.articles[0].category).toBe("公告");
      expect(json.articles[0].tags).toEqual(["tag1", "tag2"]);
      expect(json.articles[0].isPublished).toBe(true);
      expect(json.articles[0].viewCount).toBe(42);
      expect(json.articles[0].createdAt).toBe("2026-03-08T10:00:00.000Z");
      expect(json.articles[0].updatedAt).toBe("2026-03-08T10:00:00.000Z");
      expect(json.total).toBe(1);
      expect(json.page).toBe(1);
      expect(json.limit).toBe(20);
    });

    it("2. returns 401 when not authenticated", async () => {
      mockAdminSession = null;

      const req = new NextRequest("http://localhost/api/admin/articles");
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.success).toBe(false);
      expect(json.message).toBe("未登录");
    });

    it("3. filters by search term (title contains)", async () => {
      mockArticleFindMany.mockResolvedValue([]);
      mockArticleCount.mockResolvedValue(0);

      const req = new NextRequest("http://localhost/api/admin/articles?search=测试");
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.articles).toHaveLength(0);

      const findManyCall = mockArticleFindMany.mock.calls[0][0];
      expect(findManyCall.where.title).toEqual({
        contains: "测试",
        mode: "insensitive",
      });
    });

    it("4. filters by category", async () => {
      mockArticleFindMany.mockResolvedValue([]);
      mockArticleCount.mockResolvedValue(0);

      const req = new NextRequest("http://localhost/api/admin/articles?category=公告");
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);

      const findManyCall = mockArticleFindMany.mock.calls[0][0];
      expect(findManyCall.where.category).toBe("公告");
    });

    it("5. filters by isPublished", async () => {
      mockArticleFindMany.mockResolvedValue([]);
      mockArticleCount.mockResolvedValue(0);

      const req = new NextRequest("http://localhost/api/admin/articles?isPublished=true");
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);

      const findManyCall = mockArticleFindMany.mock.calls[0][0];
      expect(findManyCall.where.isPublished).toBe(true);
    });

    it("6. returns 500 on database error", async () => {
      mockArticleFindMany.mockRejectedValue(new Error("DB connection failed"));
      mockArticleCount.mockRejectedValue(new Error("DB connection failed"));

      const req = new NextRequest("http://localhost/api/admin/articles");
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.success).toBe(false);
      expect(json.message).toBe("服务器内部错误");
    });
  });

  // =========================================================================
  // POST
  // =========================================================================

  describe("POST", () => {
    it("7. creates article successfully with all fields", async () => {
      const createData = {
        title: "新文章",
        slug: "new-article",
        content: "<p>新内容</p>",
        category: "教程",
        tags: ["vue", "react"],
        isPublished: true,
      };
      mockCreateArticleSchema.safeParse.mockReturnValue({
        success: true,
        data: createData,
      });
      mockArticleFindUnique.mockResolvedValue(null); // slug not taken
      const createdArticle = {
        id: "art-new",
        ...createData,
        viewCount: 0,
        createdAt: now,
        updatedAt: now,
      };
      mockArticleCreate.mockResolvedValue(createdArticle);

      const req = new NextRequest("http://localhost/api/admin/articles", {
        method: "POST",
        body: JSON.stringify(createData),
      });
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.article.id).toBe("art-new");
      expect(json.article.title).toBe("新文章");
      expect(json.article.slug).toBe("new-article");
      expect(json.article.content).toBe("<p>新内容</p>");
      expect(json.article.category).toBe("教程");
      expect(json.article.tags).toEqual(["vue", "react"]);
      expect(json.article.isPublished).toBe(true);

      // Verify create was called with sanitized content and correct data
      expect(mockArticleCreate).toHaveBeenCalledWith({
        data: {
          title: "新文章",
          slug: "new-article",
          content: "<p>新内容</p>",
          category: "教程",
          tags: ["vue", "react"],
          isPublished: true,
        },
      });
    });

    it("8. creates article with auto-generated slug from title", async () => {
      const createData = {
        title: "我的新文章",
        slug: undefined,
        content: "<p>内容</p>",
        category: "公告",
        tags: undefined,
        isPublished: undefined,
      };
      mockCreateArticleSchema.safeParse.mockReturnValue({
        success: true,
        data: createData,
      });
      mockArticleFindUnique.mockResolvedValue(null); // slug not taken
      const createdArticle = {
        id: "art-auto",
        title: "我的新文章",
        slug: "我的新文章",
        content: "<p>内容</p>",
        category: "公告",
        tags: [],
        isPublished: false,
        viewCount: 0,
        createdAt: now,
        updatedAt: now,
      };
      mockArticleCreate.mockResolvedValue(createdArticle);

      const req = new NextRequest("http://localhost/api/admin/articles", {
        method: "POST",
        body: JSON.stringify({ title: "我的新文章", content: "<p>内容</p>", category: "公告" }),
      });
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      // Verify slug was auto-generated via slugify and defaults were applied
      expect(mockArticleCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tags: [],
          isPublished: false,
        }),
      });
    });

    it("9. returns 409 for duplicate slug", async () => {
      const createData = {
        title: "重复文章",
        slug: "test-article",
        content: "<p>内容</p>",
        category: "公告",
      };
      mockCreateArticleSchema.safeParse.mockReturnValue({
        success: true,
        data: createData,
      });
      // slug already exists
      mockArticleFindUnique.mockResolvedValue({ id: "existing", slug: "test-article" });

      const req = new NextRequest("http://localhost/api/admin/articles", {
        method: "POST",
        body: JSON.stringify(createData),
      });
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(409);
      expect(json.success).toBe(false);
      expect(json.message).toContain("slug 已存在");
      expect(json.message).toContain("test-article");
    });

    it("10. returns 400 for validation error", async () => {
      mockCreateArticleSchema.safeParse.mockReturnValue({
        success: false,
        error: { issues: [{ message: "标题必填" }] },
      });

      const req = new NextRequest("http://localhost/api/admin/articles", {
        method: "POST",
        body: JSON.stringify({}),
      });
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message).toBe("验证失败");
    });
  });

  // =========================================================================
  // PUT
  // =========================================================================

  describe("PUT", () => {
    it("11. updates article successfully", async () => {
      mockArticleFindUnique.mockResolvedValueOnce(mockArticle); // existing article

      const updateData = {
        title: "更新后的文章",
        content: "<p>更新内容</p>",
      };
      mockUpdateArticleSchema.safeParse.mockReturnValue({
        success: true,
        data: updateData,
      });

      const updatedArticle = {
        ...mockArticle,
        title: "更新后的文章",
        content: "<p>更新内容</p>",
      };
      mockArticleUpdate.mockResolvedValue(updatedArticle);

      const req = new NextRequest("http://localhost/api/admin/articles?id=art-1", {
        method: "PUT",
        body: JSON.stringify(updateData),
      });
      const res = await PUT(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.message).toBe("文章已更新");
      expect(json.article.title).toBe("更新后的文章");
      expect(json.article.content).toBe("<p>更新内容</p>");

      expect(mockArticleUpdate).toHaveBeenCalledWith({
        where: { id: "art-1" },
        data: {
          title: "更新后的文章",
          content: "<p>更新内容</p>",
        },
      });
    });

    it("12. returns 400 for missing id", async () => {
      const req = new NextRequest("http://localhost/api/admin/articles", {
        method: "PUT",
        body: JSON.stringify({ title: "无ID" }),
      });
      const res = await PUT(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message).toBe("缺少文章ID参数");
    });

    it("13. returns 404 for non-existent article", async () => {
      mockArticleFindUnique.mockResolvedValue(null);
      const req = new NextRequest("http://localhost/api/admin/articles?id=nonexistent", {
        method: "PUT",
        body: JSON.stringify({ title: "不存在" }),
      });
      const res = await PUT(req);
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.success).toBe(false);
      expect(json.message).toBe("文章不存在");
    });

    it("14. returns 409 for conflicting slug", async () => {
      const existingArticle = { ...mockArticle, slug: "old-slug" };
      mockArticleFindUnique
        .mockResolvedValueOnce(existingArticle)    // first call: find article by id
        .mockResolvedValueOnce({ id: "other-art" }); // second call: slug uniqueness check

      mockUpdateArticleSchema.safeParse.mockReturnValue({
        success: true,
        data: { slug: "taken-slug" },
      });

      const req = new NextRequest("http://localhost/api/admin/articles?id=art-1", {
        method: "PUT",
        body: JSON.stringify({ slug: "taken-slug" }),
      });
      const res = await PUT(req);
      const json = await res.json();

      expect(res.status).toBe(409);
      expect(json.success).toBe(false);
      expect(json.message).toContain("slug 已存在");
      expect(json.message).toContain("taken-slug");
    });

    it("15. returns 400 when no fields to update", async () => {
      mockArticleFindUnique.mockResolvedValueOnce(mockArticle);

      // All fields are undefined in parsed data
      mockUpdateArticleSchema.safeParse.mockReturnValue({
        success: true,
        data: {},
      });

      const req = new NextRequest("http://localhost/api/admin/articles?id=art-1", {
        method: "PUT",
        body: JSON.stringify({}),
      });
      const res = await PUT(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message).toBe("没有需要更新的字段");
    });
  });

  // =========================================================================
  // PATCH
  // =========================================================================

  describe("PATCH", () => {
    it("16. batch publishes articles", async () => {
      mockArticleUpdateMany.mockResolvedValue({ count: 3 });

      const req = new NextRequest("http://localhost/api/admin/articles", {
        method: "PATCH",
        body: JSON.stringify({
          ids: ["art-1", "art-2", "art-3"],
          isPublished: true,
        }),
      });
      const res = await PATCH(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.updated).toBe(3);
      expect(json.message).toContain("发布");
      expect(json.message).toContain("3");

      expect(mockArticleUpdateMany).toHaveBeenCalledWith({
        where: { id: { in: ["art-1", "art-2", "art-3"] } },
        data: { isPublished: true },
      });
    });

    it("17. returns 400 for empty ids", async () => {
      const req = new NextRequest("http://localhost/api/admin/articles", {
        method: "PATCH",
        body: JSON.stringify({
          ids: [],
          isPublished: true,
        }),
      });
      const res = await PATCH(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message).toBe("请选择要操作的文章");
    });

    it("18. returns 400 for non-boolean isPublished", async () => {
      const req = new NextRequest("http://localhost/api/admin/articles", {
        method: "PATCH",
        body: JSON.stringify({
          ids: ["art-1"],
          isPublished: "yes",
        }),
      });
      const res = await PATCH(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message).toBe("缺少发布状态参数");
    });
  });

  // =========================================================================
  // DELETE
  // =========================================================================

  describe("DELETE", () => {
    it("19. deletes article successfully", async () => {
      mockArticleFindUnique.mockResolvedValue(mockArticle);
      mockArticleDelete.mockResolvedValue(mockArticle);

      const req = new NextRequest("http://localhost/api/admin/articles?id=art-1", {
        method: "DELETE",
      });
      const res = await DELETE_HANDLER(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.message).toBe("文章已删除");

      expect(mockArticleDelete).toHaveBeenCalledWith({ where: { id: "art-1" } });
    });

    it("20. returns 400 for missing id", async () => {
      const req = new NextRequest("http://localhost/api/admin/articles", {
        method: "DELETE",
      });
      const res = await DELETE_HANDLER(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message).toBe("缺少文章ID参数");
    });

    it("21. returns 404 for non-existent article", async () => {
      mockArticleFindUnique.mockResolvedValue(null);

      const req = new NextRequest("http://localhost/api/admin/articles?id=nonexistent", {
        method: "DELETE",
      });
      const res = await DELETE_HANDLER(req);
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.success).toBe(false);
      expect(json.message).toBe("文章不存在");
    });
  });
});
