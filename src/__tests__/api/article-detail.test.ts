import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Mocks — declared BEFORE importing the route handler
// ---------------------------------------------------------------------------

const mockArticleFindUnique = vi.fn();
const mockArticleUpdate = vi.fn();

vi.mock("@/server/db", () => ({
  db: {
    article: {
      findUnique: (...args: unknown[]) => mockArticleFindUnique(...args),
      update: (...args: unknown[]) => mockArticleUpdate(...args),
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

const { GET } = await import("@/app/api/articles/[slug]/route");

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const now = new Date("2026-03-08T10:00:00Z");

const mockArticle = {
  id: "art-1",
  title: "测试文章",
  slug: "test-article",
  content: "<p>内容</p>",
  category: "公告",
  tags: ["tag1"],
  isPublished: true,
  viewCount: 42,
  createdAt: now,
  updatedAt: now,
};

function createRequest(slug: string) {
  const url = new URL(`http://localhost:3001/api/articles/${slug}`);
  return new NextRequest(url, { method: "GET" });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("GET /api/articles/[slug]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockArticleFindUnique.mockResolvedValue({ ...mockArticle });
    mockArticleUpdate.mockResolvedValue({});
  });

  // 1. Returns article detail with formatted fields
  it("returns article detail with formatted fields", async () => {
    const res = await GET(createRequest("test-article"), {
      params: Promise.resolve({ slug: "test-article" }),
    });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.article).toMatchObject({
      id: "art-1",
      title: "测试文章",
      slug: "test-article",
      content: "<p>内容</p>",
      category: "公告",
      tags: ["tag1"],
      viewCount: 42,
    });
    expect(data.article.date).toBeDefined();
    expect(data.article.updatedAt).toBeDefined();
  });

  // 2. Returns 404 for non-existent article
  it("returns 404 for non-existent article", async () => {
    mockArticleFindUnique.mockResolvedValue(null);

    const res = await GET(createRequest("nonexistent"), {
      params: Promise.resolve({ slug: "nonexistent" }),
    });
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.success).toBe(false);
    expect(data.message).toBe("文章不存在");
  });

  // 3. Sets Cache-Control header
  it("sets Cache-Control header", async () => {
    const res = await GET(createRequest("test-article"), {
      params: Promise.resolve({ slug: "test-article" }),
    });

    const cacheControl = res.headers.get("Cache-Control");
    expect(cacheControl).toBe(
      "public, s-maxage=120, stale-while-revalidate=600"
    );
  });

  // 4. Extracts date from createdAt (YYYY-MM-DD format)
  it("extracts date from createdAt in YYYY-MM-DD format", async () => {
    const res = await GET(createRequest("test-article"), {
      params: Promise.resolve({ slug: "test-article" }),
    });
    const data = await res.json();

    expect(data.article.date).toBe("2026-03-08");
  });

  // 5. Increments view count (fire-and-forget)
  it("increments view count (fire-and-forget)", async () => {
    await GET(createRequest("test-article"), {
      params: Promise.resolve({ slug: "test-article" }),
    });

    expect(mockArticleUpdate).toHaveBeenCalledWith({
      where: { id: "art-1" },
      data: { viewCount: { increment: 1 } },
    });
  });

  // 6. Returns 500 on error
  it("returns 500 on error", async () => {
    mockArticleFindUnique.mockRejectedValue(new Error("DB connection failed"));

    const res = await GET(createRequest("test-article"), {
      params: Promise.resolve({ slug: "test-article" }),
    });
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.message).toBe("获取文章详情失败");
  });

  // -----------------------------------------------------------------------
  // Edge cases
  // -----------------------------------------------------------------------

  it("queries with isPublished: true in where clause", async () => {
    mockArticleFindUnique.mockResolvedValue(null);

    await GET(createRequest("draft-article"), {
      params: Promise.resolve({ slug: "draft-article" }),
    });

    expect(mockArticleFindUnique).toHaveBeenCalledWith({
      where: { slug: "draft-article", isPublished: true },
    });
  });

  it("handles article with empty tags array", async () => {
    mockArticleFindUnique.mockResolvedValue({ ...mockArticle, tags: [] });

    const res = await GET(createRequest("test-article"), {
      params: Promise.resolve({ slug: "test-article" }),
    });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.article.tags).toEqual([]);
  });

  it("does not fail when view count update rejects", async () => {
    mockArticleUpdate.mockRejectedValue(new Error("update failed"));

    const res = await GET(createRequest("test-article"), {
      params: Promise.resolve({ slug: "test-article" }),
    });

    // Should still return 200 (view count is fire-and-forget)
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });
});
