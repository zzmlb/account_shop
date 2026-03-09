import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Mocks – must be declared before importing the route module
// ---------------------------------------------------------------------------

const mockOrderFindMany = vi.fn();

vi.mock("@/server/db", () => ({
  db: {
    order: {
      findMany: (...args: unknown[]) => mockOrderFindMany(...args),
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

import { GET } from "@/app/api/activity/route";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(): NextRequest {
  return new NextRequest("http://localhost:3000/api/activity", {
    method: "GET",
  });
}

const mockOrder = (overrides: Record<string, unknown> = {}) => ({
  id: "o1",
  user: { username: "张三丰" },
  items: [{ product: { name: "Product", slug: "product" } }],
  createdAt: new Date("2026-01-15T10:00:00Z"),
  status: "PAID",
  ...overrides,
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("GET /api/activity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns activity feed with anonymized usernames", async () => {
    mockOrderFindMany.mockResolvedValueOnce([mockOrder()]);

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.activity).toHaveLength(1);
    // "张三丰" (3 chars) → first char "张" + "***" + "" (length <= 3 so no last char)
    expect(body.activity[0].user).toBe("张***");
    expect(body.activity[0].product).toBe("Product");
    expect(body.activity[0].slug).toBe("product");
    expect(body.activity[0].id).toBe("o1");
    expect(body.activity[0].time).toBeDefined();
  });

  it("anonymizes short usernames to '***'", async () => {
    mockOrderFindMany.mockResolvedValueOnce([
      mockOrder({ user: { username: "A" } }),
    ]);

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(body.activity[0].user).toBe("***");
  });

  it('shows "游客" (masked) for orders without user', async () => {
    mockOrderFindMany.mockResolvedValueOnce([
      mockOrder({ user: null }),
    ]);

    const res = await GET(makeRequest());
    const body = await res.json();

    // "游客" is 2 chars → first char "游" + "***" + "" (length <= 3 so no last char)
    expect(body.activity[0].user).toBe("游***");
  });

  it("filters out orders with no items", async () => {
    mockOrderFindMany.mockResolvedValueOnce([
      mockOrder(),
      mockOrder({ id: "o2", items: [] }),
    ]);

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(body.activity).toHaveLength(1);
    expect(body.activity[0].id).toBe("o1");
  });

  it("sets Cache-Control header", async () => {
    mockOrderFindMany.mockResolvedValueOnce([mockOrder()]);

    const res = await GET(makeRequest());

    expect(res.headers.get("Cache-Control")).toBe(
      "public, s-maxage=30, stale-while-revalidate=120"
    );
  });

  it("returns empty array on error (status 500)", async () => {
    mockOrderFindMany.mockRejectedValueOnce(new Error("DB failure"));

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.activity).toEqual([]);
  });

  // -----------------------------------------------------------------------
  // Edge cases
  // -----------------------------------------------------------------------

  it("anonymizes long usernames with first+last char", async () => {
    mockOrderFindMany.mockResolvedValueOnce([
      mockOrder({ user: { username: "LongName" } }),
    ]);

    const res = await GET(makeRequest());
    const body = await res.json();

    // "LongName" (8 chars > 3) → "L***e"
    expect(body.activity[0].user).toBe("L***e");
  });

  it("queries only PAID and DELIVERED orders ordered by newest", async () => {
    mockOrderFindMany.mockResolvedValueOnce([]);

    await GET(makeRequest());

    const args = mockOrderFindMany.mock.calls[0][0];
    expect(args.where.status).toEqual({ in: ["PAID", "DELIVERED"] });
    expect(args.orderBy).toEqual({ createdAt: "desc" });
    expect(args.take).toBe(10);
  });

  it("serializes time as ISO string", async () => {
    const date = new Date("2026-03-08T15:30:00Z");
    mockOrderFindMany.mockResolvedValueOnce([
      mockOrder({ createdAt: date }),
    ]);

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(body.activity[0].time).toBe("2026-03-08T15:30:00.000Z");
  });
});
