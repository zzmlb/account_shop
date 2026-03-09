import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Mocks — declared BEFORE importing the route handler
// ---------------------------------------------------------------------------

const mockReviewFindMany = vi.fn();

vi.mock("@/server/db", () => ({
  db: {
    review: {
      findMany: (...args: unknown[]) => mockReviewFindMany(...args),
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

const { GET } = await import("@/app/api/reviews/featured/route");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createRequest() {
  return new NextRequest("http://localhost:3001/api/reviews/featured");
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const mockFeaturedReviews = [
  {
    id: "review-1",
    rating: 5,
    content: "Excellent product, highly recommended for everyone!",
    isVisible: true,
    user: { username: "testuser" },
    product: { name: "Premium Software" },
  },
  {
    id: "review-2",
    rating: 4,
    content: "Good value for the price.",
    isVisible: true,
    user: { username: "alice" },
    product: { name: "Digital Art Pack" },
  },
];

// ---------------------------------------------------------------------------
// Tests — GET /api/reviews/featured
// ---------------------------------------------------------------------------

describe("GET /api/reviews/featured", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReviewFindMany.mockResolvedValue(mockFeaturedReviews);
  });

  // -----------------------------------------------------------------------
  // 1. Returns formatted featured reviews with masked usernames
  // -----------------------------------------------------------------------

  it("returns formatted featured reviews with masked usernames", async () => {
    const req = createRequest();
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.reviews).toHaveLength(2);

    expect(data.reviews[0]).toEqual({
      username: "t**r",
      rating: 5,
      content: "Excellent product, highly recommended for everyone!",
      product: "Premium Software",
    });

    expect(data.reviews[1]).toEqual({
      username: "a**e",
      rating: 4,
      content: "Good value for the price.",
      product: "Digital Art Pack",
    });

    // Verify findMany was called with correct query
    const findManyArgs = mockReviewFindMany.mock.calls[0][0];
    expect(findManyArgs.where.isVisible).toBe(true);
    expect(findManyArgs.where.rating).toEqual({ gte: 4 });
    expect(findManyArgs.where.content).toEqual({ not: "" });
    expect(findManyArgs.include.user.select.username).toBe(true);
    expect(findManyArgs.include.product.select.name).toBe(true);
    expect(findManyArgs.orderBy).toEqual({ rating: "desc" });
    expect(findManyArgs.take).toBe(6);
  });

  // -----------------------------------------------------------------------
  // 2. Masks short username (<=2 chars)
  // -----------------------------------------------------------------------

  it("masks short username (<=2 chars): first char + '**'", async () => {
    mockReviewFindMany.mockResolvedValue([
      {
        id: "review-short",
        rating: 5,
        content: "Great!",
        isVisible: true,
        user: { username: "\u5F20" },
        product: { name: "Product A" },
      },
    ]);

    const req = createRequest();
    const response = await GET(req);
    const data = await response.json();

    expect(data.reviews[0].username).toBe("\u5F20**");
  });

  // -----------------------------------------------------------------------
  // 3. Masks long username (>2 chars): first + "**" + last
  // -----------------------------------------------------------------------

  it("masks long username (>2 chars): first + '**' + last", async () => {
    mockReviewFindMany.mockResolvedValue([
      {
        id: "review-long",
        rating: 5,
        content: "Nice!",
        isVisible: true,
        user: { username: "testuser" },
        product: { name: "Product B" },
      },
    ]);

    const req = createRequest();
    const response = await GET(req);
    const data = await response.json();

    expect(data.reviews[0].username).toBe("t**r");
  });

  // -----------------------------------------------------------------------
  // 4. Truncates long content at 80 chars
  // -----------------------------------------------------------------------

  it("truncates content longer than 80 characters with '...'", async () => {
    const longContent = "A".repeat(100);

    mockReviewFindMany.mockResolvedValue([
      {
        id: "review-long-content",
        rating: 5,
        content: longContent,
        isVisible: true,
        user: { username: "bob" },
        product: { name: "Product C" },
      },
    ]);

    const req = createRequest();
    const response = await GET(req);
    const data = await response.json();

    expect(data.reviews[0].content).toBe("A".repeat(80) + "...");
    expect(data.reviews[0].content.length).toBe(83);
  });

  // -----------------------------------------------------------------------
  // 5. Sets Cache-Control header correctly
  // -----------------------------------------------------------------------

  it("sets Cache-Control header correctly", async () => {
    const req = createRequest();
    const response = await GET(req);

    expect(response.headers.get("Cache-Control")).toBe(
      "public, s-maxage=600, stale-while-revalidate=1800"
    );
  });

  // -----------------------------------------------------------------------
  // 6. Returns empty array on error (graceful fallback)
  // -----------------------------------------------------------------------

  it("returns empty array on error (graceful fallback)", async () => {
    mockReviewFindMany.mockRejectedValue(new Error("DB connection failed"));

    const req = createRequest();
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.reviews).toEqual([]);
  });
});
