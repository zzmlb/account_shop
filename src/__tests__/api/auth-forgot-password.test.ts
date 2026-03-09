import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockUserFindFirst = vi.fn();
const mockPasswordResetCreate = vi.fn();
const mockPasswordResetUpdateMany = vi.fn();

vi.mock("@/server/db", () => ({
  db: {
    user: {
      findFirst: (...args: unknown[]) => mockUserFindFirst(...args),
    },
    passwordReset: {
      create: (...args: unknown[]) => mockPasswordResetCreate(...args),
      updateMany: (...args: unknown[]) => mockPasswordResetUpdateMany(...args),
    },
  },
}));

const mockSendPasswordReset = vi.fn().mockResolvedValue(undefined);

vi.mock("@/server/services/email", () => ({
  sendPasswordReset: (...args: unknown[]) => mockSendPasswordReset(...args),
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
  forgotPasswordSchema: {
    safeParse: (data: Record<string, unknown>) => {
      if (!data.email || typeof data.email !== "string" || !data.email.includes("@")) {
        return {
          success: false,
          error: {
            flatten: () => ({ fieldErrors: { email: ["请输入有效的邮箱地址"] } }),
          },
        };
      }
      return { success: true, data: { email: data.email } };
    },
  },
}));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

const { POST } = await import("@/app/api/auth/forgot-password/route");

function makeReq(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/auth/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/auth/forgot-password", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPasswordResetUpdateMany.mockResolvedValue({ count: 0 });
    mockPasswordResetCreate.mockResolvedValue({ id: "reset-1" });
  });

  it("returns 400 for invalid email", async () => {
    const res = await POST(makeReq({ email: "not-valid" }));
    expect(res.status).toBe(400);
  });

  it("returns success even for non-existent email (no info leak)", async () => {
    mockUserFindFirst.mockResolvedValue(null);

    const res = await POST(makeReq({ email: "unknown@example.com" }));
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.message).toContain("如果该邮箱已注册");

    // Should NOT send email or create token
    expect(mockPasswordResetCreate).not.toHaveBeenCalled();
    expect(mockSendPasswordReset).not.toHaveBeenCalled();
  });

  it("creates reset token and sends email for existing user", async () => {
    mockUserFindFirst.mockResolvedValue({
      id: "user-1",
      username: "testuser",
      email: "test@example.com",
    });

    const res = await POST(makeReq({ email: "test@example.com" }));
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);

    // Should invalidate existing tokens
    expect(mockPasswordResetUpdateMany).toHaveBeenCalled();
    // Should create new token
    expect(mockPasswordResetCreate).toHaveBeenCalled();
    // Should send email
    expect(mockSendPasswordReset).toHaveBeenCalled();
    const emailArgs = mockSendPasswordReset.mock.calls[0][0];
    expect(emailArgs.to).toBe("test@example.com");
    expect(emailArgs.username).toBe("testuser");
    expect(emailArgs.resetToken).toBeTruthy();
  });

  it("returns 500 on database error", async () => {
    mockUserFindFirst.mockRejectedValue(new Error("DB connection failed"));

    const res = await POST(makeReq({ email: "test@example.com" }));
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.message).toBe("服务器内部错误");
  });

  it("invalidates existing unused tokens before creating new one", async () => {
    mockUserFindFirst.mockResolvedValue({
      id: "user-1",
      username: "testuser",
      email: "test@example.com",
    });

    await POST(makeReq({ email: "test@example.com" }));

    // Should invalidate existing tokens first
    expect(mockPasswordResetUpdateMany).toHaveBeenCalledWith({
      where: { userId: "user-1", usedAt: null },
      data: { usedAt: expect.any(Date) },
    });

    // Then create new token
    const createArg = mockPasswordResetCreate.mock.calls[0][0];
    expect(createArg.data.userId).toBe("user-1");
    expect(createArg.data.token).toBeTruthy();
    expect(createArg.data.token.length).toBe(64); // 32 bytes hex = 64 chars
    expect(createArg.data.expiresAt).toBeInstanceOf(Date);
    // Token should expire ~30 minutes from now
    const diff = createArg.data.expiresAt.getTime() - Date.now();
    expect(diff).toBeGreaterThan(29 * 60 * 1000);
    expect(diff).toBeLessThanOrEqual(30 * 60 * 1000);
  });

  it("does not create token or send email when user has no email", async () => {
    mockUserFindFirst.mockResolvedValue({
      id: "user-1",
      username: "testuser",
      email: null,
    });

    const res = await POST(makeReq({ email: "test@example.com" }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockPasswordResetCreate).not.toHaveBeenCalled();
    expect(mockSendPasswordReset).not.toHaveBeenCalled();
  });

  it("returns same response regardless of email existence", async () => {
    // Test with existing user
    mockUserFindFirst.mockResolvedValue({
      id: "user-1",
      username: "testuser",
      email: "exist@example.com",
    });
    const res1 = await POST(makeReq({ email: "exist@example.com" }));
    const data1 = await res1.json();

    vi.clearAllMocks();
    mockPasswordResetUpdateMany.mockResolvedValue({ count: 0 });
    mockPasswordResetCreate.mockResolvedValue({ id: "reset-1" });

    // Test with non-existing user
    mockUserFindFirst.mockResolvedValue(null);
    const res2 = await POST(makeReq({ email: "noexist@example.com" }));
    const data2 = await res2.json();

    // Same response structure
    expect(res1.status).toBe(res2.status);
    expect(data1.success).toBe(data2.success);
    expect(data1.message).toBe(data2.message);
  });

  // -----------------------------------------------------------------------
  // Edge cases
  // -----------------------------------------------------------------------

  it("passes correct args to sendPasswordReset", async () => {
    mockUserFindFirst.mockResolvedValue({
      id: "user-1",
      username: "alice",
      email: "alice@example.com",
    });

    await POST(makeReq({ email: "alice@example.com" }));

    expect(mockSendPasswordReset).toHaveBeenCalledTimes(1);
    const arg = mockSendPasswordReset.mock.calls[0][0];
    expect(arg.to).toBe("alice@example.com");
    expect(arg.username).toBe("alice");
    expect(typeof arg.resetToken).toBe("string");
    expect(arg.resetToken.length).toBe(64);
  });

  it("returns 400 with errors object for invalid email", async () => {
    const res = await POST(makeReq({ email: "bad" }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.message).toContain("邮箱");
    expect(data.errors).toBeDefined();
  });

  it("returns 400 for missing email field", async () => {
    const res = await POST(makeReq({}));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
  });
});
