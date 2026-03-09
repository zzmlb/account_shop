import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Mocks — declared BEFORE importing the route handler
// ---------------------------------------------------------------------------

const mockUserFindFirst = vi.fn();
const mockLoginLogCreate = vi.fn().mockResolvedValue({});

vi.mock("@/server/db", () => ({
  db: {
    user: {
      findFirst: (...args: unknown[]) => mockUserFindFirst(...args),
    },
    loginLog: {
      create: (...args: unknown[]) => mockLoginLogCreate(...args),
    },
  },
}));

// Mock rate limiter to always allow by default
const mockLoginLimiter = vi.fn().mockReturnValue({
  success: true,
  remaining: 10,
  reset: Date.now() + 60000,
});

vi.mock("@/lib/rate-limit", () => ({
  loginLimiter: (...args: unknown[]) => mockLoginLimiter(...args),
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

// Mock auth — verifyPassword is controllable per-test; encodeSession returns a
// deterministic token so we can assert on the cookie value.
const mockVerifyPassword = vi.fn();

vi.mock("@/lib/auth", () => ({
  verifyPassword: (...args: unknown[]) => mockVerifyPassword(...args),
  encodeSession: vi.fn().mockReturnValue("mock-session-token"),
}));

// ---------------------------------------------------------------------------
// Import the route handler AFTER all mocks are in place
// ---------------------------------------------------------------------------

const { POST } = await import("@/app/api/auth/login/route");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createLoginRequest(body: unknown, headers?: Record<string, string>) {
  return new NextRequest("http://localhost:3001/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

const mockUser = {
  id: "user-1",
  username: "testuser",
  email: "test@example.com",
  passwordHash: "hashed-password",
  role: "USER",
  status: "ACTIVE",
  balance: 100,
  avatar: null,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Defaults: rate limiter allows, user exists, password matches
    mockLoginLimiter.mockReturnValue({
      success: true,
      remaining: 10,
      reset: Date.now() + 60000,
    });
    mockUserFindFirst.mockResolvedValue(mockUser);
    mockVerifyPassword.mockResolvedValue(true);
    mockLoginLogCreate.mockResolvedValue({});
  });

  // -----------------------------------------------------------------------
  // 1. Successful login
  // -----------------------------------------------------------------------

  it("returns 200 with user data and sets session cookie on successful login", async () => {
    const req = createLoginRequest({
      username: "testuser",
      password: "password123",
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.user).toEqual({
      id: "user-1",
      username: "testuser",
      email: "test@example.com",
      role: "user",
      balance: 100,
    });

    // Verify a session cookie was set
    const setCookie = response.headers.getSetCookie();
    expect(setCookie.length).toBeGreaterThan(0);
    const sessionCookie = setCookie.find((c: string) => c.startsWith("session="));
    expect(sessionCookie).toBeDefined();
    expect(sessionCookie).toContain("mock-session-token");
    expect(sessionCookie).toContain("HttpOnly");
    expect(sessionCookie).toContain("Path=/");

    // Default maxAge = 7 days (604800)
    expect(sessionCookie).toContain("Max-Age=604800");
  });

  // -----------------------------------------------------------------------
  // 2. Successful login with rememberMe
  // -----------------------------------------------------------------------

  it("sets a 30-day cookie when rememberMe is true", async () => {
    const req = createLoginRequest({
      username: "testuser",
      password: "password123",
      rememberMe: true,
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);

    const setCookie = response.headers.getSetCookie();
    const sessionCookie = setCookie.find((c: string) => c.startsWith("session="));
    expect(sessionCookie).toBeDefined();
    // 30 days = 2592000 seconds
    expect(sessionCookie).toContain("Max-Age=2592000");
  });

  // -----------------------------------------------------------------------
  // 3. Invalid body — missing fields returns 400
  // -----------------------------------------------------------------------

  it("returns 400 when username is missing", async () => {
    const req = createLoginRequest({
      password: "password123",
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.message).toBe("输入数据格式错误");
    expect(data.errors).toBeDefined();
  });

  it("returns 400 when password is missing", async () => {
    const req = createLoginRequest({
      username: "testuser",
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.message).toBe("输入数据格式错误");
    expect(data.errors).toBeDefined();
  });

  it("returns 400 when password is too short", async () => {
    const req = createLoginRequest({
      username: "testuser",
      password: "12345", // min 6
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.errors).toBeDefined();
  });

  it("returns 400 when username is too short", async () => {
    const req = createLoginRequest({
      username: "a", // min 2
      password: "password123",
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
  });

  // -----------------------------------------------------------------------
  // 4. User not found — returns 401
  // -----------------------------------------------------------------------

  it("returns 401 when user is not found", async () => {
    mockUserFindFirst.mockResolvedValue(null);

    const req = createLoginRequest({
      username: "nonexistent",
      password: "password123",
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.message).toBe("用户名或密码错误");
  });

  // -----------------------------------------------------------------------
  // 5. Wrong password — returns 401
  // -----------------------------------------------------------------------

  it("returns 401 when password is wrong", async () => {
    mockVerifyPassword.mockResolvedValue(false);

    const req = createLoginRequest({
      username: "testuser",
      password: "wrongpassword",
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.message).toBe("用户名或密码错误");
  });

  // -----------------------------------------------------------------------
  // 6. Banned user — returns 403
  // -----------------------------------------------------------------------

  it("returns 403 when user is banned", async () => {
    mockUserFindFirst.mockResolvedValue({
      ...mockUser,
      status: "BANNED",
    });

    const req = createLoginRequest({
      username: "testuser",
      password: "password123",
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.success).toBe(false);
    expect(data.message).toBe("账户已被封禁，请联系客服");

    // Password verification should NOT be called for banned users
    expect(mockVerifyPassword).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // 7. Login via email (case-insensitive)
  // -----------------------------------------------------------------------

  it("queries both username and lowercased email", async () => {
    const req = createLoginRequest({
      username: "Test@Example.COM",
      password: "password123",
    });

    await POST(req);

    expect(mockUserFindFirst).toHaveBeenCalledWith({
      where: {
        OR: [
          { username: "Test@Example.COM" },
          { email: "test@example.com" },
        ],
      },
    });
  });

  // -----------------------------------------------------------------------
  // 8. Rate limiting — returns 429
  // -----------------------------------------------------------------------

  it("returns 429 when rate limited", async () => {
    mockLoginLimiter.mockReturnValue({
      success: false,
      remaining: 0,
      reset: Date.now() + 30000,
    });

    const req = createLoginRequest({
      username: "testuser",
      password: "password123",
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data.success).toBe(false);
    expect(data.message).toBe("登录尝试过于频繁，请稍后再试");
    expect(response.headers.get("Retry-After")).toBeDefined();
  });

  // -----------------------------------------------------------------------
  // 9. Verify login log is recorded on various outcomes
  // -----------------------------------------------------------------------

  it("records a successful login log", async () => {
    const req = createLoginRequest(
      { username: "testuser", password: "password123" },
      { "x-forwarded-for": "1.2.3.4", "user-agent": "TestAgent/1.0" },
    );

    await POST(req);

    // Fire-and-forget: loginLog.create should have been called
    expect(mockLoginLogCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user-1",
        username: "testuser",
        success: true,
        ip: "1.2.3.4",
        userAgent: "TestAgent/1.0",
      }),
    });
  });

  it("records a failed login log when user not found", async () => {
    mockUserFindFirst.mockResolvedValue(null);

    const req = createLoginRequest(
      { username: "nobody", password: "password123" },
      { "x-forwarded-for": "5.6.7.8" },
    );

    await POST(req);

    expect(mockLoginLogCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: null,
        username: "nobody",
        success: false,
        reason: "用户不存在",
      }),
    });
  });

  it("records a failed login log when password is wrong", async () => {
    mockVerifyPassword.mockResolvedValue(false);

    const req = createLoginRequest(
      { username: "testuser", password: "badpassword" },
    );

    await POST(req);

    expect(mockLoginLogCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user-1",
        username: "testuser",
        success: false,
        reason: "密码错误",
      }),
    });
  });

  it("records a failed login log when user is banned", async () => {
    mockUserFindFirst.mockResolvedValue({
      ...mockUser,
      status: "BANNED",
    });

    const req = createLoginRequest(
      { username: "testuser", password: "password123" },
    );

    await POST(req);

    expect(mockLoginLogCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user-1",
        success: false,
        reason: "账户已封禁",
      }),
    });
  });

  // -----------------------------------------------------------------------
  // 10. Server error handling
  // -----------------------------------------------------------------------

  it("returns 500 when an unexpected error occurs", async () => {
    mockUserFindFirst.mockRejectedValue(new Error("DB connection failed"));

    const req = createLoginRequest({
      username: "testuser",
      password: "password123",
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.message).toBe("服务器内部错误");
  });

  // -----------------------------------------------------------------------
  // 11. Role is lowercased in the response
  // -----------------------------------------------------------------------

  it("lowercases role in the user data response", async () => {
    mockUserFindFirst.mockResolvedValue({
      ...mockUser,
      role: "ADMIN",
    });

    const req = createLoginRequest({
      username: "testuser",
      password: "password123",
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.user.role).toBe("admin");
  });

  // -----------------------------------------------------------------------
  // 12. Balance is coerced to number
  // -----------------------------------------------------------------------

  it("converts balance to a number in the response", async () => {
    mockUserFindFirst.mockResolvedValue({
      ...mockUser,
      balance: "250.50", // Prisma Decimal may come as string
    });

    const req = createLoginRequest({
      username: "testuser",
      password: "password123",
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.user.balance).toBe(250.5);
    expect(typeof data.user.balance).toBe("number");
  });

  // -----------------------------------------------------------------------
  // 13. IP extraction from x-forwarded-for
  // -----------------------------------------------------------------------

  it("extracts the first IP from x-forwarded-for header", async () => {
    const req = createLoginRequest(
      { username: "testuser", password: "password123" },
      { "x-forwarded-for": "10.0.0.1, 10.0.0.2, 10.0.0.3" },
    );

    await POST(req);

    // Rate limiter should receive the first IP
    expect(mockLoginLimiter).toHaveBeenCalledWith("10.0.0.1");
  });

  it("uses 'unknown' when x-forwarded-for is absent", async () => {
    const req = createLoginRequest(
      { username: "testuser", password: "password123" },
    );

    await POST(req);

    expect(mockLoginLimiter).toHaveBeenCalledWith("unknown");
  });

  // -----------------------------------------------------------------------
  // 14. encodeSession is called with the right payload
  // -----------------------------------------------------------------------

  it("calls encodeSession with correct user data", async () => {
    const { encodeSession } = await import("@/lib/auth");

    const req = createLoginRequest({
      username: "testuser",
      password: "password123",
    });

    await POST(req);

    expect(encodeSession).toHaveBeenCalledWith({
      id: "user-1",
      username: "testuser",
      email: "test@example.com",
      role: "USER",
      avatar: null,
    });
  });

  // -----------------------------------------------------------------------
  // 15. verifyPassword is called with the right arguments
  // -----------------------------------------------------------------------

  it("calls verifyPassword with the plaintext password and stored hash", async () => {
    const req = createLoginRequest({
      username: "testuser",
      password: "mySecretPwd",
    });

    await POST(req);

    expect(mockVerifyPassword).toHaveBeenCalledWith("mySecretPwd", "hashed-password");
  });
});
