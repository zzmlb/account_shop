import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockSiteSettingFindMany = vi.fn();

vi.mock("@/server/db", () => ({
  db: {
    siteSetting: {
      findMany: (...args: unknown[]) => mockSiteSettingFindMany(...args),
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
    info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(),
  }),
}));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

const { GET } = await import("@/app/api/settings/route");

function makeReq() {
  return new NextRequest("http://localhost/api/settings", { method: "GET" });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("GET /api/settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns public site settings", async () => {
    mockSiteSettingFindMany.mockResolvedValue([
      { key: "site_name", value: "PJ37 Digital" },
      { key: "announcement", value: "Welcome!" },
    ]);

    const res = await GET(makeReq());
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.settings).toEqual({
      site_name: "PJ37 Digital",
      announcement: "Welcome!",
    });
  });

  it("returns empty settings when none configured", async () => {
    mockSiteSettingFindMany.mockResolvedValue([]);

    const res = await GET(makeReq());
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.settings).toEqual({});
  });

  it("only queries public keys", async () => {
    mockSiteSettingFindMany.mockResolvedValue([]);

    await GET(makeReq());

    expect(mockSiteSettingFindMany).toHaveBeenCalledWith({
      where: {
        key: {
          in: ["site_name", "site_description", "logo_url", "announcement"],
        },
      },
    });
  });

  it("sets cache-control header", async () => {
    mockSiteSettingFindMany.mockResolvedValue([]);

    const res = await GET(makeReq());

    expect(res.headers.get("cache-control")).toContain("public");
    expect(res.headers.get("cache-control")).toContain("s-maxage=120");
  });

  it("returns 500 on database error", async () => {
    mockSiteSettingFindMany.mockRejectedValue(new Error("DB error"));

    const res = await GET(makeReq());
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.success).toBe(false);
  });
});
