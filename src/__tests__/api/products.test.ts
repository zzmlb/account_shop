import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Mocks — declared BEFORE importing the route handler
// ---------------------------------------------------------------------------

const mockProductFindMany = vi.fn();
const mockProductCount = vi.fn();
const mockReviewGroupBy = vi.fn();

vi.mock("@/server/db", () => ({
  db: {
    product: {
      findMany: (...args: unknown[]) => mockProductFindMany(...args),
      count: (...args: unknown[]) => mockProductCount(...args),
    },
    review: {
      groupBy: (...args: unknown[]) => mockReviewGroupBy(...args),
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

const { GET } = await import("@/app/api/products/route");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createRequest(params: Record<string, string> = {}) {
  const url = new URL("http://localhost:3001/api/products");
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return new NextRequest(url);
}

const mockProduct = {
  id: "prod-1",
  name: "Test Product",
  slug: "test-product",
  description: "A test product",
  price: 99.9,
  originalPrice: 199.9,
  image: "/img/test.jpg",
  images: [],
  tags: ["tag1"],
  stockCount: 10,
  soldCount: 5,
  isActive: true,
  createdAt: new Date("2025-01-01"),
  category: { name: "Games", slug: "games" },
  _count: { reviews: 3 },
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("GET /api/products", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Defaults: one product returned, total = 1, no reviews
    mockProductFindMany.mockResolvedValue([mockProduct]);
    mockProductCount.mockResolvedValue(1);
    mockReviewGroupBy.mockResolvedValue([
      { productId: "prod-1", _avg: { rating: 4.5 } },
    ]);
  });

  // -----------------------------------------------------------------------
  // 1. Returns products with default pagination
  // -----------------------------------------------------------------------

  it("returns products with default pagination", async () => {
    const req = createRequest();
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.products).toHaveLength(1);
    expect(data.pagination).toEqual({
      page: 1,
      pageSize: 12,
      total: 1,
      totalPages: 1,
    });
  });

  // -----------------------------------------------------------------------
  // 2. Filters by category
  // -----------------------------------------------------------------------

  it("filters by category", async () => {
    const req = createRequest({ category: "Games" });
    await GET(req);

    const whereArg = mockProductFindMany.mock.calls[0][0].where;
    expect(whereArg.category).toEqual({ name: "Games" });
  });

  it("does not filter by category when value is '全部'", async () => {
    const req = createRequest({ category: "全部" });
    await GET(req);

    const whereArg = mockProductFindMany.mock.calls[0][0].where;
    expect(whereArg.category).toBeUndefined();
  });

  // -----------------------------------------------------------------------
  // 3. Filters by search term
  // -----------------------------------------------------------------------

  it("filters by search term with contains/insensitive on name and description", async () => {
    const req = createRequest({ search: "cool" });
    await GET(req);

    const whereArg = mockProductFindMany.mock.calls[0][0].where;
    expect(whereArg.OR).toEqual([
      { name: { contains: "cool", mode: "insensitive" } },
      { description: { contains: "cool", mode: "insensitive" } },
    ]);
  });

  // -----------------------------------------------------------------------
  // 4. Filters by inStock=true
  // -----------------------------------------------------------------------

  it("filters by inStock=true with stockCount > 0", async () => {
    const req = createRequest({ inStock: "true" });
    await GET(req);

    const whereArg = mockProductFindMany.mock.calls[0][0].where;
    expect(whereArg.stockCount).toEqual({ gt: 0 });
  });

  it("does not filter stockCount when inStock is not 'true'", async () => {
    const req = createRequest({ inStock: "false" });
    await GET(req);

    const whereArg = mockProductFindMany.mock.calls[0][0].where;
    expect(whereArg.stockCount).toBeUndefined();
  });

  // -----------------------------------------------------------------------
  // 5. Filters by price range
  // -----------------------------------------------------------------------

  it("filters by minPrice and maxPrice", async () => {
    const req = createRequest({ minPrice: "10", maxPrice: "100" });
    await GET(req);

    const whereArg = mockProductFindMany.mock.calls[0][0].where;
    expect(whereArg.price).toEqual({ gte: 10, lte: 100 });
  });

  it("filters by minPrice only", async () => {
    const req = createRequest({ minPrice: "50" });
    await GET(req);

    const whereArg = mockProductFindMany.mock.calls[0][0].where;
    expect(whereArg.price).toEqual({ gte: 50 });
  });

  it("filters by maxPrice only", async () => {
    const req = createRequest({ maxPrice: "200" });
    await GET(req);

    const whereArg = mockProductFindMany.mock.calls[0][0].where;
    expect(whereArg.price).toEqual({ lte: 200 });
  });

  // -----------------------------------------------------------------------
  // 6. Swaps min/max price if min > max
  // -----------------------------------------------------------------------

  it("swaps minPrice and maxPrice when min > max", async () => {
    const req = createRequest({ minPrice: "200", maxPrice: "50" });
    await GET(req);

    const whereArg = mockProductFindMany.mock.calls[0][0].where;
    expect(whereArg.price).toEqual({ gte: 50, lte: 200 });
  });

  // -----------------------------------------------------------------------
  // 7. Sorting
  // -----------------------------------------------------------------------

  it("sorts by price ascending with sort=price_asc", async () => {
    const req = createRequest({ sort: "price_asc" });
    await GET(req);

    const orderByArg = mockProductFindMany.mock.calls[0][0].orderBy;
    expect(orderByArg).toEqual({ price: "asc" });
  });

  it("sorts by price descending with sort=price_desc", async () => {
    const req = createRequest({ sort: "price_desc" });
    await GET(req);

    const orderByArg = mockProductFindMany.mock.calls[0][0].orderBy;
    expect(orderByArg).toEqual({ price: "desc" });
  });

  it("sorts by newest with sort=newest", async () => {
    const req = createRequest({ sort: "newest" });
    await GET(req);

    const orderByArg = mockProductFindMany.mock.calls[0][0].orderBy;
    expect(orderByArg).toEqual({ createdAt: "desc" });
  });

  it("uses default sort (soldCount desc) when no sort param", async () => {
    const req = createRequest();
    await GET(req);

    const orderByArg = mockProductFindMany.mock.calls[0][0].orderBy;
    expect(orderByArg).toEqual({ soldCount: "desc" });
  });

  // -----------------------------------------------------------------------
  // 8. Filters by slugs (comma-separated)
  // -----------------------------------------------------------------------

  it("filters by comma-separated slugs", async () => {
    const req = createRequest({ slugs: "slug-a,slug-b,slug-c" });
    await GET(req);

    const whereArg = mockProductFindMany.mock.calls[0][0].where;
    expect(whereArg.slug).toEqual({ in: ["slug-a", "slug-b", "slug-c"] });
  });

  // -----------------------------------------------------------------------
  // 9. Uses "limit" as alias for pageSize
  // -----------------------------------------------------------------------

  it("uses 'limit' as alias for pageSize", async () => {
    const req = createRequest({ limit: "5" });
    await GET(req);

    const findManyArgs = mockProductFindMany.mock.calls[0][0];
    expect(findManyArgs.take).toBe(5);
  });

  // -----------------------------------------------------------------------
  // 10. Returns 500 on database error
  // -----------------------------------------------------------------------

  it("returns 500 on database error", async () => {
    mockProductFindMany.mockRejectedValue(new Error("DB connection failed"));

    const req = createRequest();
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.message).toBe("服务器内部错误");
  });

  // -----------------------------------------------------------------------
  // 11. Formats products correctly
  // -----------------------------------------------------------------------

  it("formats products correctly with price as Number, dates as ISO string, and computed fields", async () => {
    const req = createRequest();
    const response = await GET(req);
    const data = await response.json();

    const product = data.products[0];
    expect(product).toEqual({
      id: "prod-1",
      name: "Test Product",
      slug: "test-product",
      category: "Games",
      categorySlug: "games",
      price: 99.9,
      originalPrice: 199.9,
      stock: 10,
      stockCount: 10,
      status: "active",
      salesCount: 5,
      description: "A test product",
      image: "/img/test.jpg",
      images: [],
      tags: ["tag1"],
      avgRating: 4.5,
      reviewCount: 3,
      createdAt: new Date("2025-01-01").toISOString(),
    });

    // Verify types
    expect(typeof product.price).toBe("number");
    expect(typeof product.createdAt).toBe("string");
  });

  it("returns status 'out_of_stock' when stockCount is 0", async () => {
    mockProductFindMany.mockResolvedValue([
      { ...mockProduct, id: "prod-oos", stockCount: 0 },
    ]);
    mockReviewGroupBy.mockResolvedValue([]);

    const req = createRequest();
    const response = await GET(req);
    const data = await response.json();

    expect(data.products[0].status).toBe("out_of_stock");
  });

  it("omits originalPrice from response when product has no originalPrice", async () => {
    mockProductFindMany.mockResolvedValue([
      { ...mockProduct, id: "prod-no-orig", originalPrice: null },
    ]);
    mockReviewGroupBy.mockResolvedValue([]);

    const req = createRequest();
    const response = await GET(req);
    const data = await response.json();

    expect(data.products[0].originalPrice).toBeUndefined();
  });

  it("returns avgRating 0 when no reviews exist for a product", async () => {
    mockReviewGroupBy.mockResolvedValue([]);

    const req = createRequest();
    const response = await GET(req);
    const data = await response.json();

    expect(data.products[0].avgRating).toBe(0);
  });

  // -----------------------------------------------------------------------
  // 12. Sets Cache-Control header
  // -----------------------------------------------------------------------

  it("sets Cache-Control header on successful response", async () => {
    const req = createRequest();
    const response = await GET(req);

    expect(response.headers.get("Cache-Control")).toBe(
      "public, s-maxage=60, stale-while-revalidate=300"
    );
  });
});
