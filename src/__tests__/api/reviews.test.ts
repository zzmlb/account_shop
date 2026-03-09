import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Mocks — declared BEFORE importing the route handler
// ---------------------------------------------------------------------------

const mockReviewFindMany = vi.fn();
const mockReviewCount = vi.fn();
const mockReviewGroupBy = vi.fn();
const mockReviewFindUnique = vi.fn();
const mockReviewCreate = vi.fn();
const mockProductFindUnique = vi.fn();
const mockOrderItemFindFirst = vi.fn();

vi.mock("@/server/db", () => ({
  db: {
    review: {
      findMany: (...args: unknown[]) => mockReviewFindMany(...args),
      count: (...args: unknown[]) => mockReviewCount(...args),
      groupBy: (...args: unknown[]) => mockReviewGroupBy(...args),
      findUnique: (...args: unknown[]) => mockReviewFindUnique(...args),
      create: (...args: unknown[]) => mockReviewCreate(...args),
    },
    product: {
      findUnique: (...args: unknown[]) => mockProductFindUnique(...args),
    },
    orderItem: {
      findFirst: (...args: unknown[]) => mockOrderItemFindFirst(...args),
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

const mockGetUserSession = vi.fn();
vi.mock("@/lib/auth", () => ({
  getUserSession: (...args: unknown[]) => mockGetUserSession(...args),
}));

vi.mock("@/lib/sanitize", () => ({
  stripHtml: (s: string) => s.replace(/<[^>]*>/g, ""),
}));

vi.mock("@/lib/validators", () => ({
  createReviewSchema: {
    safeParse: (data: any) => {
      if (!data?.productId || !data?.rating || !data?.content) {
        return { success: false, error: { flatten: () => ({ fieldErrors: {} }) } };
      }
      return { success: true, data };
    },
  },
  formatZodError: () => "验证失败",
}));

// ---------------------------------------------------------------------------
// Import the route handler AFTER all mocks are in place
// ---------------------------------------------------------------------------

const { GET, POST } = await import("@/app/api/reviews/route");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setupAuth(userId = "user-1") {
  mockGetUserSession.mockReturnValue({
    session: { id: userId, username: "testuser", email: "test@example.com", role: "USER" },
    error: null,
  });
}

function setupUnauth() {
  const { NextResponse } = require("next/server");
  mockGetUserSession.mockReturnValue({
    session: null,
    error: NextResponse.json({ success: false, message: "未登录" }, { status: 401 }),
  });
}

function createGetRequest(params: Record<string, string> = {}) {
  const url = new URL("http://localhost:3001/api/reviews");
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return new NextRequest(url);
}

function createPostRequest(body: unknown) {
  return new NextRequest("http://localhost:3001/api/reviews", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const mockReview = {
  id: "review-1",
  rating: 5,
  content: "Great product",
  adminReply: null,
  repliedAt: null,
  createdAt: new Date("2025-01-01"),
  user: { id: "user-1", username: "testuser", avatar: null },
};

// ---------------------------------------------------------------------------
// Tests — GET /api/reviews
// ---------------------------------------------------------------------------

describe("GET /api/reviews", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockReviewFindMany.mockResolvedValue([mockReview]);
    mockReviewCount.mockResolvedValue(1);
    mockReviewGroupBy.mockResolvedValue([
      { rating: 5, _count: 1 },
    ]);
  });

  // -----------------------------------------------------------------------
  // 1. Returns reviews with stats and pagination
  // -----------------------------------------------------------------------

  it("returns reviews with stats and pagination", async () => {
    const req = createGetRequest({ productId: "prod-1" });
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);

    // Reviews
    expect(data.reviews).toHaveLength(1);
    expect(data.reviews[0]).toEqual({
      id: "review-1",
      rating: 5,
      content: "Great product",
      username: "testuser",
      avatar: null,
      adminReply: null,
      repliedAt: null,
      createdAt: new Date("2025-01-01").toISOString(),
    });

    // Stats
    expect(data.stats).toEqual({
      avgRating: 5,
      total: 1,
      ratingCounts: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 1 },
    });

    // Pagination
    expect(data.pagination).toEqual({
      page: 1,
      pageSize: 10,
      total: 1,
      totalPages: 1,
    });

    // Verify query was called with correct where clause
    const findManyArgs = mockReviewFindMany.mock.calls[0][0];
    expect(findManyArgs.where.productId).toBe("prod-1");
    expect(findManyArgs.where.isVisible).toBe(true);
    expect(findManyArgs.orderBy).toEqual({ createdAt: "desc" });
  });

  // -----------------------------------------------------------------------
  // 2. Requires productId (returns 400 if missing)
  // -----------------------------------------------------------------------

  it("returns 400 if productId is missing", async () => {
    const req = createGetRequest();
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.message).toBe("缺少商品ID");
  });

  // -----------------------------------------------------------------------
  // 3. Filters by rating
  // -----------------------------------------------------------------------

  it("filters by rating", async () => {
    const req = createGetRequest({ productId: "prod-1", rating: "4" });
    await GET(req);

    const findManyArgs = mockReviewFindMany.mock.calls[0][0];
    expect(findManyArgs.where.rating).toBe(4);
  });

  // -----------------------------------------------------------------------
  // 4. Sorts by different options
  // -----------------------------------------------------------------------

  it("sorts by oldest", async () => {
    const req = createGetRequest({ productId: "prod-1", sort: "oldest" });
    await GET(req);

    const findManyArgs = mockReviewFindMany.mock.calls[0][0];
    expect(findManyArgs.orderBy).toEqual({ createdAt: "asc" });
  });

  it("sorts by rating-high", async () => {
    const req = createGetRequest({ productId: "prod-1", sort: "rating-high" });
    await GET(req);

    const findManyArgs = mockReviewFindMany.mock.calls[0][0];
    expect(findManyArgs.orderBy).toEqual({ rating: "desc" });
  });

  it("sorts by rating-low", async () => {
    const req = createGetRequest({ productId: "prod-1", sort: "rating-low" });
    await GET(req);

    const findManyArgs = mockReviewFindMany.mock.calls[0][0];
    expect(findManyArgs.orderBy).toEqual({ rating: "asc" });
  });

  it("defaults to newest sort", async () => {
    const req = createGetRequest({ productId: "prod-1" });
    await GET(req);

    const findManyArgs = mockReviewFindMany.mock.calls[0][0];
    expect(findManyArgs.orderBy).toEqual({ createdAt: "desc" });
  });

  // -----------------------------------------------------------------------
  // 5. Returns 500 on error
  // -----------------------------------------------------------------------

  it("returns 500 on database error", async () => {
    mockReviewFindMany.mockRejectedValue(new Error("DB connection failed"));

    const req = createGetRequest({ productId: "prod-1" });
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.message).toBe("服务器内部错误");
  });
});

