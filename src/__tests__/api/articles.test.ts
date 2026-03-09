import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Mocks — declared BEFORE importing the route handler
// ---------------------------------------------------------------------------

const mockArticleFindMany = vi.fn();
const mockArticleCount = vi.fn();

vi.mock("@/server/db", () => ({
  db: {
    article: {
      findMany: (...args: unknown[]) => mockArticleFindMany(...args),
      count: (...args: unknown[]) => mockArticleCount(...args),
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

// ---------------------------------------------------------------------------
// Import the route handler AFTER all mocks are in place
// ---------------------------------------------------------------------------

const { GET } = await import("@/app/api/articles/route");

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const mockArticle = {
  id: "a1",
  title: "Test Article",
  slug: "test-article",
  content: "<p>This is the <b>article</b> content with more text</p>",
  category: "FAQ",
  tags: ["help", "guide"],
  viewCount: 10,
  createdAt: new Date(),
};

function createRequest(params: Record<string, string> = {}) {
  const url = new URL("http://localhost:3001/api/articles");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new NextRequest(url, { method: "GET" });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("GET /api/articles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 1. Returns published articles list with excerpt
  it("returns published articles list with excerpt", async () => {
    mockArticleFindMany.mockResolvedValue([mockArticle]);
    mockArticleCount.mockResolvedValue(1);

    const response = await GET(createRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.articles).toHaveLength(1);
    expect(data.articles[0]).toMatchObject({
      id: "a1",
      title: "Test Article",
      slug: "test-article",
      category: "FAQ",
      tags: ["help", "guide"],
      viewCount: 10,
    });
    expect(data.articles[0].excerpt).toBeDefined();
    expect(data.total).toBe(1);
    expect(data.page).toBe(1);
    expect(data.limit).toBe(20);
    expect(data.pagination).toEqual({
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    });

    // Verify findMany was called with isPublished: true
    expect(mockArticleFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isPublished: true }),
      })
    );
  });

  // 2. Filters by category
  it("filters by category", async () => {
    mockArticleFindMany.mockResolvedValue([]);
    mockArticleCount.mockResolvedValue(0);

    await GET(createRequest({ category: "FAQ" }));

    expect(mockArticleFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isPublished: true,
          category: "FAQ",
        }),
      })
    );
    expect(mockArticleCount).toHaveBeenCalledWith({
      where: expect.objectContaining({
        isPublished: true,
        category: "FAQ",
      }),
    });
  });

  // 3. Filters by tag (has)
  it("filters by tag (has)", async () => {
    mockArticleFindMany.mockResolvedValue([]);
    mockArticleCount.mockResolvedValue(0);

    await GET(createRequest({ tag: "help" }));

    expect(mockArticleFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isPublished: true,
          tags: { has: "help" },
        }),
      })
    );
  });

  // 4. Filters by search query
  it("filters by search query", async () => {
    mockArticleFindMany.mockResolvedValue([]);
    mockArticleCount.mockResolvedValue(0);

    await GET(createRequest({ search: "test query" }));

    expect(mockArticleFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isPublished: true,
          OR: [
            { title: { contains: "test query", mode: "insensitive" } },
            { content: { contains: "test query", mode: "insensitive" } },
          ],
        }),
      })
    );
  });

  // 5. Supports "limit" as alias for pageSize
  it("supports 'limit' as alias for pageSize", async () => {
    mockArticleFindMany.mockResolvedValue([]);
    mockArticleCount.mockResolvedValue(0);

    const response = await GET(createRequest({ limit: "5" }));
    const data = await response.json();

    expect(data.limit).toBe(5);
    expect(data.pagination.pageSize).toBe(5);

    // Verify take: 5 was passed to findMany
    expect(mockArticleFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 5,
      })
    );
  });

  // 6. Sets Cache-Control header
  it("sets Cache-Control header", async () => {
    mockArticleFindMany.mockResolvedValue([]);
    mockArticleCount.mockResolvedValue(0);

    const response = await GET(createRequest());

    const cacheControl = response.headers.get("Cache-Control");
    expect(cacheControl).toBe(
      "public, s-maxage=120, stale-while-revalidate=600"
    );
  });

  // 7. Generates excerpt by stripping HTML from content
  it("generates excerpt by stripping HTML from content", async () => {
    const articleWithHtml = {
      ...mockArticle,
      content:
        "<h1>Title</h1><p>Paragraph with <strong>bold</strong> and <em>italic</em> text.</p>",
    };
    mockArticleFindMany.mockResolvedValue([articleWithHtml]);
    mockArticleCount.mockResolvedValue(1);

    const response = await GET(createRequest());
    const data = await response.json();

    const excerpt = data.articles[0].excerpt;
    // Should have HTML tags stripped
    expect(excerpt).not.toContain("<");
    expect(excerpt).not.toContain(">");
    // Should contain the text content
    expect(excerpt).toContain("Title");
    expect(excerpt).toContain("Paragraph with");
    expect(excerpt).toContain("bold");
    expect(excerpt).toContain("italic");
    // Excerpt should be at most 150 characters
    expect(excerpt.length).toBeLessThanOrEqual(150);
  });

  // 8. Returns 500 on error
  it("returns 500 on error", async () => {
    mockArticleFindMany.mockRejectedValue(new Error("DB connection failed"));

    const response = await GET(createRequest());
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.message).toBe("获取文章列表失败");
  });

  // 9. Paginates correctly
  it("paginates correctly", async () => {
    mockArticleFindMany.mockResolvedValue([]);
    mockArticleCount.mockResolvedValue(100);

    const response = await GET(createRequest({ page: "3", pageSize: "10" }));
    const data = await response.json();

    expect(data.page).toBe(3);
    expect(data.limit).toBe(10);
    expect(data.pagination).toEqual({
      page: 3,
      pageSize: 10,
      total: 100,
      totalPages: 10,
    });

    expect(mockArticleFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 20, // (3-1) * 10
        take: 10,
      })
    );
  });

  // 10. Truncates search query to 200 chars
  it("truncates search query to 200 chars", async () => {
    mockArticleFindMany.mockResolvedValue([]);
    mockArticleCount.mockResolvedValue(0);

    const longSearch = "a".repeat(300);
    await GET(createRequest({ search: longSearch }));

    const whereArg = mockArticleFindMany.mock.calls[0][0].where;
    expect(whereArg.OR[0].title.contains.length).toBe(200);
    expect(whereArg.OR[1].content.contains.length).toBe(200);
  });

  // 11. Combines category, tag, and search filters
  it("combines category, tag, and search filters", async () => {
    mockArticleFindMany.mockResolvedValue([]);
    mockArticleCount.mockResolvedValue(0);

    await GET(createRequest({ category: "FAQ", tag: "guide", search: "test" }));

    const whereArg = mockArticleFindMany.mock.calls[0][0].where;
    expect(whereArg.isPublished).toBe(true);
    expect(whereArg.category).toBe("FAQ");
    expect(whereArg.tags).toEqual({ has: "guide" });
    expect(whereArg.OR).toBeDefined();
  });

  // 12. Extracts date as YYYY-MM-DD from createdAt
  it("extracts date as YYYY-MM-DD from createdAt", async () => {
    const article = {
      ...mockArticle,
      createdAt: new Date("2026-03-08T15:30:00Z"),
    };
    mockArticleFindMany.mockResolvedValue([article]);
    mockArticleCount.mockResolvedValue(1);

    const response = await GET(createRequest());
    const data = await response.json();

    expect(data.articles[0].date).toBe("2026-03-08");
  });
});
