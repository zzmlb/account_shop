import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Mocks
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
    info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(),
  }),
}));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

const { GET } = await import("@/app/api/articles/[slug]/route");

const now = new Date("2026-03-01T10:00:00Z");

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

function makeReq(slug: string) {
  return new NextRequest(`http://localhost/api/articles/${slug}`, { method: "GET" });
}

function makeParams(slug: string) {
  return { params: Promise.resolve({ slug }) };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("GET /api/articles/[slug]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // update returns a promise (fire-and-forget in route)
    mockArticleUpdate.mockResolvedValue({});
  });

  it("returns article detail for published article", async () => {
    mockArticleFindUnique.mockResolvedValue(mockArticle);

    const res = await GET(makeReq("test-article"), makeParams("test-article"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.article).toMatchObject({
      id: "art-1",
      title: "测试文章",
      slug: "test-article",
      category: "公告",
      tags: ["tag1", "tag2"],
      viewCount: 42,
    });
    expect(data.article.date).toBe("2026-03-01");
  });

  it("returns 404 for non-existent article", async () => {
    mockArticleFindUnique.mockResolvedValue(null);

    const res = await GET(makeReq("nonexistent"), makeParams("nonexistent"));
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.success).toBe(false);
    expect(data.message).toContain("不存在");
  });

  it("queries with isPublished: true filter", async () => {
    mockArticleFindUnique.mockResolvedValue(null);

    await GET(makeReq("test"), makeParams("test"));

    expect(mockArticleFindUnique).toHaveBeenCalledWith({
      where: { slug: "test", isPublished: true },
    });
  });

  it("increments view count on successful fetch", async () => {
    mockArticleFindUnique.mockResolvedValue(mockArticle);

    await GET(makeReq("test-article"), makeParams("test-article"));

    expect(mockArticleUpdate).toHaveBeenCalledWith({
      where: { id: "art-1" },
      data: { viewCount: { increment: 1 } },
    });
  });

  it("sets cache-control header", async () => {
    mockArticleFindUnique.mockResolvedValue(mockArticle);

    const res = await GET(makeReq("test-article"), makeParams("test-article"));

    expect(res.headers.get("cache-control")).toContain("public");
    expect(res.headers.get("cache-control")).toContain("s-maxage=120");
  });
});
