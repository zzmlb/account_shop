import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Set CRON_SECRET BEFORE module loads — vi.hoisted runs before vi.mock
// ---------------------------------------------------------------------------
vi.hoisted(() => {
  process.env.CRON_SECRET = "test-cron-secret";
});

// ---------------------------------------------------------------------------
// Mocks — declared BEFORE importing the route handler
// ---------------------------------------------------------------------------

const {
  mockLoginLogDeleteMany,
  mockPasswordResetDeleteMany,
  mockNotificationDeleteMany,
  mockCouponUpdateMany,
} = vi.hoisted(() => {
  const mockLoginLogDeleteMany = vi.fn();
  const mockPasswordResetDeleteMany = vi.fn();
  const mockNotificationDeleteMany = vi.fn();
  const mockCouponUpdateMany = vi.fn();
  return {
    mockLoginLogDeleteMany,
    mockPasswordResetDeleteMany,
    mockNotificationDeleteMany,
    mockCouponUpdateMany,
  };
});

vi.mock("@/server/db", () => ({
  db: {
    loginLog: {
      deleteMany: (...args: unknown[]) => mockLoginLogDeleteMany(...args),
    },
    passwordReset: {
      deleteMany: (...args: unknown[]) => mockPasswordResetDeleteMany(...args),
    },
    notification: {
      deleteMany: (...args: unknown[]) => mockNotificationDeleteMany(...args),
    },
    coupon: {
      updateMany: (...args: unknown[]) => mockCouponUpdateMany(...args),
    },
  },
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: () => () => ({ success: true, remaining: 10, reset: Date.now() + 60000 }),
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
const { POST } = await import("@/app/api/cron/cleanup-data/route");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createPostRequest(token?: string) {
  const headers: Record<string, string> = {};
  if (token) headers["authorization"] = `Bearer ${token}`;
  return new NextRequest("http://localhost:3001/api/cron/cleanup-data", {
    method: "POST",
    headers,
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/cron/cleanup-data", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLoginLogDeleteMany.mockResolvedValue({ count: 0 });
    mockPasswordResetDeleteMany.mockResolvedValue({ count: 0 });
    mockNotificationDeleteMany.mockResolvedValue({ count: 0 });
    mockCouponUpdateMany.mockResolvedValue({ count: 0 });
  });

  it("cleans up data successfully with valid token", async () => {
    mockLoginLogDeleteMany.mockResolvedValue({ count: 5 });
    mockPasswordResetDeleteMany.mockResolvedValue({ count: 3 });
    mockNotificationDeleteMany.mockResolvedValue({ count: 10 });
    mockCouponUpdateMany.mockResolvedValue({ count: 2 });

    const res = await POST(createPostRequest("test-cron-secret"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.message).toBe("Data cleanup completed");
  });

  it("returns 401 for missing authorization", async () => {
    const res = await POST(createPostRequest());
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe("Unauthorized");
  });

  it("returns 401 for invalid token", async () => {
    const res = await POST(createPostRequest("wrong-token"));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe("Unauthorized");
  });

  it("returns cleanup counts in response", async () => {
    mockLoginLogDeleteMany.mockResolvedValue({ count: 12 });
    mockPasswordResetDeleteMany.mockResolvedValue({ count: 4 });
    mockNotificationDeleteMany.mockResolvedValue({ count: 7 });
    mockCouponUpdateMany.mockResolvedValue({ count: 1 });

    const res = await POST(createPostRequest("test-cron-secret"));
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.cleaned).toEqual({
      loginLogs: 12,
      passwordResets: 4,
      notifications: 7,
      deactivatedCoupons: 1,
    });
  });

  it("deactivates expired coupons", async () => {
    mockCouponUpdateMany.mockResolvedValue({ count: 3 });

    const res = await POST(createPostRequest("test-cron-secret"));
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.cleaned.deactivatedCoupons).toBe(3);

    // Verify coupon.updateMany was called with correct filter
    expect(mockCouponUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isActive: true,
          expireAt: expect.objectContaining({ lt: expect.any(Date) }),
        }),
        data: { isActive: false },
      })
    );
  });

  it("returns 500 on error", async () => {
    mockLoginLogDeleteMany.mockRejectedValue(new Error("DB connection lost"));

    const res = await POST(createPostRequest("test-cron-secret"));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe("Internal server error");
  });
});
