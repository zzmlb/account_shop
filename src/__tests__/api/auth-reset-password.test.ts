import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockPasswordResetFindUnique = vi.fn();
const mockTransaction = vi.fn();

vi.mock("@/server/db", () => ({
  db: {
    passwordReset: {
      findUnique: (...args: unknown[]) => mockPasswordResetFindUnique(...args),
    },
    $transaction: (...args: unknown[]) => mockTransaction(...args),
  },
}));

const mockHashPassword = vi.fn().mockResolvedValue("new-hashed-pw");

vi.mock("@/lib/auth", () => ({
  hashPassword: (...args: unknown[]) => mockHashPassword(...args),
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
  resetPasswordSchema: {
    safeParse: (data: Record<string, unknown>) => {
      if (!data.token || !data.password) {
        return { success: false, error: { issues: [{ message: "缺少必填字段" }] } };
      }
      if (typeof data.password === "string" && data.password.length < 6) {
        return { success: false, error: { issues: [{ message: "密码至少6位" }] } };
      }
      return { success: true, data: { token: data.token, password: data.password } };
    },
  },
  formatZodError: (err: { issues: Array<{ message: string }> }) => err.issues[0]?.message ?? "验证错误",
}));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

const { POST } = await import("@/app/api/auth/reset-password/route");

function makeReq(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/auth/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/auth/reset-password", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 for missing fields", async () => {
    const res = await POST(makeReq({}));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid (not found) token", async () => {
    mockPasswordResetFindUnique.mockResolvedValue(null);

    const res = await POST(makeReq({ token: "bad-token", password: "newpass123" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.message).toContain("无效");
  });

  it("returns 400 for already used token", async () => {
    mockPasswordResetFindUnique.mockResolvedValue({
      id: "reset-1",
      userId: "user-1",
      token: "valid-token",
      usedAt: new Date(),
      expiresAt: new Date(Date.now() + 3600000),
      user: { id: "user-1", username: "testuser" },
    });

    const res = await POST(makeReq({ token: "valid-token", password: "newpass123" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.message).toContain("已使用");
  });

  it("returns 400 for expired token", async () => {
    mockPasswordResetFindUnique.mockResolvedValue({
      id: "reset-1",
      userId: "user-1",
      token: "expired-token",
      usedAt: null,
      expiresAt: new Date(Date.now() - 3600000), // expired 1hr ago
      user: { id: "user-1", username: "testuser" },
    });

    const res = await POST(makeReq({ token: "expired-token", password: "newpass123" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.message).toContain("过期");
  });

  it("resets password successfully with valid token", async () => {
    mockPasswordResetFindUnique.mockResolvedValue({
      id: "reset-1",
      userId: "user-1",
      token: "good-token",
      usedAt: null,
      expiresAt: new Date(Date.now() + 3600000),
      user: { id: "user-1", username: "testuser" },
    });

    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      const tx = {
        passwordReset: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
        user: { update: vi.fn().mockResolvedValue({}) },
      };
      await fn(tx);
    });

    const res = await POST(makeReq({ token: "good-token", password: "newpass123" }));
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.message).toContain("重置成功");
    expect(mockHashPassword).toHaveBeenCalledWith("newpass123");
  });

  it("handles race condition (token already used during transaction)", async () => {
    mockPasswordResetFindUnique.mockResolvedValue({
      id: "reset-1",
      userId: "user-1",
      token: "race-token",
      usedAt: null,
      expiresAt: new Date(Date.now() + 3600000),
      user: { id: "user-1", username: "testuser" },
    });

    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<void>) => {
      const tx = {
        passwordReset: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) }, // race condition
        user: { update: vi.fn() },
      };
      await fn(tx);
    });

    const res = await POST(makeReq({ token: "race-token", password: "newpass123" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.message).toContain("已使用");
  });
});
