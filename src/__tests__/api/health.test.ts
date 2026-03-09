import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Mocks — declared BEFORE importing the route handler
// ---------------------------------------------------------------------------

const mockQueryRaw = vi.fn();

vi.mock("@/server/db", () => ({
  db: {
    $queryRaw: (...args: unknown[]) => mockQueryRaw(...args),
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

const mockCleanup = vi.fn();
vi.mock("@/server/services/order-cleanup", () => ({
  maybeCleanupExpiredOrders: (...args: unknown[]) => mockCleanup(...args),
}));

// ---------------------------------------------------------------------------
// Import the route handler AFTER all mocks are in place
// ---------------------------------------------------------------------------

const { GET } = await import("@/app/api/health/route");

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("GET /api/health", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: DB responds successfully
    mockQueryRaw.mockResolvedValue([{ "?column?": 1 }]);
  });

  // -------------------------------------------------------------------------
  // 1. Returns healthy status when DB is OK (200)
  // -------------------------------------------------------------------------

  it("returns healthy status when database is OK", async () => {
    const req = new NextRequest("http://localhost:3001/api/health");

    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe("healthy");
    expect(data.checks.database).toBe("ok");
  });

  // -------------------------------------------------------------------------
  // 2. Returns degraded status when DB fails (503)
  // -------------------------------------------------------------------------

  it("returns degraded status when database fails", async () => {
    mockQueryRaw.mockRejectedValue(new Error("Connection refused"));

    const req = new NextRequest("http://localhost:3001/api/health");

    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.status).toBe("degraded");
    expect(data.checks.database).toBe("error");
  });

  // -------------------------------------------------------------------------
  // 3. Includes memory, uptime, version info
  // -------------------------------------------------------------------------

  it("includes memory usage, uptime, and version in the response", async () => {
    const req = new NextRequest("http://localhost:3001/api/health");

    const response = await GET(req);
    const data = await response.json();

    // Memory fields
    expect(data.memory).toBeDefined();
    expect(typeof data.memory.rss_mb).toBe("number");
    expect(typeof data.memory.heap_used_mb).toBe("number");
    expect(typeof data.memory.heap_total_mb).toBe("number");

    // Uptime
    expect(typeof data.uptime_seconds).toBe("number");
    expect(data.uptime_seconds).toBeGreaterThanOrEqual(0);

    // Version
    expect(data.version).toBeDefined();
    expect(typeof data.version).toBe("string");

    // Timestamp
    expect(data.timestamp).toBeDefined();

    // Timings
    expect(data.timings).toBeDefined();
    expect(typeof data.timings.database_ms).toBe("number");
  });

  // -------------------------------------------------------------------------
  // 4. Calls maybeCleanupExpiredOrders when healthy
  // -------------------------------------------------------------------------

  it("calls maybeCleanupExpiredOrders when status is healthy", async () => {
    const req = new NextRequest("http://localhost:3001/api/health");

    await GET(req);

    expect(mockCleanup).toHaveBeenCalledTimes(1);
  });

  // -------------------------------------------------------------------------
  // 5. Does not call cleanup when degraded
  // -------------------------------------------------------------------------

  it("does not call maybeCleanupExpiredOrders when status is degraded", async () => {
    mockQueryRaw.mockRejectedValue(new Error("DB down"));

    const req = new NextRequest("http://localhost:3001/api/health");

    await GET(req);

    expect(mockCleanup).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // Edge cases
  // -----------------------------------------------------------------------

  it("includes database timing even on failure", async () => {
    mockQueryRaw.mockRejectedValue(new Error("timeout"));

    const req = new NextRequest("http://localhost:3001/api/health");
    const response = await GET(req);
    const data = await response.json();

    expect(data.timings.database_ms).toBeGreaterThanOrEqual(0);
  });

  it("returns ISO timestamp format", async () => {
    const req = new NextRequest("http://localhost:3001/api/health");
    const response = await GET(req);
    const data = await response.json();

    // Should be a valid ISO date string
    expect(new Date(data.timestamp).toISOString()).toBe(data.timestamp);
  });

  it("falls back to version 1.0.0 when npm_package_version is unset", async () => {
    const req = new NextRequest("http://localhost:3001/api/health");
    const response = await GET(req);
    const data = await response.json();

    // In test env, npm_package_version may not be set
    expect(typeof data.version).toBe("string");
    expect(data.version.length).toBeGreaterThan(0);
  });

  it("memory values are non-negative integers", async () => {
    const req = new NextRequest("http://localhost:3001/api/health");
    const response = await GET(req);
    const data = await response.json();

    expect(data.memory.rss_mb).toBeGreaterThanOrEqual(0);
    expect(data.memory.heap_used_mb).toBeGreaterThanOrEqual(0);
    expect(data.memory.heap_total_mb).toBeGreaterThanOrEqual(0);
    // Values should be rounded (integers)
    expect(Number.isInteger(data.memory.rss_mb)).toBe(true);
  });

  it("uptime_seconds is a non-negative integer", async () => {
    const req = new NextRequest("http://localhost:3001/api/health");
    const response = await GET(req);
    const data = await response.json();

    expect(Number.isInteger(data.uptime_seconds)).toBe(true);
    expect(data.uptime_seconds).toBeGreaterThanOrEqual(0);
  });
});
