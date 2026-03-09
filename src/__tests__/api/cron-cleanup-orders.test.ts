import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Set CRON_SECRET BEFORE module loads — vi.hoisted runs before vi.mock
// ---------------------------------------------------------------------------
vi.hoisted(() => {
  process.env.CRON_SECRET = "test-secret";
});

// ---------------------------------------------------------------------------
// Mocks — declared BEFORE importing the route handler
// ---------------------------------------------------------------------------

const { mockFindMany, mockTransaction, mockTxOrderUpdate, mockTxCardKeyUpdateMany, mockTxProductUpdate } = vi.hoisted(() => {
  const mockTxOrderUpdate = vi.fn();
  const mockTxCardKeyUpdateMany = vi.fn().mockResolvedValue({ count: 2 });
  const mockTxProductUpdate = vi.fn();
  const mockFindMany = vi.fn();
  const mockTransaction = vi.fn().mockImplementation(async (fn: Function) => {
    return fn({
      order: { update: mockTxOrderUpdate },
      cardKey: { updateMany: mockTxCardKeyUpdateMany },
      product: { update: mockTxProductUpdate },
    });
  });
  return { mockFindMany, mockTransaction, mockTxOrderUpdate, mockTxCardKeyUpdateMany, mockTxProductUpdate };
});

vi.mock("@/server/db", () => ({
  db: {
    order: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
    },
    $transaction: (...args: unknown[]) => mockTransaction(...args),
  },
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: () => () => ({ success: true, remaining: 1, reset: Date.now() + 60000 }),
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
// Import route AFTER mocks and env setup
// ---------------------------------------------------------------------------
import { POST } from "@/app/api/cron/cleanup-orders/route";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeReq(secret?: string) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (secret) headers["authorization"] = `Bearer ${secret}`;
  return new NextRequest("http://localhost/api/cron/cleanup-orders", {
    method: "POST",
    headers,
  });
}

const expiredOrder = {
  id: "o1",
  orderNo: "ORD001",
  status: "PENDING",
  expireAt: new Date(Date.now() - 60000),
  items: [
    {
      productId: "p1",
      quantity: 2,
      cardKeys: [{ id: "ck1" }, { id: "ck2" }],
    },
  ],
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/cron/cleanup-orders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTxCardKeyUpdateMany.mockResolvedValue({ count: 2 });
  });

  it("returns 401 without authorization header", async () => {
    const res = await POST(makeReq());
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe("Unauthorized");
  });

  it("returns 401 with wrong secret", async () => {
    const res = await POST(makeReq("wrong-secret"));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe("Unauthorized");
  });

  it("returns success with 0 cleaned when no expired orders", async () => {
    mockFindMany.mockResolvedValue([]);

    const res = await POST(makeReq("test-secret"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.cleaned).toBe(0);
    expect(body.message).toBe("No expired orders found");
  });

  it("cleans expired orders and releases card keys", async () => {
    mockFindMany.mockResolvedValue([expiredOrder]);

    const res = await POST(makeReq("test-secret"));
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.success).toBe(true);
    expect(body.cleaned).toBe(1);
    expect(body.keysReleased).toBe(2);

    // Verify transaction was called
    expect(mockTransaction).toHaveBeenCalledTimes(1);

    // Verify order was marked EXPIRED
    expect(mockTxOrderUpdate).toHaveBeenCalledWith({
      where: { id: "o1" },
      data: { status: "EXPIRED" },
    });

    // Verify card keys were released
    expect(mockTxCardKeyUpdateMany).toHaveBeenCalledWith({
      where: { id: { in: ["ck1", "ck2"] }, status: "LOCKED" },
      data: { status: "AVAILABLE", orderId: null, soldAt: null },
    });
  });

  it("increments product stock for cleaned orders", async () => {
    mockFindMany.mockResolvedValue([expiredOrder]);

    await POST(makeReq("test-secret"));

    // Verify product stock was incremented
    expect(mockTxProductUpdate).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { stockCount: { increment: 2 } },
    });
  });

  it("returns 500 on error", async () => {
    mockFindMany.mockRejectedValue(new Error("DB connection lost"));

    const res = await POST(makeReq("test-secret"));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe("Internal server error");
  });

  // -----------------------------------------------------------------------
  // Edge cases
  // -----------------------------------------------------------------------

  it("queries only PENDING orders past expiry", async () => {
    mockFindMany.mockResolvedValue([]);

    await POST(makeReq("test-secret"));

    const args = mockFindMany.mock.calls[0][0];
    expect(args.where.status).toBe("PENDING");
    expect(args.where.expireAt).toHaveProperty("lt");
    expect(args.where.expireAt.lt).toBeInstanceOf(Date);
  });

  it("handles order with no card keys (empty array)", async () => {
    mockFindMany.mockResolvedValue([{
      ...expiredOrder,
      items: [{ productId: "p1", quantity: 1, cardKeys: [] }],
    }]);

    const res = await POST(makeReq("test-secret"));
    const body = await res.json();

    expect(body.success).toBe(true);
    expect(body.cleaned).toBe(1);
    expect(body.keysReleased).toBe(0);
    // cardKey.updateMany should NOT be called when no keys
    expect(mockTxCardKeyUpdateMany).not.toHaveBeenCalled();
  });

  it("handles multiple expired orders", async () => {
    mockFindMany.mockResolvedValue([
      expiredOrder,
      {
        id: "o2",
        orderNo: "ORD002",
        status: "PENDING",
        expireAt: new Date(Date.now() - 120000),
        items: [{ productId: "p2", quantity: 1, cardKeys: [{ id: "ck3" }] }],
      },
    ]);
    mockTxCardKeyUpdateMany.mockResolvedValue({ count: 1 });

    const res = await POST(makeReq("test-secret"));
    const body = await res.json();

    expect(body.success).toBe(true);
    expect(body.cleaned).toBe(2);
    expect(mockTransaction).toHaveBeenCalledTimes(2);
  });

  it("returns message with order count in response", async () => {
    mockFindMany.mockResolvedValue([expiredOrder]);

    const res = await POST(makeReq("test-secret"));
    const body = await res.json();

    expect(body.message).toBe("Cleaned 1 expired orders");
  });
});
