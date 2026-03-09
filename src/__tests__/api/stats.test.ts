import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Mocks – must be declared before importing the route module
// ---------------------------------------------------------------------------

const mockProductCount = vi.fn();
const mockUserCount = vi.fn();
const mockOrderCount = vi.fn();
const mockProductFindMany = vi.fn();

vi.mock("@/server/db", () => ({
  db: {
    product: {
      count: (...args: unknown[]) => mockProductCount(...args),
      findMany: (...args: unknown[]) => mockProductFindMany(...args),
    },
    user: {
      count: (...args: unknown[]) => mockUserCount(...args),
    },
    order: {
      count: (...args: unknown[]) => mockOrderCount(...args),
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
// Import route handler after mocks
// ---------------------------------------------------------------------------

import { GET } from "@/app/api/stats/route";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(): NextRequest {
  return new NextRequest("http://localhost:3000/api/stats", {
    method: "GET",
  });
}

function setupMocks(products = 50, users = 30, orders = 20, trending: { name: string; slug: string }[] = []) {
  mockProductCount.mockResolvedValueOnce(products);
  mockUserCount.mockResolvedValueOnce(users);
  mockOrderCount.mockResolvedValueOnce(orders);
  mockProductFindMany.mockResolvedValueOnce(trending);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("GET /api/stats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns public stats", async () => {
    setupMocks(50, 30, 20, [
      { name: "Trending A", slug: "trending-a" },
      { name: "Trending B", slug: "trending-b" },
    ]);

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.stats).toBeDefined();
    expect(body.stats.products).toBe("50");
    expect(body.stats.users).toBe("30");
    expect(body.stats.orders).toBe("20");
    expect(body.trending).toEqual(["Trending A", "Trending B"]);
  });

  it('formats count >=1000 as "X,000+"', async () => {
    setupMocks(2500, 1000, 5678);

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(body.stats.products).toBe("2,000+");
    expect(body.stats.users).toBe("1,000+");
    expect(body.stats.orders).toBe("5,000+");
  });

  it('formats count >=100 as "X00+"', async () => {
    setupMocks(150, 999, 300);

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(body.stats.products).toBe("100+");
    expect(body.stats.users).toBe("900+");
    expect(body.stats.orders).toBe("300+");
  });

  it("shows raw count for <100", async () => {
    setupMocks(0, 42, 99);

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(body.stats.products).toBe("0");
    expect(body.stats.users).toBe("42");
    expect(body.stats.orders).toBe("99");
  });

  it("returns trending product names", async () => {
    const trending = [
      { name: "Alpha", slug: "alpha" },
      { name: "Beta", slug: "beta" },
      { name: "Gamma", slug: "gamma" },
      { name: "Delta", slug: "delta" },
      { name: "Epsilon", slug: "epsilon" },
      { name: "Zeta", slug: "zeta" },
    ];
    setupMocks(10, 10, 10, trending);

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(body.trending).toEqual([
      "Alpha", "Beta", "Gamma", "Delta", "Epsilon", "Zeta",
    ]);
    expect(body.trending).toHaveLength(6);
  });

  it("sets Cache-Control header", async () => {
    setupMocks(10, 10, 10);

    const res = await GET(makeRequest());

    expect(res.headers.get("Cache-Control")).toBe(
      "public, s-maxage=300, stale-while-revalidate=600"
    );
  });

  // -----------------------------------------------------------------------
  // Edge cases
  // -----------------------------------------------------------------------

  it("returns 500 on database error", async () => {
    mockProductCount.mockRejectedValueOnce(new Error("DB down"));

    const res = await GET(makeRequest());
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.message).toBe("服务器内部错误");
  });

  it("formats count >=10000 correctly", async () => {
    setupMocks(15000, 10000, 50000);

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(body.stats.products).toBe("15,000+");
    expect(body.stats.users).toBe("10,000+");
    expect(body.stats.orders).toBe("50,000+");
  });

  it("queries only active products with soldCount > 0 for trending", async () => {
    setupMocks(10, 10, 10, []);

    await GET(makeRequest());

    const args = mockProductFindMany.mock.calls[0][0];
    expect(args.where).toEqual({ isActive: true, soldCount: { gt: 0 } });
    expect(args.orderBy).toEqual({ soldCount: "desc" });
    expect(args.take).toBe(6);
  });

  it("returns empty trending array when no products have sales", async () => {
    setupMocks(10, 10, 10, []);

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(body.trending).toEqual([]);
  });
});
