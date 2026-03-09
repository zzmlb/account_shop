import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockOrderFindUnique = vi.fn();

vi.mock("@/server/db", () => ({
  db: {
    order: {
      findUnique: (...args: unknown[]) => mockOrderFindUnique(...args),
    },
  },
}));

let mockSession: { id: string; role: string } | null = { id: "user-1", role: "USER" };

vi.mock("@/lib/auth", () => ({
  getSessionFromRequest: () => mockSession,
}));

const mockSendCardKeyDelivery = vi.fn();

vi.mock("@/server/services/email", () => ({
  sendCardKeyDelivery: (...args: unknown[]) => mockSendCardKeyDelivery(...args),
}));

vi.mock("@/lib/rate-limit", () => ({
  contactLimiter: () => ({ success: true, remaining: 10, reset: Date.now() + 60000 }),
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
// Import after mocks
// ---------------------------------------------------------------------------

const { POST } = await import("@/app/api/orders/[id]/resend-email/route");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeReq() {
  return new NextRequest("http://localhost/api/orders/order-1/resend-email", {
    method: "POST",
  });
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

const mockOrder = {
  orderNo: "PJ37-001",
  status: "DELIVERED",
  email: "buyer@example.com",
  items: [
    {
      product: { name: "Product A" },
      cardKeys: [{ content: "KEY-001" }, { content: "KEY-002" }],
    },
  ],
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/orders/[id]/resend-email", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession = { id: "user-1", role: "USER" };
  });

  it("resends email successfully", async () => {
    mockOrderFindUnique.mockResolvedValue({ ...mockOrder });
    mockSendCardKeyDelivery.mockResolvedValue(true);

    const res = await POST(makeReq(), makeParams("order-1"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toContain("发送");
    expect(mockSendCardKeyDelivery).toHaveBeenCalledWith({
      to: "buyer@example.com",
      orderNo: "PJ37-001",
      items: [
        {
          productName: "Product A",
          cardKeys: ["KEY-001", "KEY-002"],
        },
      ],
    });
  });

  it("returns 401 when not logged in", async () => {
    mockSession = null;

    const res = await POST(makeReq(), makeParams("order-1"));
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.message).toContain("登录");
  });

  it("returns 404 when order not found", async () => {
    mockOrderFindUnique.mockResolvedValue(null);

    const res = await POST(makeReq(), makeParams("order-1"));
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.success).toBe(false);
    expect(data.message).toContain("不存在");
  });

  it("returns 400 for non-DELIVERED order", async () => {
    mockOrderFindUnique.mockResolvedValue({
      ...mockOrder,
      status: "PENDING",
    });

    const res = await POST(makeReq(), makeParams("order-1"));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.message).toContain("已发货");
  });

  it("returns 400 when order has no email", async () => {
    mockOrderFindUnique.mockResolvedValue({
      ...mockOrder,
      email: null,
    });

    const res = await POST(makeReq(), makeParams("order-1"));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.message).toContain("邮箱");
  });

  it("returns 400 when no card keys to send", async () => {
    mockOrderFindUnique.mockResolvedValue({
      ...mockOrder,
      items: [
        { product: { name: "Product A" }, cardKeys: [] },
      ],
    });

    const res = await POST(makeReq(), makeParams("order-1"));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.message).toContain("卡密");
  });

  it("returns 500 when sendCardKeyDelivery returns false", async () => {
    mockOrderFindUnique.mockResolvedValue({ ...mockOrder });
    mockSendCardKeyDelivery.mockResolvedValue(false);

    const res = await POST(makeReq(), makeParams("order-1"));
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.message).toContain("失败");
  });

  it("returns 500 on error", async () => {
    mockOrderFindUnique.mockRejectedValue(new Error("Database connection lost"));

    const res = await POST(makeReq(), makeParams("order-1"));
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.message).toContain("服务器错误");
  });

  it("queries order with userId from session for ownership check", async () => {
    mockOrderFindUnique.mockResolvedValue(null);

    await POST(makeReq(), makeParams("order-99"));

    expect(mockOrderFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "order-99", userId: "user-1" },
      })
    );
  });

  it("handles multiple items with card keys", async () => {
    mockOrderFindUnique.mockResolvedValue({
      ...mockOrder,
      items: [
        { product: { name: "Product A" }, cardKeys: [{ content: "KEY-A1" }] },
        { product: { name: "Product B" }, cardKeys: [{ content: "KEY-B1" }, { content: "KEY-B2" }] },
      ],
    });
    mockSendCardKeyDelivery.mockResolvedValue(true);

    const res = await POST(makeReq(), makeParams("order-1"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockSendCardKeyDelivery).toHaveBeenCalledWith(
      expect.objectContaining({
        items: [
          { productName: "Product A", cardKeys: ["KEY-A1"] },
          { productName: "Product B", cardKeys: ["KEY-B1", "KEY-B2"] },
        ],
      })
    );
  });
});
