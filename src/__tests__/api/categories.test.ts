import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Mocks – must be declared before importing the route module
// ---------------------------------------------------------------------------

const mockCategoryFindMany = vi.fn();

vi.mock("@/server/db", () => ({
  db: {
    category: {
      findMany: (...args: unknown[]) => mockCategoryFindMany(...args),
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
// Fixtures
// ---------------------------------------------------------------------------

const mockCategory = {
  id: "cat-1",
  name: "Games",
  slug: "games",
  description: "Gaming products",
  icon: "gamepad",
  _count: { products: 5 },
};

function createRequest() {
  return new NextRequest("http://localhost:3001/api/categories", {
    method: "GET",
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("GET /api/categories", () => {
  let GET: typeof import("@/app/api/categories/route").GET;

  beforeEach(async () => {
    vi.clearAllMocks();

    const mod = await import("@/app/api/categories/route");
    GET = mod.GET;
  });

  it("should return categories successfully", async () => {
    mockCategoryFindMany.mockResolvedValue([mockCategory]);

    const response = await GET(createRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.categories).toHaveLength(1);
    expect(data.categories[0].name).toBe("Games");
  });

  it("should format categories correctly with productCount from _count.products", async () => {
    mockCategoryFindMany.mockResolvedValue([mockCategory]);

    const response = await GET(createRequest());
    const data = await response.json();

    const category = data.categories[0];
    expect(category).toEqual({
      id: "cat-1",
      name: "Games",
      slug: "games",
      description: "Gaming products",
      icon: "gamepad",
      productCount: 5,
    });
    // _count should not be present in the formatted output
    expect(category._count).toBeUndefined();
  });

  it("should return empty array when no categories exist", async () => {
    mockCategoryFindMany.mockResolvedValue([]);

    const response = await GET(createRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.categories).toEqual([]);
  });

  it("should set Cache-Control header", async () => {
    mockCategoryFindMany.mockResolvedValue([]);

    const response = await GET(createRequest());

    const cacheControl = response.headers.get("Cache-Control");
    expect(cacheControl).toBe(
      "public, s-maxage=300, stale-while-revalidate=1800"
    );
  });

  it("should return 500 on database error", async () => {
    mockCategoryFindMany.mockRejectedValue(new Error("DB connection failed"));

    const response = await GET(createRequest());
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.message).toBe("服务器内部错误");
  });
});
