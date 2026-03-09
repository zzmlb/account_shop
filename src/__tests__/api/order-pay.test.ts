import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Mocks — declared BEFORE importing the route handler
// ---------------------------------------------------------------------------

const mockOrderFindUnique = vi.fn();
const mockOrderUpdate = vi.fn();
const mockUserFindUnique = vi.fn();
const mockCardKeyFindMany = vi.fn();

// Transaction-scoped mocks
const mockTxOrderFindUnique = vi.fn();
const mockTxUserFindUnique = vi.fn();
const mockTxUserUpdate = vi.fn();
const mockTxBalanceLogCreate = vi.fn();
const mockTxProductFindUnique = vi.fn();
const mockTxCardKeyFindMany = vi.fn();
const mockTxCardKeyUpdateMany = vi.fn();
const mockTxProductUpdate = vi.fn();
const mockTxOrderUpdate = vi.fn();
const mockTxCouponFindUnique = vi.fn();
const mockTxCouponUpdate = vi.fn();
const mockTxUserCouponCreate = vi.fn();

const mock$transaction = vi.fn().mockImplementation(async (fn) =>
  fn({
    order: { findUnique: mockTxOrderFindUnique, update: mockTxOrderUpdate },
    user: { findUnique: mockTxUserFindUnique, update: mockTxUserUpdate },
    balanceLog: { create: mockTxBalanceLogCreate },
    product: { findUnique: mockTxProductFindUnique, update: mockTxProductUpdate },
    cardKey: { findMany: mockTxCardKeyFindMany, updateMany: mockTxCardKeyUpdateMany },
    coupon: { findUnique: mockTxCouponFindUnique, update: mockTxCouponUpdate },
    userCoupon: { create: mockTxUserCouponCreate },
  })
);

vi.mock("@/server/db", () => ({
  db: {
    order: {
      findUnique: (...args: unknown[]) => mockOrderFindUnique(...args),
      update: (...args: unknown[]) => mockOrderUpdate(...args),
    },
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
    },
    cardKey: {
      findMany: (...args: unknown[]) => mockCardKeyFindMany(...args),
    },
    $transaction: (...args: unknown[]) => mock$transaction(...args),
  },
}));