// ---------------------------------------------------------------------------
// Tests — POST /api/reviews
// ---------------------------------------------------------------------------

describe("POST /api/reviews", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuth();
  });

  const validBody = {
    productId: "prod-1",
    rating: 5,
    content: "Great product",
  };

  const createdReview = {
    id: "review-new",
    rating: 5,
    content: "Great product",
    createdAt: new Date("2025-01-01"),
    user: { username: "testuser", avatar: null },
  };

  function setupProductExists() {
    mockProductFindUnique.mockResolvedValue({
      id: "prod-1",
      name: "Test Product",
      isActive: true,
    });
  }

  function setupPurchased() {
    mockOrderItemFindFirst.mockResolvedValue({ id: "order-item-1" });
  }

  function setupNoExistingReview() {
    mockReviewFindUnique.mockResolvedValue(null);
  }

  function setupAllPreconditions() {
    setupProductExists();
    setupPurchased();
    setupNoExistingReview();
    mockReviewCreate.mockResolvedValue(createdReview);
  }

  // -----------------------------------------------------------------------
  // 1. Creates review successfully
  // -----------------------------------------------------------------------

  it("creates review successfully", async () => {
    setupAllPreconditions();

    const req = createPostRequest(validBody);
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.review).toEqual({
      id: "review-new",
      rating: 5,
      content: "Great product",
      username: "testuser",
      avatar: null,
      createdAt: new Date("2025-01-01").toISOString(),
    });

    // Verify review.create was called with correct data
    const createArgs = mockReviewCreate.mock.calls[0][0];
    expect(createArgs.data.productId).toBe("prod-1");
    expect(createArgs.data.userId).toBe("user-1");
    expect(createArgs.data.rating).toBe(5);
    expect(createArgs.data.content).toBe("Great product");
  });

  // -----------------------------------------------------------------------
  // 2. Returns 401 if not authenticated
  // -----------------------------------------------------------------------

  it("returns 401 if not authenticated", async () => {
    setupUnauth();

    const req = createPostRequest(validBody);
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.message).toBe("未登录");
  });

  // -----------------------------------------------------------------------
  // 3. Returns 400 for invalid body
  // -----------------------------------------------------------------------

  it("returns 400 for invalid body", async () => {
    const req = createPostRequest({ productId: "prod-1" });
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.message).toBe("验证失败");
  });

  // -----------------------------------------------------------------------
  // 4. Returns 400 if product doesn't exist
  // -----------------------------------------------------------------------

  it("returns 400 if product does not exist", async () => {
    mockProductFindUnique.mockResolvedValue(null);

    const req = createPostRequest(validBody);
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.message).toBe("商品不存在或已下架");
  });

  it("returns 400 if product is inactive", async () => {
    mockProductFindUnique.mockResolvedValue({
      id: "prod-1",
      name: "Test Product",
      isActive: false,
    });

    const req = createPostRequest(validBody);
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.message).toBe("商品不存在或已下架");
  });

  // -----------------------------------------------------------------------
  // 5. Returns 403 if user hasn't purchased
  // -----------------------------------------------------------------------

  it("returns 403 if user has not purchased the product", async () => {
    setupProductExists();
    mockOrderItemFindFirst.mockResolvedValue(null);

    const req = createPostRequest(validBody);
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.success).toBe(false);
    expect(data.message).toBe("只有购买过该商品的用户才能评价");
  });

  // -----------------------------------------------------------------------
  // 6. Returns 409 if already reviewed
  // -----------------------------------------------------------------------

  it("returns 409 if user already reviewed the product", async () => {
    setupProductExists();
    setupPurchased();
    mockReviewFindUnique.mockResolvedValue({ id: "existing-review" });

    const req = createPostRequest(validBody);
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.success).toBe(false);
    expect(data.message).toBe("您已经评价过该商品");
  });

  // -----------------------------------------------------------------------
  // 7. Strips HTML from content
  // -----------------------------------------------------------------------

  it("strips HTML from content before saving", async () => {
    setupProductExists();
    setupPurchased();
    setupNoExistingReview();
    mockReviewCreate.mockResolvedValue({
      ...createdReview,
      content: "Clean content with no tags",
    });

    const req = createPostRequest({
      productId: "prod-1",
      rating: 5,
      content: "<b>Clean</b> content <script>alert('xss')</script>with no tags",
    });
    const response = await POST(req);
    await response.json();

    // Verify stripHtml was applied: the content passed to create should have tags removed
    const createArgs = mockReviewCreate.mock.calls[0][0];
    expect(createArgs.data.content).toBe("Clean content alert('xss')with no tags");
    expect(createArgs.data.content).not.toContain("<b>");
    expect(createArgs.data.content).not.toContain("<script>");
  });
});
