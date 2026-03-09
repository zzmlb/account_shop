import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Mocks — declared BEFORE importing the route handler
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

let mockSession: { id: string; username: string; email: string; role: string } | null = null;
const mockVerifyPassword = vi.fn();
const mockHashPassword = vi.fn();

vi.mock("@/lib/auth", () => ({
  getSessionFromRequest: () => mockSession,
  verifyPassword: (...args: unknown[]) => mockVerifyPassword(...args),
  hashPassword: (...args: unknown[]) => mockHashPassword(...args),
}));

const mockLoginLimiter = vi.fn().mockReturnValue({
  success: true,
  remaining: 5,
  reset: Date.now() + 60000,
});

vi.mock("@/lib/rate-limit", () => ({
  loginLimiter: (...args: unknown[]) => mockLoginLimiter(...args),
}));

vi.mock("@/lib/logger", () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

const mockSendPasswordChanged = vi.fn().mockResolvedValue(undefined);

vi.mock("@/server/services/email", () => ({
  sendPasswordChanged: (...args: unknown[]) => mockSendPasswordChanged(...args),
}));

const mockCreateNotification = vi.fn().mockResolvedValue(undefined);

vi.mock("@/server/services/notification", () => ({
  createNotification: (...args: unknown[]) => mockCreateNotification(...args),
}));

// ---------------------------------------------------------------------------
// Import the route handler AFTER all mocks are in place
// ---------------------------------------------------------------------------

const { PUT } = await import("@/app/api/auth/password/route");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeReq(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/auth/password", {
    method: "PUT",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json", "x-forwarded-for": "1.2.3.4" },
  });
}

const mockUser = {
  id: "user-1",
  username: "testuser",
  email: "test@example.com",
  passwordHash: "hashed",
};

const validBody = {
  currentPassword: "OldPass1",
  newPassword: "NewPass1",
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("PUT /api/auth/password", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Defaults: authenticated, rate limiter allows, user exists, password valid
    mockSession = { id: "user-1", username: "testuser", email: "test@example.com", role: "USER" };
    mockLoginLimiter.mockReturnValue({
      success: true,
      remaining: 5,
      reset: Date.now() + 60000,
    });
    mockUserFindUnique.mockResolvedValue(mockUser);
    mockUserUpdate.mockResolvedValue({});
    mockVerifyPassword.mockResolvedValue(true);
    mockHashPassword.mockResolvedValue("new-hashed-password");
  });

  // -----------------------------------------------------------------------
  // 1. Changes password successfully
  // -----------------------------------------------------------------------

  it("changes password successfully", async () => {
    const res = await PUT(makeReq(validBody));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toContain("密码修改成功");

    // Verify hashPassword was called with the new password
    expect(mockHashPassword).toHaveBeenCalledWith("NewPass1");

    // Verify user.update was called with the new hash
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { passwordHash: "new-hashed-password" },
    });
  });

  // -----------------------------------------------------------------------
  // 2. Returns 401 when not authenticated
  // -----------------------------------------------------------------------

  it("returns 401 when not authenticated", async () => {
    mockSession = null;

    const res = await PUT(makeReq(validBody));
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.message).toContain("未登录");
  });

  // -----------------------------------------------------------------------
  // 3. Returns 400 on validation error
  // -----------------------------------------------------------------------

  it("returns 400 on validation error", async () => {
    // newPassword too short and missing required characters
    const res = await PUT(makeReq({ currentPassword: "OldPass1", newPassword: "ab" }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.message).toBeTruthy();
  });

  // -----------------------------------------------------------------------
  // 4. Returns 404 when user not found in DB
  // -----------------------------------------------------------------------

  it("returns 404 when user not found in DB", async () => {
    mockUserFindUnique.mockResolvedValue(null);

    const res = await PUT(makeReq(validBody));
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.success).toBe(false);
    expect(data.message).toContain("用户不存在");
  });

  // -----------------------------------------------------------------------
  // 5. Returns 403 when current password is wrong
  // -----------------------------------------------------------------------

  it("returns 403 when current password is wrong", async () => {
    mockVerifyPassword.mockResolvedValue(false);

    const res = await PUT(makeReq(validBody));
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.success).toBe(false);
    expect(data.message).toContain("当前密码错误");
  });

  // -----------------------------------------------------------------------
  // 6. Clears session cookie on success
  // -----------------------------------------------------------------------

  it("clears session cookie on success", async () => {
    const res = await PUT(makeReq(validBody));

    expect(res.status).toBe(200);

    const setCookie = res.headers.get("set-cookie");
    expect(setCookie).toBeTruthy();
    expect(setCookie).toContain("session=");
    expect(setCookie).toContain("Max-Age=0");
  });

  // -----------------------------------------------------------------------
  // 7. Calls sendPasswordChanged email service
  // -----------------------------------------------------------------------

  it("calls sendPasswordChanged email service", async () => {
    const res = await PUT(makeReq(validBody));

    expect(res.status).toBe(200);

    expect(mockSendPasswordChanged).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "test@example.com",
        username: "testuser",
        ip: "1.2.3.4",
      }),
    );
    // Also verify the time field is present
    expect(mockSendPasswordChanged).toHaveBeenCalledWith(
      expect.objectContaining({ time: expect.any(String) }),
    );
  });

  // -----------------------------------------------------------------------
  // 8. Creates in-app notification
  // -----------------------------------------------------------------------

  it("creates in-app notification", async () => {
    const res = await PUT(makeReq(validBody));

    expect(res.status).toBe(200);

    expect(mockCreateNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        type: "SYSTEM",
        title: "密码已修改",
      }),
    );
    // Verify content contains meaningful info
    expect(mockCreateNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining("密码"),
      }),
    );
  });

  // -----------------------------------------------------------------------
  // 9. Returns 429 when rate limited
  // -----------------------------------------------------------------------

  it("returns 429 when rate limited", async () => {
    mockLoginLimiter.mockReturnValue({
      success: false,
      remaining: 0,
      reset: Date.now() + 30000,
    });

    const res = await PUT(makeReq(validBody));
    const data = await res.json();

    expect(res.status).toBe(429);
    expect(data.success).toBe(false);
    expect(data.message).toContain("频繁");
    expect(res.headers.get("Retry-After")).toBeDefined();
  });

  // -----------------------------------------------------------------------
  // 10. Returns 500 on unexpected server error
  // -----------------------------------------------------------------------

  it("returns 500 when an unexpected error occurs", async () => {
    mockUserFindUnique.mockRejectedValue(new Error("DB connection failed"));

    const res = await PUT(makeReq(validBody));
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.message).toContain("服务器内部错误");
  });
});
