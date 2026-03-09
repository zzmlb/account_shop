import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockUserFindUnique = vi.fn();
const mockUserUpdate = vi.fn();

vi.mock("@/server/db", () => ({
  db: {
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
      update: (...args: unknown[]) => mockUserUpdate(...args),
    },
  },
}));

let mockUserSession: { id: string; role: string } | null = { id: "user-1", role: "USER" };
vi.mock("@/lib/auth", () => ({
  getUserSession: () => {
    if (!mockUserSession) {
      const { NextResponse } = require("next/server");
      return { session: null, error: NextResponse.json({ success: false }, { status: 401 }) };
    }
    return { session: mockUserSession, error: null };
  },
}));

vi.mock("@/lib/rate-limit", () => ({
  apiLimiter: () => ({ success: true, remaining: 10, reset: Date.now() + 60000 }),
  getClientIp: () => "127.0.0.1",
  rateLimitResponse: () => {
    const { NextResponse } = require("next/server");
    return NextResponse.json({ success: false, message: "请求过于频繁" }, { status: 429 });
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

vi.mock("@/lib/validators", () => ({
  updateEmailSchema: {
    safeParse: (data: Record<string, unknown>) => {
      if (!data.email || typeof data.email !== "string" || !data.email.includes("@")) {
        return { success: false, error: { issues: [{ message: "邮箱格式不正确" }] } };
      }
      return { success: true, data: { email: data.email.trim().toLowerCase() } };
    },
  },
  formatZodError: (err: { issues: Array<{ message: string }> }) => err.issues[0]?.message ?? "验证错误",
}));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

const { PUT } = await import("@/app/api/auth/email/route");

function makeReq(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/auth/email", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("PUT /api/auth/email", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserSession = { id: "user-1", role: "USER" };
  });

  it("updates email successfully", async () => {
    mockUserFindUnique.mockResolvedValue(null);
    mockUserUpdate.mockResolvedValue({ id: "user-1", email: "new@example.com" });

    const res = await PUT(makeReq({ email: "new@example.com" }));
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.message).toContain("邮箱已更新");
  });

  it("returns 401 when not authenticated", async () => {
    mockUserSession = null;

    const res = await PUT(makeReq({ email: "new@example.com" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 on validation error (missing email)", async () => {
    const res = await PUT(makeReq({}));
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.message).toBeDefined();
  });

  it("returns 400 on validation error (invalid email format)", async () => {
    const res = await PUT(makeReq({ email: "not-an-email" }));
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.message).toContain("邮箱格式不正确");
  });

  it("returns 409 when email already used by another user", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "other-user-999", email: "taken@example.com" });

    const res = await PUT(makeReq({ email: "taken@example.com" }));
    expect(res.status).toBe(409);

    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.message).toContain("已被其他账户使用");
  });

  it("allows same email if it belongs to the current user", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "mine@example.com" });
    mockUserUpdate.mockResolvedValue({ id: "user-1", email: "mine@example.com" });

    const res = await PUT(makeReq({ email: "mine@example.com" }));
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
  });

  it("returns updated email in response", async () => {
    mockUserFindUnique.mockResolvedValue(null);
    mockUserUpdate.mockResolvedValue({ id: "user-1", email: "updated@example.com" });

    const res = await PUT(makeReq({ email: "  Updated@Example.COM  " }));
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.email).toBe("updated@example.com");
  });

  it("calls db.user.update with correct parameters", async () => {
    mockUserFindUnique.mockResolvedValue(null);
    mockUserUpdate.mockResolvedValue({ id: "user-1", email: "verify@example.com" });

    await PUT(makeReq({ email: "verify@example.com" }));

    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { email: "verify@example.com" },
    });
  });
});
