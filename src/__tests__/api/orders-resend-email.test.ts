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

const mockGetSessionFromRequest = vi.fn();

vi.mock("@/lib/auth", () => ({
  getSessionFromRequest: (...args: unknown[]) => mockGetSessionFromRequest(...args),
}));

const mockSendCardKeyDelivery = vi.fn();

vi.mock("@/server/services/email", () => ({
  sendCardKeyDelivery: (...args: unknown[]) => mockSendCardKeyDelivery(...args),
}));

vi.mock("@/lib/rate-limit", () => ({
  contactLimiter: () => ({ success: true, remaining: 5, reset: Date.now() + 60000 }),
  getClientIp: () => "127.0.0.1",
  rateLimitResponse: () => {
    const { NextResponse } = require("next/server");
    return NextResponse.json({ success: false }, { status: 429 });
  },
}));

vi.mock("@/lib/logger", () => ({
  createLogger: () => ({
    info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(),
  }),
}));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

const { POST } = await import("@/app/api/orders/[id]/resend-email/route");

function makeReq() {
  return new NextRequest("http://localhost/api/orders/order-1/resend-email", {
    method: "POST",
  });
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/orders/[id]/resend-email", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockGetSessionFromRequest.mockReturnValue(null);

    const res = await POST(makeReq(), makeParams("order-1"));
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.message).toContain("登录");
  });

  it("returns 404 when order not found", async () => {
    mockGetSessionFromRequest.mockReturnValue({ id: "user-1" });
    mockOrderFindUnique.mockResolvedValue(null);

    const res = await POST(makeReq(), makeParams("nonexistent"));
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.message).toContain("不存在");
  });

  it("returns 400 when order is not delivered", async () => {
    mockGetSessionFromRequest.mockReturnValue({ id: "user-1" });
    mockOrderFindUnique.mockResolvedValue({
      orderNo: "ORD-001",
      status: "PENDING",
      email: "test@example.com",
      items: [],
    });

    const res = await POST(makeReq(), makeParams("order-1"));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.message).toContain("已发货");
  });

  it("returns 400 when order has no email", async () => {
    mockGetSessionFromRequest.mockReturnValue({ id: "user-1" });
    mockOrderFindUnique.mockResolvedValue({
      orderNo: "ORD-001",
      status: "DELIVERED",
      email: null,
      items: [],
    });

    const res = await POST(makeReq(), makeParams("order-1"));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.message).toContain("邮箱");
  });

  it("returns 400 when no card keys to send", async () => {
    mockGetSessionFromRequest.mockReturnValue({ id: "user-1" });
    mockOrderFindUnique.mockResolvedValue({
      orderNo: "ORD-001",
      status: "DELIVERED",
      email: "test@example.com",
      items: [
        { product: { name: "Product 1" }, cardKeys: [] },
      ],
    });

    const res = await POST(makeReq(), makeParams("order-1"));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.message).toContain("卡密");
  });

  it("resends email successfully", async () => {
    mockGetSessionFromRequest.mockReturnValue({ id: "user-1" });
    mockOrderFindUnique.mockResolvedValue({
      orderNo: "ORD-001",
      status: "DELIVERED",
      email: "test@example.com",
      items: [
        {
          product: { name: "Product 1" },
          cardKeys: [{ content: "key-1" }, { content: "key-2" }],
        },
      ],
    });
    mockSendCardKeyDelivery.mockResolvedValue(true);

    const res = await POST(makeReq(), makeParams("order-1"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toContain("发送");
    expect(mockSendCardKeyDelivery).toHaveBeenCalledWith({
      to: "test@example.com",
      orderNo: "ORD-001",
      items: [
        {
          productName: "Product 1",
          cardKeys: ["key-1", "key-2"],
        },
      ],
    });
  });

  it("returns 500 when email send fails", async () => {
    mockGetSessionFromRequest.mockReturnValue({ id: "user-1" });
    mockOrderFindUnique.mockResolvedValue({
      orderNo: "ORD-001",
      status: "DELIVERED",
      email: "test@example.com",
      items: [
        {
          product: { name: "Product 1" },
          cardKeys: [{ content: "key-1" }],
        },
      ],
    });
    mockSendCardKeyDelivery.mockResolvedValue(false);

    const res = await POST(makeReq(), makeParams("order-1"));
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.success).toBe(false);
  });

  // -----------------------------------------------------------------------
  // Edge cases
  // -----------------------------------------------------------------------

  it("queries order with userId from session for ownership check", async () => {
    mockGetSessionFromRequest.mockReturnValue({ id: "user-99" });
    mockOrderFindUnique.mockResolvedValue(null);

    await POST(makeReq(), makeParams("order-1"));

    expect(mockOrderFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "order-1", userId: "user-99" },
      })
    );
  });

  it("returns 500 on unexpected DB error", async () => {
    mockGetSessionFromRequest.mockReturnValue({ id: "user-1" });
    mockOrderFindUnique.mockRejectedValue(new Error("DB down"));

    const res = await POST(makeReq(), makeParams("order-1"));
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.message).toContain("服务器");
  });

  it("filters out items with no card keys from email payload", async () => {
    mockGetSessionFromRequest.mockReturnValue({ id: "user-1" });
    mockOrderFindUnique.mockResolvedValue({
      orderNo: "ORD-002",
      status: "DELIVERED",
      email: "test@example.com",
      items: [
        { product: { name: "Product A" }, cardKeys: [{ content: "KEY-1" }] },
        { product: { name: "Product B" }, cardKeys: [] },
      ],
    });
    mockSendCardKeyDelivery.mockResolvedValue(true);

    const res = await POST(makeReq(), makeParams("order-1"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    // Only Product A should be in email items (Product B has no card keys)
    expect(mockSendCardKeyDelivery).toHaveBeenCalledWith(
      expect.objectContaining({
        items: [{ productName: "Product A", cardKeys: ["KEY-1"] }],
      })
    );
  });
});
