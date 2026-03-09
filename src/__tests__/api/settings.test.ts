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

  // -----------------------------------------------------------------------
  // Edge cases
  // -----------------------------------------------------------------------

  it("returns 500 error message as '获取站点设置失败'", async () => {
    mockSiteSettingFindMany.mockRejectedValue(new Error("timeout"));

    const res = await GET(makeReq());
    const data = await res.json();

    expect(data.message).toBe("获取站点设置失败");
  });

  it("returns all four public keys when present", async () => {
    mockSiteSettingFindMany.mockResolvedValue([
      { key: "site_name", value: "Test Shop" },
      { key: "site_description", value: "A test shop" },
      { key: "logo_url", value: "https://example.com/logo.png" },
      { key: "announcement", value: "Sale!" },
    ]);

    const res = await GET(makeReq());
    const data = await res.json();

    expect(Object.keys(data.settings)).toHaveLength(4);
    expect(data.settings.site_name).toBe("Test Shop");
    expect(data.settings.site_description).toBe("A test shop");
    expect(data.settings.logo_url).toBe("https://example.com/logo.png");
    expect(data.settings.announcement).toBe("Sale!");
  });

  it("sets stale-while-revalidate in cache header", async () => {
    mockSiteSettingFindMany.mockResolvedValue([]);

    const res = await GET(makeReq());

    expect(res.headers.get("cache-control")).toContain("stale-while-revalidate=600");
  });

  it("handles duplicate keys by using last DB row value", async () => {
    mockSiteSettingFindMany.mockResolvedValue([
      { key: "site_name", value: "First" },
      { key: "site_name", value: "Second" },
    ]);

    const res = await GET(makeReq());
    const data = await res.json();

    // The route iterates rows sequentially, so last value wins
    expect(data.settings.site_name).toBe("Second");
  });

  it("returns 200 with success true even with partial settings", async () => {
    mockSiteSettingFindMany.mockResolvedValue([
      { key: "site_name", value: "OnlyName" },
    ]);

    const res = await GET(makeReq());
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(Object.keys(data.settings)).toHaveLength(1);
    expect(data.settings.site_description).toBeUndefined();
  });
});
