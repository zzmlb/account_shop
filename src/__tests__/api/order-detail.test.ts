import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Mocks — declared BEFORE importing the route handler
// ---------------------------------------------------------------------------

const mockOrderFindFirst = vi.fn();
const mockOrderUpdate = vi.fn();

vi.mock("@/server/db", () => ({
  db: {
    order: {
      findFirst: (...args: unknown[]) => mockOrderFindFirst(...args),
      update: (...args: unknown[]) => mockOrderUpdate(...args),
    },
  },
}));

let mockSession: { id: string; role: string } | null = null;
vi.mock("@/lib/auth", () => ({
  decodeSession: () => mockSession,
}));

vi.mock("@/lib/crypto", () => ({
  safeDecryptCardKey: (k: string) => "decrypted-" + k,
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

const { GET, PATCH } = await import("@/app/api/orders/[id]/route");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const now = new Date();

const mockOrder = {
  id: "o-id",
  orderNo: "ORD001",
  userId: "user-1",
  status: "DELIVERED",
  email: "buyer@test.com",
  totalAmount: 99.99,
  payAmount: 89.99,
  paymentMethod: "balance",
  createdAt: now,
  expireAt: now,
  paidAt: now,
  items: [
    {
      product: { name: "Product 1", slug: "product-1", price: 99.99 },
      quantity: 1,
      cardKeys: [{ content: "encrypted-key-1" }],
    },
  ],
};

function createGetRequest(orderNo: string, params?: Record<string, string>) {
  const url = new URL(`http://localhost:3001/api/orders/${orderNo}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
  }
  return new NextRequest(url);
}

function createPatchRequest(orderNo: string, body: unknown) {
  return new NextRequest(`http://localhost:3001/api/orders/${orderNo}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// Tests — GET /api/orders/[id]
// ---------------------------------------------------------------------------

describe("GET /api/orders/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession = { id: "user-1", role: "USER" };
    mockOrderFindFirst.mockResolvedValue({ ...mockOrder });
  });

  // 1. Returns order details (without card keys for non-delivered)
  it("returns order details without card keys for non-delivered order", async () => {
    mockOrderFindFirst.mockResolvedValue({ ...mockOrder, status: "CANCELLED" });

    const req = createGetRequest("ORD001");
    const res = await GET(req, { params: Promise.resolve({ id: "ORD001" }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.order.orderNo).toBe("ORD001");
    expect(data.order.cardKeys).toEqual([]);
  });

  // 2. Returns order with card keys for DELIVERED order when user is owner
  it("returns order with card keys for DELIVERED order when user is owner", async () => {
    const req = createGetRequest("ORD001");
    const res = await GET(req, { params: Promise.resolve({ id: "ORD001" }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.order.cardKeys).toEqual(["decrypted-encrypted-key-1"]);
  });

  // 3. Returns 404 when order not found
  it("returns 404 when order not found", async () => {
    mockOrderFindFirst.mockResolvedValue(null);

    const req = createGetRequest("NONEXISTENT");
    const res = await GET(req, { params: Promise.resolve({ id: "NONEXISTENT" }) });
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.success).toBe(false);
    expect(data.message).toBe("订单不存在");
  });

  // 4. Returns 403 when logged-in user doesn't own the order
  it("returns 403 when logged-in user doesn't own the order", async () => {
    mockSession = { id: "other-user", role: "USER" };

    const req = createGetRequest("ORD001");
    const res = await GET(req, { params: Promise.resolve({ id: "ORD001" }) });
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.success).toBe(false);
    expect(data.message).toBe("无权查看此订单");
  });

  // 5. Shows card keys when guest provides matching email
  it("shows card keys when guest provides matching email", async () => {
    mockSession = null;
    mockOrderFindFirst.mockResolvedValue({ ...mockOrder, userId: null });

    const req = createGetRequest("ORD001", { email: "BUYER@TEST.COM" });
    const res = await GET(req, { params: Promise.resolve({ id: "ORD001" }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.order.cardKeys).toEqual(["decrypted-encrypted-key-1"]);
  });

  // 6. Hides card keys when guest provides wrong email
  it("hides card keys when guest provides wrong email", async () => {
    mockSession = null;
    mockOrderFindFirst.mockResolvedValue({ ...mockOrder, userId: null });

    const req = createGetRequest("ORD001", { email: "wrong@test.com" });
    const res = await GET(req, { params: Promise.resolve({ id: "ORD001" }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.order.cardKeys).toEqual([]);
  });

  // 7. Hides card keys when order is PENDING (even if owner)
  it("hides card keys when order is PENDING even if owner", async () => {
    mockOrderFindFirst.mockResolvedValue({ ...mockOrder, status: "PENDING" });

    const req = createGetRequest("ORD001");
    const res = await GET(req, { params: Promise.resolve({ id: "ORD001" }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.order.cardKeys).toEqual([]);
  });

  // 8. Returns card keys for PAID orders (when owner)
  it("returns card keys for PAID orders when owner", async () => {
    mockOrderFindFirst.mockResolvedValue({ ...mockOrder, status: "PAID" });

    const req = createGetRequest("ORD001");
    const res = await GET(req, { params: Promise.resolve({ id: "ORD001" }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.order.cardKeys).toEqual(["decrypted-encrypted-key-1"]);
  });
});

// ---------------------------------------------------------------------------
// Tests — PATCH /api/orders/[id]
// ---------------------------------------------------------------------------

describe("PATCH /api/orders/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession = { id: "user-1", role: "USER" };
    mockOrderFindFirst.mockResolvedValue({ ...mockOrder, status: "PENDING" });
    mockOrderUpdate.mockResolvedValue({});
  });

  // 9. Cancels PENDING order by owner
  it("cancels PENDING order by owner", async () => {
    const req = createPatchRequest("ORD001", { action: "cancel" });
    const res = await PATCH(req, { params: Promise.resolve({ id: "ORD001" }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe("订单已取消");
    expect(mockOrderUpdate).toHaveBeenCalledWith({
      where: { id: "o-id" },
      data: { status: "CANCELLED" },
    });
  });

  // 10. Returns 400 for unsupported action
  it("returns 400 for unsupported action", async () => {
    const req = createPatchRequest("ORD001", { action: "refund" });
    const res = await PATCH(req, { params: Promise.resolve({ id: "ORD001" }) });
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.message).toBe("不支持的操作");
  });

  // 11. Returns 404 when order not found
  it("returns 404 when order not found", async () => {
    mockOrderFindFirst.mockResolvedValue(null);

    const req = createPatchRequest("NONEXISTENT", { action: "cancel" });
    const res = await PATCH(req, { params: Promise.resolve({ id: "NONEXISTENT" }) });
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.success).toBe(false);
    expect(data.message).toBe("订单不存在");
  });

  // 12. Returns 403 when non-owner tries to cancel
  it("returns 403 when non-owner tries to cancel", async () => {
    mockSession = { id: "other-user", role: "USER" };

    const req = createPatchRequest("ORD001", { action: "cancel" });
    const res = await PATCH(req, { params: Promise.resolve({ id: "ORD001" }) });
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.success).toBe(false);
    expect(data.message).toBe("无权操作此订单");
  });

  // 13. Returns 403 when non-admin tries to cancel guest order
  it("returns 403 when non-admin tries to cancel guest order", async () => {
    mockSession = { id: "user-1", role: "USER" };
    mockOrderFindFirst.mockResolvedValue({ ...mockOrder, status: "PENDING", userId: null });

    const req = createPatchRequest("ORD001", { action: "cancel" });
    const res = await PATCH(req, { params: Promise.resolve({ id: "ORD001" }) });
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.success).toBe(false);
    expect(data.message).toBe("游客订单仅管理员可取消");
  });

  // 14. Returns 400 when order is not PENDING
  it("returns 400 when order is not PENDING", async () => {
    mockOrderFindFirst.mockResolvedValue({ ...mockOrder, status: "DELIVERED" });

    const req = createPatchRequest("ORD001", { action: "cancel" });
    const res = await PATCH(req, { params: Promise.resolve({ id: "ORD001" }) });
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.message).toBe("只能取消待支付的订单");
  });
});
