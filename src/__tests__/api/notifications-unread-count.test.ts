import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Mocks — declared BEFORE importing the route handler
// ---------------------------------------------------------------------------

const mockNotificationCount = vi.fn();

vi.mock("@/server/db", () => ({
  db: {
    notification: {
      count: (...args: unknown[]) => mockNotificationCount(...args),
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

const mockDecodeSession = vi.fn();
vi.mock("@/lib/auth", () => ({
  decodeSession: (...args: unknown[]) => mockDecodeSession(...args),
}));

// ---------------------------------------------------------------------------
// Import the route handler AFTER all mocks are in place
// ---------------------------------------------------------------------------

const { GET } = await import("@/app/api/notifications/unread-count/route");

// ---------------------------------------------------------------------------
// Tests — GET /api/notifications/unread-count
// ---------------------------------------------------------------------------

describe("GET /api/notifications/unread-count", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDecodeSession.mockReturnValue({
      id: "user-1",
      username: "testuser",
      email: "test@example.com",
      role: "USER",
    });
    mockNotificationCount.mockResolvedValue(5);
  });

  // -------------------------------------------------------------------------
  // 1. Returns unread count for authenticated user
  // -------------------------------------------------------------------------

  it("returns unread count for authenticated user", async () => {
    const req = new NextRequest("http://localhost:3001/api/notifications/unread-count", {
      headers: { cookie: "session=valid-token" },
    });
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.count).toBe(5);
  });

  // -------------------------------------------------------------------------
  // 2. Returns count 0 for unauthenticated (no session cookie)
  // -------------------------------------------------------------------------

  it("returns count 0 for unauthenticated (no session cookie)", async () => {
    mockDecodeSession.mockReturnValue(null);

    const req = new NextRequest("http://localhost:3001/api/notifications/unread-count");
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.count).toBe(0);
    expect(mockNotificationCount).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // 3. Returns count 0 when decodeSession returns null
  // -------------------------------------------------------------------------

  it("returns count 0 when decodeSession returns null", async () => {
    mockDecodeSession.mockReturnValue(null);

    const req = new NextRequest("http://localhost:3001/api/notifications/unread-count", {
      headers: { cookie: "session=invalid-token" },
    });
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.count).toBe(0);
    expect(mockNotificationCount).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // 4. Sets Cache-Control header
  // -------------------------------------------------------------------------

  it("sets Cache-Control header (private, max-age=15, stale-while-revalidate=60)", async () => {
    const req = new NextRequest("http://localhost:3001/api/notifications/unread-count", {
      headers: { cookie: "session=valid-token" },
    });
    const response = await GET(req);

    expect(response.headers.get("Cache-Control")).toBe(
      "private, max-age=15, stale-while-revalidate=60"
    );
  });

  // -------------------------------------------------------------------------
  // 5. Returns count 0 on error (graceful fallback)
  // -------------------------------------------------------------------------

  it("returns count 0 on error (graceful fallback)", async () => {
    mockNotificationCount.mockRejectedValue(new Error("DB connection failed"));

    const req = new NextRequest("http://localhost:3001/api/notifications/unread-count", {
      headers: { cookie: "session=valid-token" },
    });
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.count).toBe(0);
  });

  // -------------------------------------------------------------------------
  // 6. Queries with correct userId and isRead:false
  // -------------------------------------------------------------------------

  it("queries with correct userId and isRead:false", async () => {
    const req = new NextRequest("http://localhost:3001/api/notifications/unread-count", {
      headers: { cookie: "session=valid-token" },
    });
    await GET(req);

    expect(mockNotificationCount).toHaveBeenCalledWith({
      where: { userId: "user-1", isRead: false },
    });
  });

  // -----------------------------------------------------------------------
  // Edge cases
  // -----------------------------------------------------------------------

  it("returns count 0 when user has no unread notifications", async () => {
    mockNotificationCount.mockResolvedValue(0);

    const req = new NextRequest("http://localhost:3001/api/notifications/unread-count", {
      headers: { cookie: "session=valid-token" },
    });
    const response = await GET(req);
    const data = await response.json();

    expect(data.count).toBe(0);
  });

  it("uses private cache header (not public)", async () => {
    const req = new NextRequest("http://localhost:3001/api/notifications/unread-count", {
      headers: { cookie: "session=valid-token" },
    });
    const response = await GET(req);

    const cacheControl = response.headers.get("Cache-Control") || "";
    expect(cacheControl).toContain("private");
    expect(cacheControl).not.toContain("public");
  });

  it("handles large unread count correctly", async () => {
    mockNotificationCount.mockResolvedValue(9999);

    const req = new NextRequest("http://localhost:3001/api/notifications/unread-count", {
      headers: { cookie: "session=valid-token" },
    });
    const response = await GET(req);
    const data = await response.json();

    expect(data.count).toBe(9999);
  });

  it("does not set Cache-Control header for unauthenticated users", async () => {
    mockDecodeSession.mockReturnValue(null);

    const req = new NextRequest("http://localhost:3001/api/notifications/unread-count");
    const response = await GET(req);

    // Unauthenticated returns early before setting cache header
    expect(response.headers.get("Cache-Control")).toBeNull();
  });
});
