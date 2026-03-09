import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockUserFindUnique = vi.fn();
const mockOrderCount = vi.fn();
const mockTransaction = vi.fn();

vi.mock("@/server/db", () => ({
  db: {
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
    },
    order: {
      count: (...args: unknown[]) => mockOrderCount(...args),
    },
    $transaction: (...args: unknown[]) => mockTransaction(...args),
  },
}));

const mockGetUserSession = vi.fn();
const mockVerifyPassword = vi.fn();

vi.mock("@/lib/auth", () => ({
  getUserSession: (...args: unknown[]) => mockGetUserSession(...args),
  verifyPassword: (...args: unknown[]) => mockVerifyPassword(...args),
}));

vi.mock("@/lib/rate-limit", () => ({
  loginLimiter: () => ({ success: true, remaining: 5, reset: Date.now() + 60000 }),
}));

vi.mock("@/lib/logger", () => ({
  createLogger: () => ({
    info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(),
  }),
}));

vi.mock("@/lib/validators", () => ({
  deleteAccountSchema: {
    safeParse: (data: Record<string, unknown>) => {
      if (!data.password || typeof data.password !== "string") {
        return { success: false, error: { issues: [{ message: "密码不能为空" }] } };
      }
      return { success: true, data: { password: data.password } };
    },
  },
  formatZodError: (err: { issues: Array<{ message: string }> }) => err.issues[0]?.message ?? "验证错误",
}));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

const { POST } = await import("@/app/api/auth/delete-account/route");

const mockSession = { id: "user-1", username: "testuser", email: "test@example.com", role: "USER" };
const mockDbUser = {
  id: "user-1",
  username: "testuser",
  email: "test@example.com",
  role: "USER",
  passwordHash: "hashed-pw",
};

function makeReq(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/auth/delete-account", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/auth/delete-account", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    const { NextResponse } = await import("next/server");
    mockGetUserSession.mockReturnValue({
      session: null,
      error: NextResponse.json({ success: false, message: "未登录" }, { status: 401 }),
    });

    const res = await POST(makeReq({ password: "test" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 for missing password", async () => {
    mockGetUserSession.mockReturnValue({ session: mockSession, error: null });

    const res = await POST(makeReq({}));
    expect(res.status).toBe(400);
  });

  it("returns 404 when user not found", async () => {
    mockGetUserSession.mockReturnValue({ session: mockSession, error: null });
    mockUserFindUnique.mockResolvedValue(null);

    const res = await POST(makeReq({ password: "test123" }));
    expect(res.status).toBe(404);
  });

  it("returns 403 when trying to delete admin account", async () => {
    mockGetUserSession.mockReturnValue({ session: mockSession, error: null });
    mockUserFindUnique.mockResolvedValue({ ...mockDbUser, role: "ADMIN" });

    const res = await POST(makeReq({ password: "test123" }));
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.message).toContain("管理员");
  });

  it("returns 401 when password is wrong", async () => {
    mockGetUserSession.mockReturnValue({ session: mockSession, error: null });
    mockUserFindUnique.mockResolvedValue(mockDbUser);
    mockVerifyPassword.mockResolvedValue(false);

    const res = await POST(makeReq({ password: "wrong" }));
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.message).toContain("密码错误");
  });

  it("returns 400 when user has pending orders", async () => {
    mockGetUserSession.mockReturnValue({ session: mockSession, error: null });
    mockUserFindUnique.mockResolvedValue(mockDbUser);
    mockVerifyPassword.mockResolvedValue(true);
    mockOrderCount.mockResolvedValue(2);

    const res = await POST(makeReq({ password: "correct" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.message).toContain("待处理");
  });

  it("deletes account successfully and clears cookie", async () => {
    mockGetUserSession.mockReturnValue({ session: mockSession, error: null });
    mockUserFindUnique.mockResolvedValue(mockDbUser);
    mockVerifyPassword.mockResolvedValue(true);
    mockOrderCount.mockResolvedValue(0);
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      // Simulate the transaction callback
      const tx = {
        user: { update: vi.fn().mockResolvedValue({}) },
        favorite: { deleteMany: vi.fn().mockResolvedValue({}) },
        passwordReset: { deleteMany: vi.fn().mockResolvedValue({}) },
      };
      await fn(tx);
    });

    const res = await POST(makeReq({ password: "correct" }));
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.message).toContain("删除");

    // Cookie should be cleared
    const setCookie = res.headers.get("set-cookie");
    expect(setCookie).toContain("session=");
  });

  // -----------------------------------------------------------------------
  // Edge cases
  // -----------------------------------------------------------------------

  it("returns 403 for SUPER_ADMIN role as well", async () => {
    mockGetUserSession.mockReturnValue({ session: mockSession, error: null });
    mockUserFindUnique.mockResolvedValue({ ...mockDbUser, role: "SUPER_ADMIN" });

    const res = await POST(makeReq({ password: "test123" }));
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.message).toContain("管理员");
  });

  it("returns 500 on unexpected server error", async () => {
    mockGetUserSession.mockReturnValue({ session: mockSession, error: null });
    mockUserFindUnique.mockRejectedValue(new Error("DB down"));

    const res = await POST(makeReq({ password: "test123" }));
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.message).toBe("服务器内部错误");
  });
});
