import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock db
vi.mock("@/server/db", () => ({
  db: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

// Mock rate limiter to always allow by default
vi.mock("@/lib/rate-limit", () => ({
  registerLimiter: vi.fn().mockReturnValue({
    success: true,
    remaining: 10,
    reset: Date.now() + 60000,
  }),
  apiLimiter: () => ({
    success: true,
    remaining: 10,
    reset: Date.now() + 60000,
  }),
  getClientIp: () => "127.0.0.1",
  rateLimitResponse: () =>
    new (require("next/server").NextResponse)(
      JSON.stringify({ success: false }),
      { status: 429 }
    ),
  loginLimiter: () => ({
    success: true,
    remaining: 10,
    reset: Date.now() + 60000,
  }),
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

// Mock auth - use simple implementations instead of bcrypt
vi.mock("@/lib/auth", () => ({
  hashPassword: vi.fn().mockResolvedValue("hashed-password"),
  encodeSession: vi.fn().mockReturnValue("mock-session-token"),
  verifyPassword: vi.fn(),
}));

function createRequest(body: unknown) {
  const req = new NextRequest("http://localhost:3001/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return req;
}

const validBody = {
  username: "testuser",
  email: "test@example.com",
  password: "Pass123",
};

const createdUser = {
  id: "user-id-123",
  username: "testuser",
  email: "test@example.com",
  passwordHash: "hashed-password",
  role: "USER",
  balance: 0,
  avatar: null,
};

describe("POST /api/auth/register", () => {
  let POST: typeof import("@/app/api/auth/register/route").POST;
  let mockFindUnique: ReturnType<typeof vi.fn>;
  let mockCreate: ReturnType<typeof vi.fn>;
  let mockRegisterLimiter: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();

    const { db } = await import("@/server/db");
    mockFindUnique = db.user.findUnique as ReturnType<typeof vi.fn>;
    mockCreate = db.user.create as ReturnType<typeof vi.fn>;

    const rateLimitMod = await import("@/lib/rate-limit");
    mockRegisterLimiter = rateLimitMod.registerLimiter as ReturnType<
      typeof vi.fn
    >;
    mockRegisterLimiter.mockReturnValue({
      success: true,
      remaining: 10,
      reset: Date.now() + 60000,
    });

    const mod = await import("@/app/api/auth/register/route");
    POST = mod.POST;
  });

  it("should register successfully and return user data with session cookie", async () => {
    mockFindUnique.mockResolvedValue(null);
    mockCreate.mockResolvedValue(createdUser);

    const req = createRequest(validBody);
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe("注册成功");
    expect(data.user).toEqual({
      id: "user-id-123",
      username: "testuser",
      email: "test@example.com",
      role: "user",
      balance: 0,
    });

    // Verify session cookie is set
    const setCookieHeader = response.headers.getSetCookie();
    const sessionCookie = setCookieHeader.find((c: string) =>
      c.startsWith("session=")
    );
    expect(sessionCookie).toBeDefined();
    expect(sessionCookie).toContain("mock-session-token");
    expect(sessionCookie).toContain("HttpOnly");
    expect(sessionCookie).toContain("Path=/");

    // Verify db calls
    expect(mockFindUnique).toHaveBeenCalledTimes(2);
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { username: "testuser" },
    });
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { email: "test@example.com" },
    });
    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        username: "testuser",
        email: "test@example.com",
        passwordHash: "hashed-password",
        role: "USER",
        balance: 0,
      },
    });
  });

  it("should return 400 when username is missing", async () => {
    const req = createRequest({
      email: "test@example.com",
      password: "Pass123",
    });
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.message).toBe("输入数据格式错误");
    expect(data.errors).toBeDefined();
    expect(data.errors.username).toBeDefined();
  });

  it("should return 400 when password is too short", async () => {
    const req = createRequest({
      username: "testuser",
      email: "test@example.com",
      password: "Pa1",
    });
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.message).toBe("输入数据格式错误");
    expect(data.errors).toBeDefined();
    expect(data.errors.password).toBeDefined();
    expect(data.errors.password.some((e: string) => e.includes("至少6个字符"))).toBe(true);
  });

  it("should return 400 when password is missing a number", async () => {
    const req = createRequest({
      username: "testuser",
      email: "test@example.com",
      password: "Password",
    });
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.message).toBe("输入数据格式错误");
    expect(data.errors).toBeDefined();
    expect(data.errors.password).toBeDefined();
    expect(data.errors.password.some((e: string) => e.includes("数字"))).toBe(true);
  });

  it("should return 400 when email is invalid", async () => {
    const req = createRequest({
      username: "testuser",
      email: "not-an-email",
      password: "Pass123",
    });
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.message).toBe("输入数据格式错误");
    expect(data.errors).toBeDefined();
    expect(data.errors.email).toBeDefined();
  });

  it("should return 409 when username is already taken", async () => {
    // First findUnique (username check) returns an existing user
    mockFindUnique.mockResolvedValueOnce({ id: "existing-user", username: "testuser" });

    const req = createRequest(validBody);
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.success).toBe(false);
    expect(data.message).toBe("用户名已被注册");
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("should return 409 when email is already taken", async () => {
    // First findUnique (username check) returns null
    mockFindUnique.mockResolvedValueOnce(null);
    // Second findUnique (email check) returns an existing user
    mockFindUnique.mockResolvedValueOnce({ id: "existing-user", email: "test@example.com" });

    const req = createRequest(validBody);
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.success).toBe(false);
    expect(data.message).toBe("邮箱已被注册");
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("should return 429 when rate limited", async () => {
    mockRegisterLimiter.mockReturnValue({
      success: false,
      remaining: 0,
      reset: Date.now() + 60000,
    });

    const req = createRequest(validBody);
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data.success).toBe(false);
    expect(data.message).toContain("注册请求过于频繁");
    expect(response.headers.get("Retry-After")).toBeDefined();
    expect(mockFindUnique).not.toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
  });
});
