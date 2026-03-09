import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockUserFindUnique = vi.fn();
const mockUserUpdate = vi.fn();
const mockEncodeSession = vi.fn();

vi.mock("@/server/db", () => ({
  db: {
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
      update: (...args: unknown[]) => mockUserUpdate(...args),
    },
  },
}));

vi.mock("@/lib/rate-limit", () => ({
  apiLimiter: () => ({ success: true, remaining: 10, reset: Date.now() + 60000 }),
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

let mockUserSession: { id: string; role: string } | null = { id: "user-1", role: "USER" };
vi.mock("@/lib/auth", () => ({
  getUserSession: () => {
    if (!mockUserSession) {
      const { NextResponse } = require("next/server");
      return { session: null, error: NextResponse.json({ success: false }, { status: 401 }) };
    }
    return { session: mockUserSession, error: null };
  },
  encodeSession: (...args: unknown[]) => mockEncodeSession(...args),
}));

vi.mock("@/lib/validators", () => ({
  updateProfileSchema: {
    safeParse: (data: Record<string, unknown>) => {
      if (!data.avatar || typeof data.avatar !== "string") {
        return { success: false, error: { issues: [{ message: "头像地址无效" }] } };
      }
      return { success: true, data };
    },
  },
  formatZodError: (err: { issues: Array<{ message: string }> }) => err.issues[0]?.message ?? "验证错误",
}));

const { GET, PUT } = await import("@/app/api/auth/me/route");

const mockUser = {
  id: "user-1",
  username: "testuser",
  email: "test@example.com",
  role: "USER",
  balance: 100.50,
  avatar: "/avatar.jpg",
  status: "ACTIVE",
};

describe("Auth Me API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserSession = { id: "user-1", role: "USER" };
  });

  // ─── GET ────────────────────────────────────────────────────────────

  describe("GET /api/auth/me", () => {
    it("returns current user data", async () => {
      mockUserFindUnique.mockResolvedValue(mockUser);

      const req = new NextRequest("http://localhost/api/auth/me");
      const res = await GET(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.user.id).toBe("user-1");
      expect(body.user.username).toBe("testuser");
      expect(body.user.email).toBe("test@example.com");
      expect(body.user.avatar).toBe("/avatar.jpg");
      expect(mockUserFindUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "user-1" },
        })
      );
    });

    it("returns 401 when not authenticated", async () => {
      mockUserSession = null;

      const req = new NextRequest("http://localhost/api/auth/me");
      const res = await GET(req);
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.success).toBe(false);
      expect(mockUserFindUnique).not.toHaveBeenCalled();
    });

    it("returns 401 when user not found in DB", async () => {
      mockUserFindUnique.mockResolvedValue(null);

      const req = new NextRequest("http://localhost/api/auth/me");
      const res = await GET(req);
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.success).toBe(false);
      expect(body.message).toBe("用户不存在");
    });

    it("returns 401 when user is BANNED", async () => {
      mockUserFindUnique.mockResolvedValue({ ...mockUser, status: "BANNED" });

      const req = new NextRequest("http://localhost/api/auth/me");
      const res = await GET(req);
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.success).toBe(false);
      expect(body.message).toBe("账户已被封禁");
    });

    it("lowercases role and converts balance to number", async () => {
      mockUserFindUnique.mockResolvedValue({ ...mockUser, role: "ADMIN", balance: "250.75" });

      const req = new NextRequest("http://localhost/api/auth/me");
      const res = await GET(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.user.role).toBe("admin");
      expect(body.user.balance).toBe(250.75);
      expect(typeof body.user.balance).toBe("number");
    });
  });

  // ─── PUT ────────────────────────────────────────────────────────────

  describe("PUT /api/auth/me", () => {
    it("updates avatar successfully and sets session cookie", async () => {
      const updatedUser = { ...mockUser, avatar: "/new-avatar.jpg" };
      mockUserUpdate.mockResolvedValue(updatedUser);
      mockEncodeSession.mockReturnValue("new-token-value");

      const req = new NextRequest("http://localhost/api/auth/me", {
        method: "PUT",
        body: JSON.stringify({ avatar: "/new-avatar.jpg" }),
        headers: { "Content-Type": "application/json" },
      });
      const res = await PUT(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.message).toBe("头像已更新");
      expect(body.user.avatar).toBe("/new-avatar.jpg");
      expect(body.user.role).toBe("user");
      expect(typeof body.user.balance).toBe("number");

      expect(mockUserUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "user-1" },
          data: { avatar: "/new-avatar.jpg" },
        })
      );

      expect(mockEncodeSession).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "user-1",
          username: "testuser",
          email: "test@example.com",
          role: "USER",
          avatar: "/new-avatar.jpg",
        })
      );

      const cookie = (res as unknown as import("next/server").NextResponse).cookies.get("session");
      expect(cookie).toBeDefined();
      expect(cookie!.value).toBe("new-token-value");
    });

    it("returns 401 when not authenticated", async () => {
      mockUserSession = null;

      const req = new NextRequest("http://localhost/api/auth/me", {
        method: "PUT",
        body: JSON.stringify({ avatar: "/new-avatar.jpg" }),
        headers: { "Content-Type": "application/json" },
      });
      const res = await PUT(req);
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.success).toBe(false);
      expect(mockUserUpdate).not.toHaveBeenCalled();
    });

    it("returns 400 on validation error", async () => {
      const req = new NextRequest("http://localhost/api/auth/me", {
        method: "PUT",
        body: JSON.stringify({ avatar: 12345 }),
        headers: { "Content-Type": "application/json" },
      });
      const res = await PUT(req);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.message).toBe("头像地址无效");
      expect(mockUserUpdate).not.toHaveBeenCalled();
    });
  });
});
