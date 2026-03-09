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

let mockUserSession: { id: string; role: string } | null = { id: "user-1", role: "USER" };
vi.mock("@/lib/auth", () => ({
  getUserSession: () => {
    if (!mockUserSession) {
      const { NextResponse } = require("next/server");
      return { session: null, error: NextResponse.json({ success: false, message: "未登录" }, { status: 401 }) };
    }
    return { session: mockUserSession, error: null };
  },
}));

// ---------------------------------------------------------------------------
// Import the route handler AFTER all mocks are in place
// ---------------------------------------------------------------------------

const { GET } = await import("@/app/api/reviews/my/route");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createRequest() {
  return new NextRequest("http://localhost:3001/api/reviews/my");
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const now = new Date("2026-03-08T10:00:00Z");
const mockReview = {
  id: "rev-1",
  rating: 5,
  content: "很好用",
  isVisible: true,
  adminReply: "感谢好评",
  repliedAt: now,
  createdAt: now,
  userId: "user-1",
  product: { id: "prod-1", name: "Test Product", slug: "test-product", image: "/img.jpg", price: 29.99 },
};

// ---------------------------------------------------------------------------
// Tests — GET /api/reviews/my
// ---------------------------------------------------------------------------

describe("GET /api/reviews/my", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserSession = { id: "user-1", role: "USER" };
    mockReviewFindMany.mockResolvedValue([mockReview]);
  });

  // -----------------------------------------------------------------------
  // 1. Returns user's reviews with product info
  // -----------------------------------------------------------------------

  it("returns user's reviews with product info", async () => {
    const req = createRequest();
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.reviews).toHaveLength(1);

    const review = data.reviews[0];
    expect(review).toEqual({
      id: "rev-1",
      rating: 5,
      content: "很好用",
      isVisible: true,
      adminReply: "感谢好评",
      repliedAt: now.toISOString(),
      createdAt: now.toISOString(),
      product: {
        id: "prod-1",
        name: "Test Product",
        slug: "test-product",
        image: "/img.jpg",
        price: 29.99,
      },
    });
  });

  // -----------------------------------------------------------------------
  // 2. Returns 401 when not authenticated
  // -----------------------------------------------------------------------

  it("returns 401 when not authenticated", async () => {
    mockUserSession = null;

    const req = createRequest();
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.message).toBe("未登录");
    expect(mockReviewFindMany).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // 3. Converts product price to number
  // -----------------------------------------------------------------------

  it("converts product price to number", async () => {
    mockReviewFindMany.mockResolvedValue([
      {
        ...mockReview,
        product: { ...mockReview.product, price: "49.99" },
      },
    ]);

    const req = createRequest();
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.reviews[0].product.price).toBe(49.99);
    expect(typeof data.reviews[0].product.price).toBe("number");
  });

  // -----------------------------------------------------------------------
  // 4. Handles null repliedAt
  // -----------------------------------------------------------------------

  it("handles null repliedAt", async () => {
    mockReviewFindMany.mockResolvedValue([
      {
        ...mockReview,
        adminReply: null,
        repliedAt: null,
      },
    ]);

    const req = createRequest();
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.reviews[0].repliedAt).toBeNull();
    expect(data.reviews[0].adminReply).toBeNull();
  });

  // -----------------------------------------------------------------------
  // 5. Queries with correct userId from session
  // -----------------------------------------------------------------------

  it("queries with correct userId from session", async () => {
    mockUserSession = { id: "user-42", role: "USER" };
    mockReviewFindMany.mockResolvedValue([]);

    const req = createRequest();
    await GET(req);

    expect(mockReviewFindMany).toHaveBeenCalledTimes(1);
    const findManyArgs = mockReviewFindMany.mock.calls[0][0];
    expect(findManyArgs.where.userId).toBe("user-42");
    expect(findManyArgs.orderBy).toEqual({ createdAt: "desc" });
    expect(findManyArgs.take).toBe(100);
    expect(findManyArgs.include.product.select).toEqual({
      id: true,
      name: true,
      slug: true,
      image: true,
      price: true,
    });
  });

  // -----------------------------------------------------------------------
  // 6. Returns 500 on error
  // -----------------------------------------------------------------------

  it("returns 500 on database error", async () => {
    mockReviewFindMany.mockRejectedValue(new Error("DB connection failed"));

    const req = createRequest();
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.message).toBe("服务器内部错误");
  });

  // -----------------------------------------------------------------------
  // Edge cases
  // -----------------------------------------------------------------------

  it("returns empty array when user has no reviews", async () => {
    mockReviewFindMany.mockResolvedValue([]);

    const req = createRequest();
    const response = await GET(req);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.reviews).toEqual([]);
  });

  it("includes isVisible field in response", async () => {
    mockReviewFindMany.mockResolvedValue([
      { ...mockReview, isVisible: false },
    ]);

    const req = createRequest();
    const response = await GET(req);
    const data = await response.json();

    expect(data.reviews[0].isVisible).toBe(false);
  });
});
