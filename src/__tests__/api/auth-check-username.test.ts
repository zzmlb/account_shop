import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Mocks — declared BEFORE importing the route handler
// ---------------------------------------------------------------------------

const mockUserFindUnique = vi.fn();

vi.mock("@/server/db", () => ({
  db: {
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
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

// ---------------------------------------------------------------------------
// Import the route handler AFTER all mocks are in place
// ---------------------------------------------------------------------------

const { GET } = await import("@/app/api/auth/check-username/route");

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("GET /api/auth/check-username", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: no existing user found
    mockUserFindUnique.mockResolvedValue(null);
  });

  // -------------------------------------------------------------------------
  // 1. Returns available: true for new username
  // -------------------------------------------------------------------------

  it("returns available: true when username does not exist", async () => {
    mockUserFindUnique.mockResolvedValue(null);

    const req = new NextRequest(
      "http://localhost:3001/api/auth/check-username?username=testuser",
    );

    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.available).toBe(true);

    // Verify the DB was queried with the correct username
    expect(mockUserFindUnique).toHaveBeenCalledWith({
      where: { username: "testuser" },
      select: { id: true },
    });
  });

  // -------------------------------------------------------------------------
  // 2. Returns available: false for existing username
  // -------------------------------------------------------------------------

  it("returns available: false when username already exists", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "user-1" });

    const req = new NextRequest(
      "http://localhost:3001/api/auth/check-username?username=existinguser",
    );

    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.available).toBe(false);
  });

  // -------------------------------------------------------------------------
  // 3. Returns available: false for short username (< 2 chars)
  // -------------------------------------------------------------------------

  it("returns available: false for username shorter than 2 characters", async () => {
    const req = new NextRequest(
      "http://localhost:3001/api/auth/check-username?username=a",
    );

    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.available).toBe(false);

    // DB should NOT be queried for invalid usernames
    expect(mockUserFindUnique).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // 4. Returns available: false for missing username param
  // -------------------------------------------------------------------------

  it("returns available: false when username param is missing", async () => {
    const req = new NextRequest(
      "http://localhost:3001/api/auth/check-username",
    );

    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.available).toBe(false);

    // DB should NOT be queried when param is missing
    expect(mockUserFindUnique).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // 5. Trims username before checking
  // -------------------------------------------------------------------------

  it("trims whitespace from username before checking", async () => {
    mockUserFindUnique.mockResolvedValue(null);

    const req = new NextRequest(
      "http://localhost:3001/api/auth/check-username?username=%20%20testuser%20%20",
    );

    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.available).toBe(true);

    // Should query with trimmed username
    expect(mockUserFindUnique).toHaveBeenCalledWith({
      where: { username: "testuser" },
      select: { id: true },
    });
  });
});