vi.mock("@/lib/rate-limit", () => ({
  paymentLimiter: () => ({ success: true, remaining: 10, reset: Date.now() + 60000 }),
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

let mockSession: { id: string } | null = { id: "user-1" };
vi.mock("@/lib/auth", () => ({
  decodeSession: () => mockSession,
}));

const mockSendOrderConfirmation = vi.fn().mockResolvedValue(undefined);
const mockSendCardKeyDelivery = vi.fn().mockResolvedValue(undefined);
vi.mock("@/server/services/email", () => ({
  sendOrderConfirmation: (...args: unknown[]) => mockSendOrderConfirmation(...args),
  sendCardKeyDelivery: (...args: unknown[]) => mockSendCardKeyDelivery(...args),
}));

const mockCreateNotification = vi.fn().mockResolvedValue(undefined);
const mockNotifyAdminsStockShortage = vi.fn().mockResolvedValue(undefined);
vi.mock("@/server/services/notification", () => ({
  createNotification: (...args: unknown[]) => mockCreateNotification(...args),
  notifyAdminsStockShortage: (...args: unknown[]) => mockNotifyAdminsStockShortage(...args),
}));

vi.mock("@/lib/crypto", () => ({
  safeDecryptCardKey: (k: string) => (typeof k === "string" && k.startsWith("enc_") ? k.slice(4) : k),
}));

// ---------------------------------------------------------------------------
// Import the route handler AFTER all mocks are in place
// ---------------------------------------------------------------------------

const { POST } = await import("@/app/api/orders/[id]/pay/route");

// ---------------------------------------------------------------------------
// Helpers & Mock Data
// ---------------------------------------------------------------------------

const now = new Date("2026-03-08T10:00:00Z");
const futureDate = new Date("2026-03-09T10:00:00Z");

const mockOrder = {
  id: "order-1",
  orderNo: "PJ37-001",
  status: "PENDING",
  userId: "user-1",
  email: "buyer@example.com",
  payAmount: 99.99,
  totalAmount: 99.99,
  expireAt: futureDate,
  couponId: null,
  items: [
    {
      id: "item-1",
      productId: "prod-1",
      quantity: 1,
      unitPrice: 99.99,
      product: { id: "prod-1", name: "Product A", stockCount: 10, price: 99.99 },
    },
  ],
};

function makeReq(body: Record<string, unknown>) {
  return new NextRequest("http://localhost:3001/api/orders/order-1/pay", {
    method: "POST",
    headers: { cookie: "session=valid-token", "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function setupSuccessfulPaymentMocks() {
  // Pre-checks
  mockOrderFindUnique.mockResolvedValue({ ...mockOrder });
  mockUserFindUnique.mockResolvedValue({ id: "user-1", balance: 200 });

  // Transaction mocks
  mockTxOrderFindUnique.mockResolvedValue({ status: "PENDING" });
  mockTxUserFindUnique.mockResolvedValue({ balance: 200 });
  mockTxUserUpdate.mockResolvedValue({});
  mockTxBalanceLogCreate.mockResolvedValue({});
  mockTxProductFindUnique.mockResolvedValue({ stockCount: 10, name: "Product A" });
  mockTxCardKeyFindMany.mockResolvedValue([{ id: "ck-1", content: "enc_KEY-001" }]);
  mockTxCardKeyUpdateMany.mockResolvedValue({ count: 1 });
  mockTxProductUpdate.mockResolvedValue({});
  mockTxOrderUpdate.mockResolvedValue({
    id: "order-1",
    orderNo: "PJ37-001",
    status: "DELIVERED",
  });

  // Post-transaction email batch fetch
  mockCardKeyFindMany.mockResolvedValue([
    { content: "enc_KEY-001", orderId: "item-1" },
  ]);
}

// ---------------------------------------------------------------------------
// Tests — POST /api/orders/[id]/pay
// ---------------------------------------------------------------------------

describe("POST /api/orders/[id]/pay", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession = { id: "user-1" };
    // Reset vi.useFakeTimers if used
    vi.useRealTimers();
  });

  // -----------------------------------------------------------------------
  // 1. Successful payment with card key delivery (balance method)
  // -----------------------------------------------------------------------

  it("successfully pays with balance and delivers card keys", async () => {
    vi.useFakeTimers({ now: now.getTime() });
    setupSuccessfulPaymentMocks();

    const req = makeReq({ paymentMethod: "balance" });
    const res = await POST(req, { params: Promise.resolve({ id: "order-1" }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe("支付成功，卡密已发放");
    expect(data.order.status).toBe("DELIVERED");
    expect(data.order.orderNo).toBe("PJ37-001");
    expect(data.cardKeys).toEqual(["KEY-001"]);

    // Verify transaction was called
    expect(mock$transaction).toHaveBeenCalledTimes(1);

    // Verify balance deduction happened inside transaction
    expect(mockTxUserUpdate).toHaveBeenCalled();
    expect(mockTxBalanceLogCreate).toHaveBeenCalled();

    // Verify stock was updated
    expect(mockTxProductUpdate).toHaveBeenCalled();

    // Verify emails were sent (fire-and-forget)
    expect(mockSendOrderConfirmation).toHaveBeenCalled();
    expect(mockSendCardKeyDelivery).toHaveBeenCalled();

    // Verify in-app notification was created
    expect(mockCreateNotification).toHaveBeenCalled();

    vi.useRealTimers();
  });

  // -----------------------------------------------------------------------
  // 2. Returns 404 for non-existent order
  // -----------------------------------------------------------------------

  it("returns 404 for non-existent order", async () => {
    mockOrderFindUnique.mockResolvedValue(null);

    const req = makeReq({ paymentMethod: "balance" });
    const res = await POST(req, { params: Promise.resolve({ id: "order-1" }) });
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.success).toBe(false);
    expect(data.message).toBe("订单不存在");
  });

  // -----------------------------------------------------------------------
  // 3. Returns 400 for non-PENDING order
  // -----------------------------------------------------------------------

  it("returns 400 for non-PENDING order", async () => {
    mockOrderFindUnique.mockResolvedValue({ ...mockOrder, status: "DELIVERED" });

    const req = makeReq({ paymentMethod: "balance" });
    const res = await POST(req, { params: Promise.resolve({ id: "order-1" }) });
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.message).toBe("订单状态异常，无法支付");
  });

  // -----------------------------------------------------------------------
  // 4. Returns 400 for expired order (updates to EXPIRED)
  // -----------------------------------------------------------------------

  it("returns 400 for expired order and updates status to EXPIRED", async () => {
    const pastDate = new Date("2026-03-07T10:00:00Z");
    mockOrderFindUnique.mockResolvedValue({ ...mockOrder, expireAt: pastDate });
    mockOrderUpdate.mockResolvedValue({});

    const req = makeReq({ paymentMethod: "balance" });
    const res = await POST(req, { params: Promise.resolve({ id: "order-1" }) });
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.message).toBe("订单已过期");

    // Verify order was updated to EXPIRED
    expect(mockOrderUpdate).toHaveBeenCalledWith({
      where: { id: "order-1" },
      data: { status: "EXPIRED" },
    });
  });

  // -----------------------------------------------------------------------
  // 5. Returns 400 for invalid payment method
  // -----------------------------------------------------------------------

  it("returns 400 for invalid payment method", async () => {
    const req = makeReq({ paymentMethod: "bitcoin" });
    const res = await POST(req, { params: Promise.resolve({ id: "order-1" }) });
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.message).toBe("不支持的支付方式");
  });

  // -----------------------------------------------------------------------
  // 6. Returns 400 for insufficient balance (pre-check)
  // -----------------------------------------------------------------------

  it("returns 400 for insufficient balance (pre-check)", async () => {
    vi.useFakeTimers({ now: now.getTime() });
    mockOrderFindUnique.mockResolvedValue({ ...mockOrder });
    mockUserFindUnique.mockResolvedValue({ id: "user-1", balance: 10 });

    const req = makeReq({ paymentMethod: "balance" });
    const res = await POST(req, { params: Promise.resolve({ id: "order-1" }) });
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.message).toBe("余额不足");

    // Verify transaction was NOT started
    expect(mock$transaction).not.toHaveBeenCalled();

    vi.useRealTimers();
  });

  // -----------------------------------------------------------------------
  // 7. Returns 400 for ORDER_ALREADY_PROCESSED (transaction race condition)
  // -----------------------------------------------------------------------

  it("returns 400 for ORDER_ALREADY_PROCESSED in transaction", async () => {
    vi.useFakeTimers({ now: now.getTime() });
    mockOrderFindUnique.mockResolvedValue({ ...mockOrder });
    mockUserFindUnique.mockResolvedValue({ id: "user-1", balance: 200 });

    // Transaction throws because order was already processed by another request
    mock$transaction.mockRejectedValue(new Error("ORDER_ALREADY_PROCESSED"));

    const req = makeReq({ paymentMethod: "balance" });
    const res = await POST(req, { params: Promise.resolve({ id: "order-1" }) });
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.message).toBe("订单已处理，请勿重复支付");

    vi.useRealTimers();
  });

  // -----------------------------------------------------------------------
  // 8. Returns 400 for INSUFFICIENT_BALANCE inside transaction
  // -----------------------------------------------------------------------

  it("returns 400 for INSUFFICIENT_BALANCE inside transaction with balance info", async () => {
    vi.useFakeTimers({ now: now.getTime() });

    // First call: pre-check returns full order (PENDING, not expired)
    mockOrderFindUnique
      .mockResolvedValueOnce({ ...mockOrder })
      // Second call: error handler fetches payAmount
      .mockResolvedValueOnce({ payAmount: 99.99 });

    // First call: pre-check balance passes
    mockUserFindUnique
      .mockResolvedValueOnce({ id: "user-1", balance: 200 })
      // Second call: error handler fetches current balance
      .mockResolvedValueOnce({ balance: 50 });

    // Transaction throws because balance check inside tx fails (race condition)
    mock$transaction.mockRejectedValue(new Error("INSUFFICIENT_BALANCE"));

    const req = makeReq({ paymentMethod: "balance" });
    const res = await POST(req, { params: Promise.resolve({ id: "order-1" }) });
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.code).toBe("INSUFFICIENT_BALANCE");
    // The message should contain the needed amount
    expect(data.message).toContain("余额不足");
    expect(data.currentBalance).toBe(50);
    expect(data.needed).toBeCloseTo(49.99, 1);

    vi.useRealTimers();
  });

  // -----------------------------------------------------------------------
  // 9. Returns 400 for STOCK_INSUFFICIENT (includes product name)
  // -----------------------------------------------------------------------

  it("returns 400 for STOCK_INSUFFICIENT with product name", async () => {
    vi.useFakeTimers({ now: now.getTime() });
    mockOrderFindUnique.mockResolvedValue({ ...mockOrder });
    mockUserFindUnique.mockResolvedValue({ id: "user-1", balance: 200 });

    mock$transaction.mockRejectedValue(new Error("STOCK_INSUFFICIENT:Product A"));

    const req = makeReq({ paymentMethod: "balance" });
    const res = await POST(req, { params: Promise.resolve({ id: "order-1" }) });
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.code).toBe("STOCK_INSUFFICIENT");
    expect(data.message).toContain("Product A");
    expect(data.message).toContain("库存不足");

    vi.useRealTimers();
  });

  // -----------------------------------------------------------------------
  // 10. Payment without full card key allocation (PAID status, notifies admins)
  // -----------------------------------------------------------------------

  it("returns PAID status when card keys cannot be fully allocated", async () => {
    vi.useFakeTimers({ now: now.getTime() });
    mockOrderFindUnique.mockResolvedValue({ ...mockOrder });
    mockUserFindUnique.mockResolvedValue({ id: "user-1", balance: 200 });

    // Transaction mocks — card key allocation returns empty (insufficient keys)
    mockTxOrderFindUnique.mockResolvedValue({ status: "PENDING" });
    mockTxUserFindUnique.mockResolvedValue({ balance: 200 });
    mockTxUserUpdate.mockResolvedValue({});
    mockTxBalanceLogCreate.mockResolvedValue({});
    mockTxProductFindUnique.mockResolvedValue({ stockCount: 10, name: "Product A" });
    mockTxCardKeyFindMany.mockResolvedValue([]); // No keys available
    mockTxOrderUpdate.mockResolvedValue({
      id: "order-1",
      orderNo: "PJ37-001",
      status: "PAID",
    });

    // Reset mock$transaction to use real callback again
    mock$transaction.mockImplementation(async (fn) =>
      fn({
        order: { findUnique: mockTxOrderFindUnique, update: mockTxOrderUpdate },
        user: { findUnique: mockTxUserFindUnique, update: mockTxUserUpdate },
        balanceLog: { create: mockTxBalanceLogCreate },
        product: { findUnique: mockTxProductFindUnique, update: mockTxProductUpdate },
        cardKey: { findMany: mockTxCardKeyFindMany, updateMany: mockTxCardKeyUpdateMany },
        coupon: { findUnique: mockTxCouponFindUnique, update: mockTxCouponUpdate },
        userCoupon: { create: mockTxUserCouponCreate },
      })
    );

    const req = makeReq({ paymentMethod: "balance" });
    const res = await POST(req, { params: Promise.resolve({ id: "order-1" }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe("支付成功，卡密库存不足，待管理员处理");
    expect(data.order.status).toBe("PAID");
    expect(data.cardKeys).toBeUndefined();

    // Verify admins were notified about stock shortage
    expect(mockNotifyAdminsStockShortage).toHaveBeenCalledWith(
      "PJ37-001",
      ["Product A"]
    );

    // Verify card key delivery email was NOT sent
    expect(mockSendCardKeyDelivery).not.toHaveBeenCalled();

    vi.useRealTimers();
  });

  // -----------------------------------------------------------------------
  // 11. Returns 400 for invalid request body (non-JSON)
  // -----------------------------------------------------------------------

  it("returns 400 for invalid request body (non-JSON)", async () => {
    const req = new NextRequest("http://localhost:3001/api/orders/order-1/pay", {
      method: "POST",
      headers: { cookie: "session=valid-token", "content-type": "application/json" },
      body: "not-valid-json",
    });
    const res = await POST(req, { params: Promise.resolve({ id: "order-1" }) });
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.message).toBe("请求格式无效");
  });

  // -----------------------------------------------------------------------
  // 12. Returns 500 on unexpected error
  // -----------------------------------------------------------------------

  it("returns 500 on unexpected error", async () => {
    vi.useFakeTimers({ now: now.getTime() });
    mockOrderFindUnique.mockResolvedValue({ ...mockOrder });
    mockUserFindUnique.mockResolvedValue({ id: "user-1", balance: 200 });

    // Transaction throws an unexpected error
    mock$transaction.mockRejectedValue(new Error("UNEXPECTED_DB_CRASH"));

    const req = makeReq({ paymentMethod: "balance" });
    const res = await POST(req, { params: Promise.resolve({ id: "order-1" }) });
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.message).toBe("支付处理失败");

    vi.useRealTimers();
  });

  // -----------------------------------------------------------------------
  // 13. Handles payment with coupon (increments usage, creates userCoupon)
  // -----------------------------------------------------------------------

  it("handles payment with coupon (increments usage, creates userCoupon)", async () => {
    vi.useFakeTimers({ now: now.getTime() });

    const orderWithCoupon = {
      ...mockOrder,
      couponId: "coupon-1",
    };
    mockOrderFindUnique.mockResolvedValue(orderWithCoupon);
    mockUserFindUnique.mockResolvedValue({ id: "user-1", balance: 200 });

    // Transaction mocks
    mockTxOrderFindUnique.mockResolvedValue({ status: "PENDING" });
    mockTxUserFindUnique.mockResolvedValue({ balance: 200 });
    mockTxUserUpdate.mockResolvedValue({});
    mockTxBalanceLogCreate.mockResolvedValue({});
    mockTxProductFindUnique.mockResolvedValue({ stockCount: 10, name: "Product A" });
    mockTxCardKeyFindMany.mockResolvedValue([{ id: "ck-1", content: "enc_KEY-001" }]);
    mockTxCardKeyUpdateMany.mockResolvedValue({ count: 1 });
    mockTxProductUpdate.mockResolvedValue({});
    mockTxOrderUpdate.mockResolvedValue({
      id: "order-1",
      orderNo: "PJ37-001",
      status: "DELIVERED",
    });
    mockTxCouponFindUnique.mockResolvedValue({
      id: "coupon-1",
      isActive: true,
      expireAt: futureDate,
      maxUses: 100,
      usedCount: 5,
    });
    mockTxCouponUpdate.mockResolvedValue({});
    mockTxUserCouponCreate.mockResolvedValue({});

    // Post-transaction email batch fetch
    mockCardKeyFindMany.mockResolvedValue([
      { content: "enc_KEY-001", orderId: "item-1" },
    ]);

    // Reset mock$transaction to use real callback
    mock$transaction.mockImplementation(async (fn) =>
      fn({
        order: { findUnique: mockTxOrderFindUnique, update: mockTxOrderUpdate },
        user: { findUnique: mockTxUserFindUnique, update: mockTxUserUpdate },
        balanceLog: { create: mockTxBalanceLogCreate },
        product: { findUnique: mockTxProductFindUnique, update: mockTxProductUpdate },
        cardKey: { findMany: mockTxCardKeyFindMany, updateMany: mockTxCardKeyUpdateMany },
        coupon: { findUnique: mockTxCouponFindUnique, update: mockTxCouponUpdate },
        userCoupon: { create: mockTxUserCouponCreate },
      })
    );

    const req = makeReq({ paymentMethod: "balance" });
    const res = await POST(req, { params: Promise.resolve({ id: "order-1" }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);

    // Verify coupon usage was incremented
    expect(mockTxCouponFindUnique).toHaveBeenCalledWith({
      where: { id: "coupon-1" },
    });
    expect(mockTxCouponUpdate).toHaveBeenCalledWith({
      where: { id: "coupon-1" },
      data: { usedCount: { increment: 1 } },
    });

    // Verify userCoupon tracking was created
    expect(mockTxUserCouponCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user-1",
        couponId: "coupon-1",
      }),
    });

    vi.useRealTimers();
  });

  // -----------------------------------------------------------------------
  // 14. Guest payment (no session) skips balance deduction
  // -----------------------------------------------------------------------

  it("guest payment (no session) skips balance deduction", async () => {
    vi.useFakeTimers({ now: now.getTime() });
    mockSession = null;

    mockOrderFindUnique.mockResolvedValue({ ...mockOrder, userId: null });

    // Transaction mocks — no balance operations expected
    mockTxOrderFindUnique.mockResolvedValue({ status: "PENDING" });
    mockTxProductFindUnique.mockResolvedValue({ stockCount: 10, name: "Product A" });
    mockTxCardKeyFindMany.mockResolvedValue([{ id: "ck-1", content: "enc_KEY-001" }]);
    mockTxCardKeyUpdateMany.mockResolvedValue({ count: 1 });
    mockTxProductUpdate.mockResolvedValue({});
    mockTxOrderUpdate.mockResolvedValue({
      id: "order-1",
      orderNo: "PJ37-001",
      status: "DELIVERED",
    });

    // Post-transaction email batch fetch
    mockCardKeyFindMany.mockResolvedValue([
      { content: "enc_KEY-001", orderId: "item-1" },
    ]);

    // Reset mock$transaction to use real callback
    mock$transaction.mockImplementation(async (fn) =>
      fn({
        order: { findUnique: mockTxOrderFindUnique, update: mockTxOrderUpdate },
        user: { findUnique: mockTxUserFindUnique, update: mockTxUserUpdate },
        balanceLog: { create: mockTxBalanceLogCreate },
        product: { findUnique: mockTxProductFindUnique, update: mockTxProductUpdate },
        cardKey: { findMany: mockTxCardKeyFindMany, updateMany: mockTxCardKeyUpdateMany },
        coupon: { findUnique: mockTxCouponFindUnique, update: mockTxCouponUpdate },
        userCoupon: { create: mockTxUserCouponCreate },
      })
    );

    const req = makeReq({ paymentMethod: "alipay" });
    const res = await POST(req, { params: Promise.resolve({ id: "order-1" }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe("支付成功，卡密已发放");

    // Verify balance operations were NOT performed
    expect(mockTxUserFindUnique).not.toHaveBeenCalled();
    expect(mockTxUserUpdate).not.toHaveBeenCalled();
    expect(mockTxBalanceLogCreate).not.toHaveBeenCalled();

    // Verify pre-check balance lookup was NOT performed
    expect(mockUserFindUnique).not.toHaveBeenCalled();

    // Verify in-app notification was NOT created (no session)
    expect(mockCreateNotification).not.toHaveBeenCalled();

    // Verify userCoupon was NOT created (no session, no coupon)
    expect(mockTxUserCouponCreate).not.toHaveBeenCalled();

    vi.useRealTimers();
  });
});
