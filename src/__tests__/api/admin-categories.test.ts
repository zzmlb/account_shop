import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Mocks – must be declared before importing the route module
// ---------------------------------------------------------------------------

const mockCategoryFindMany = vi.fn();
const mockCategoryFindUnique = vi.fn();
const mockCategoryFindFirst = vi.fn();
const mockCategoryCreate = vi.fn();
const mockCategoryUpdate = vi.fn();
const mockCategoryDelete = vi.fn();
const mockProductCount = vi.fn();

vi.mock("@/server/db", () => ({
  db: {
    category: {
      findMany: (...args: unknown[]) => mockCategoryFindMany(...args),
      findUnique: (...args: unknown[]) => mockCategoryFindUnique(...args),
      findFirst: (...args: unknown[]) => mockCategoryFindFirst(...args),
      create: (...args: unknown[]) => mockCategoryCreate(...args),
      update: (...args: unknown[]) => mockCategoryUpdate(...args),
      delete: (...args: unknown[]) => mockCategoryDelete(...args),
    },
    product: {
      count: (...args: unknown[]) => mockProductCount(...args),
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

// Mock admin auth
const mockGetAdminSession = vi.fn();
vi.mock("@/lib/admin-auth", () => ({
  getAdminSession: (...args: unknown[]) => mockGetAdminSession(...args),
}));

// Mock validators
vi.mock("@/lib/validators", () => ({
  createCategorySchema: {
    safeParse: (data: any) => {
      if (!data?.name) return { success: false, error: { flatten: () => ({ fieldErrors: {} }) } };
      return { success: true, data };
    },
  },
  updateCategorySchema: {
    safeParse: (data: any) => {
      if (!data?.id) return { success: false, error: { flatten: () => ({ fieldErrors: {} }) } };
      return { success: true, data };
    },
  },
  formatZodError: () => "验证失败",
}));

// Mock slugify
vi.mock("@/lib/utils", () => ({
  slugify: (name: string) => name.toLowerCase().replace(/\s+/g, "-"),
}));

// ---------------------------------------------------------------------------
// Import route handlers AFTER mocks
// ---------------------------------------------------------------------------

import { GET, POST, PUT, DELETE } from "@/app/api/admin/categories/route";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setupAdmin(id = "admin-1") {
  mockGetAdminSession.mockReturnValue({
    session: { id, username: "admin", email: "admin@test.com", role: "ADMIN" },
    error: null,
  });
}

function setupUnauth() {
  const { NextResponse } = require("next/server");
  mockGetAdminSession.mockReturnValue({
    session: null,
    error: NextResponse.json({ success: false, message: "未登录" }, { status: 401 }),
  });
}

function setupNonAdmin() {
  const { NextResponse } = require("next/server");
  mockGetAdminSession.mockReturnValue({
    session: null,
    error: NextResponse.json({ success: false, message: "无管理员权限" }, { status: 403 }),
  });
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const mockCategory = {
  id: "cat-1",
  name: "Games",
  slug: "games",
  description: "Gaming products",
  icon: "gamepad",
  sortOrder: 0,
  isActive: true,
  createdAt: new Date("2025-01-01T00:00:00Z"),
  _count: { products: 5 },
};

function createGetRequest() {
  return new NextRequest("http://localhost:3001/api/admin/categories", {
    method: "GET",
  });
}

function createPostRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost:3001/api/admin/categories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function createPutRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost:3001/api/admin/categories", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function createDeleteRequest(id?: string) {
  const url = id
    ? `http://localhost:3001/api/admin/categories?id=${id}`
    : "http://localhost:3001/api/admin/categories";
  return new NextRequest(url, { method: "DELETE" });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Admin Categories API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // GET
  // =========================================================================

  describe("GET /api/admin/categories", () => {
    it("should return all categories for admin", async () => {
      setupAdmin();
      mockCategoryFindMany.mockResolvedValue([mockCategory]);

      const response = await GET(createGetRequest());
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.categories).toHaveLength(1);
      expect(data.categories[0]).toEqual({
        id: "cat-1",
        name: "Games",
        slug: "games",
        description: "Gaming products",
        icon: "gamepad",
        sortOrder: 0,
        isActive: true,
        productCount: 5,
        createdAt: "2025-01-01T00:00:00.000Z",
      });
    });

    it("should return 401 for unauthenticated user", async () => {
      setupUnauth();

      const response = await GET(createGetRequest());
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.message).toBe("未登录");
    });

    it("should return 403 for non-admin user", async () => {
      setupNonAdmin();

      const response = await GET(createGetRequest());
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.message).toBe("无管理员权限");
    });

    it("should return 500 on database error", async () => {
      setupAdmin();
      mockCategoryFindMany.mockRejectedValue(new Error("DB connection failed"));

      const response = await GET(createGetRequest());
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.message).toBe("服务器内部错误");
    });
  });

  // =========================================================================
  // POST
  // =========================================================================

  describe("POST /api/admin/categories", () => {
    it("should create category successfully", async () => {
      setupAdmin();
      mockCategoryFindUnique.mockResolvedValue(null); // slug not taken
      const created = {
        id: "cat-new",
        name: "Software",
        slug: "software",
        description: null,
        icon: null,
        sortOrder: 0,
      };
      mockCategoryCreate.mockResolvedValue(created);

      const response = await POST(createPostRequest({ name: "Software" }));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.category).toEqual(created);
      expect(mockCategoryCreate).toHaveBeenCalledWith({
        data: {
          name: "Software",
          slug: "software",
          description: null,
          icon: null,
          sortOrder: 0,
        },
      });
    });

    it("should return 400 for invalid body (missing name)", async () => {
      setupAdmin();

      const response = await POST(createPostRequest({}));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toBe("验证失败");
    });

    it("should generate slug from name", async () => {
      setupAdmin();
      mockCategoryFindUnique.mockResolvedValue(null);
      mockCategoryCreate.mockResolvedValue({ id: "cat-new", name: "Game Keys", slug: "game-keys" });

      await POST(createPostRequest({ name: "Game Keys" }));

      expect(mockCategoryCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ slug: "game-keys" }),
        })
      );
    });

    it("should append timestamp when slug already exists", async () => {
      setupAdmin();
      // First findUnique returns an existing category (slug taken)
      mockCategoryFindUnique.mockResolvedValue({ id: "cat-existing", slug: "software" });
      mockCategoryCreate.mockResolvedValue({ id: "cat-new", name: "Software", slug: "software-abc" });

      await POST(createPostRequest({ name: "Software" }));

      const createCall = mockCategoryCreate.mock.calls[0][0];
      // Slug should have been modified – it should start with "software-" and differ from "software"
      expect(createCall.data.slug).not.toBe("software");
      expect(createCall.data.slug).toMatch(/^software-/);
    });
  });

  // =========================================================================
  // PUT
  // =========================================================================

  describe("PUT /api/admin/categories", () => {
    it("should update category successfully", async () => {
      setupAdmin();
      const existing = { id: "cat-1", name: "Games", slug: "games" };
      mockCategoryFindUnique.mockResolvedValue(existing);
      mockCategoryFindFirst.mockResolvedValue(null); // no slug conflict
      const updated = { ...existing, name: "Video Games", slug: "video-games" };
      mockCategoryUpdate.mockResolvedValue(updated);

      const response = await PUT(
        createPutRequest({ id: "cat-1", name: "Video Games" })
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.category).toEqual(updated);
      expect(mockCategoryUpdate).toHaveBeenCalledWith({
        where: { id: "cat-1" },
        data: expect.objectContaining({ name: "Video Games" }),
      });
    });

    it("should return 404 for non-existent category", async () => {
      setupAdmin();
      mockCategoryFindUnique.mockResolvedValue(null);

      const response = await PUT(
        createPutRequest({ id: "cat-nonexistent", name: "Whatever" })
      );
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.message).toBe("分类不存在");
    });

    it("should return 400 for invalid body (missing id)", async () => {
      setupAdmin();

      const response = await PUT(createPutRequest({ name: "No ID" }));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toBe("验证失败");
    });
  });

  // =========================================================================
  // DELETE
  // =========================================================================

  describe("DELETE /api/admin/categories", () => {
    it("should delete category without products", async () => {
      setupAdmin();
      mockProductCount.mockResolvedValue(0);
      mockCategoryFindUnique.mockResolvedValue({ id: "cat-1", name: "Games" });
      mockCategoryDelete.mockResolvedValue({ id: "cat-1" });

      const response = await DELETE(createDeleteRequest("cat-1"));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe("分类已删除");
      expect(mockCategoryDelete).toHaveBeenCalledWith({ where: { id: "cat-1" } });
    });

    it("should return 400 when category has products", async () => {
      setupAdmin();
      mockProductCount.mockResolvedValue(3);

      const response = await DELETE(createDeleteRequest("cat-1"));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toContain("3 个商品");
    });

    it("should return 400 when id is missing", async () => {
      setupAdmin();

      const response = await DELETE(createDeleteRequest());
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toBe("缺少分类ID");
    });
  });
});
