import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Mocks – must be declared before importing the route module
// ---------------------------------------------------------------------------

const mockSettingFindMany = vi.fn();
const mockSettingUpsert = vi.fn();

vi.mock("@/server/db", () => ({
  db: {
    siteSetting: {
      findMany: (...args: unknown[]) => mockSettingFindMany(...args),
      upsert: (...args: unknown[]) => mockSettingUpsert(...args),
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

let mockAdminSession: { id: string; role: string } | null = { id: "admin-1", role: "ADMIN" };
vi.mock("@/lib/admin-auth", () => ({
  getAdminSession: () => {
    if (!mockAdminSession) {
      const { NextResponse } = require("next/server");
      return { session: null, error: NextResponse.json({ success: false, message: "未登录" }, { status: 401 }) };
    }
    return { session: mockAdminSession, error: null };
  },
}));

vi.mock("@/lib/sanitize", () => ({
  stripHtml: (text: string) => text.replace(/<[^>]*>/g, "").trim(),
}));

// ---------------------------------------------------------------------------
// Import route handlers AFTER mocks
// ---------------------------------------------------------------------------

const { GET, PUT } = await import("@/app/api/admin/settings/route");

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const mockSettings = [
  { key: "site_name", value: "PJ37" },
  { key: "announcement", value: "Welcome" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createGetRequest() {
  return new NextRequest("http://localhost:3001/api/admin/settings", {
    method: "GET",
  });
}

function createPutRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost:3001/api/admin/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Admin Settings API — /api/admin/settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdminSession = { id: "admin-1", role: "ADMIN" };
  });

  // =========================================================================
  // GET
  // =========================================================================

  describe("GET /api/admin/settings", () => {
    it("1. returns settings as key-value object", async () => {
      mockSettingFindMany.mockResolvedValue(mockSettings);

      const response = await GET(createGetRequest());
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.settings).toEqual({
        site_name: "PJ37",
        announcement: "Welcome",
      });
      expect(mockSettingFindMany).toHaveBeenCalledOnce();
    });

    it("2. returns 401 when not authenticated", async () => {
      mockAdminSession = null;

      const response = await GET(createGetRequest());
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.message).toBe("未登录");
    });

    it("3. returns 500 on database error", async () => {
      mockSettingFindMany.mockRejectedValue(new Error("DB connection failed"));

      const response = await GET(createGetRequest());
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.message).toBe("服务器内部错误");
    });
  });

  // =========================================================================
  // PUT
  // =========================================================================

  describe("PUT /api/admin/settings", () => {
    it("4. updates valid settings", async () => {
      mockSettingUpsert.mockResolvedValue({});

      const response = await PUT(
        createPutRequest({
          settings: { site_name: "New Name", contact_email: "admin@example.com" },
        })
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe("设置已保存");
      expect(mockSettingUpsert).toHaveBeenCalledTimes(2);
    });

    it("5. returns 400 for missing settings param", async () => {
      const response = await PUT(createPutRequest({}));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toBe("缺少 settings 参数");
    });

    it("6. returns 400 for invalid/disallowed keys only", async () => {
      const response = await PUT(
        createPutRequest({
          settings: { evil_key: "hack", another_bad: "value" },
        })
      );
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toBe("无有效的设置项");
      expect(mockSettingUpsert).not.toHaveBeenCalled();
    });

    it("7. filters out disallowed keys (keeps only allowed)", async () => {
      mockSettingUpsert.mockResolvedValue({});

      const response = await PUT(
        createPutRequest({
          settings: {
            site_name: "PJ37",
            evil_key: "should be removed",
            contact_email: "admin@example.com",
            hacker_field: "bad",
          },
        })
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      // Only the 2 allowed keys should be upserted
      expect(mockSettingUpsert).toHaveBeenCalledTimes(2);

      const upsertedKeys = mockSettingUpsert.mock.calls.map(
        (call: unknown[]) => (call[0] as { where: { key: string } }).where.key
      );
      expect(upsertedKeys).toContain("site_name");
      expect(upsertedKeys).toContain("contact_email");
      expect(upsertedKeys).not.toContain("evil_key");
      expect(upsertedKeys).not.toContain("hacker_field");
    });

    it("8. sanitizes HTML fields (calls stripHtml for announcement/site_description)", async () => {
      mockSettingUpsert.mockResolvedValue({});

      const response = await PUT(
        createPutRequest({
          settings: {
            announcement: "<script>alert('xss')</script>Hello",
            site_description: "<b>Bold</b> text",
            site_name: "<b>Not sanitized</b>",
          },
        })
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockSettingUpsert).toHaveBeenCalledTimes(3);

      // Find the upsert calls by key
      const calls = mockSettingUpsert.mock.calls as Array<[{ where: { key: string }; update: { value: string }; create: { key: string; value: string } }]>;

      const announcementCall = calls.find((c) => c[0].where.key === "announcement");
      expect(announcementCall).toBeDefined();
      expect(announcementCall![0].update.value).toBe("alert('xss')Hello");
      expect(announcementCall![0].create.value).toBe("alert('xss')Hello");

      const descriptionCall = calls.find((c) => c[0].where.key === "site_description");
      expect(descriptionCall).toBeDefined();
      expect(descriptionCall![0].update.value).toBe("Bold text");
      expect(descriptionCall![0].create.value).toBe("Bold text");

      // site_name should NOT be sanitized (not an HTML field)
      const nameCall = calls.find((c) => c[0].where.key === "site_name");
      expect(nameCall).toBeDefined();
      expect(nameCall![0].update.value).toBe("<b>Not sanitized</b>");
    });

    it("9. upserts each setting with correct where/update/create", async () => {
      mockSettingUpsert.mockResolvedValue({});

      await PUT(
        createPutRequest({
          settings: { site_name: "TestSite", icp_number: "ICP-12345" },
        })
      );

      expect(mockSettingUpsert).toHaveBeenCalledTimes(2);

      expect(mockSettingUpsert).toHaveBeenCalledWith({
        where: { key: "site_name" },
        update: { value: "TestSite" },
        create: { key: "site_name", value: "TestSite" },
      });

      expect(mockSettingUpsert).toHaveBeenCalledWith({
        where: { key: "icp_number" },
        update: { value: "ICP-12345" },
        create: { key: "icp_number", value: "ICP-12345" },
      });
    });

    it("10. returns 500 on database error", async () => {
      mockSettingUpsert.mockRejectedValue(new Error("DB write failed"));

      const response = await PUT(
        createPutRequest({
          settings: { site_name: "Test" },
        })
      );
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.message).toBe("服务器内部错误");
    });
  });
});
