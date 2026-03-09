import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mocks declared before imports
const mockProductFindMany = vi.fn();
const mockProductFindUnique = vi.fn();
const mockProductFindFirst = vi.fn();
const mockProductCreate = vi.fn();
const mockProductUpdate = vi.fn();
const mockProductCount = vi.fn();
const mockCategoryFindUnique = vi.fn();
const mockCardKeyGroupBy = vi.fn();

vi.mock("@/server/db", () => ({
  db: {
    product: {
      findMany: (...args: unknown[]) => mockProductFindMany(...args),
      findUnique: (...args: unknown[]) => mockProductFindUnique(...args),
      findFirst: (...args: unknown[]) => mockProductFindFirst(...args),
      create: (...args: unknown[]) => mockProductCreate(...args),
      update: (...args: unknown[]) => mockProductUpdate(...args),
      count: (...args: unknown[]) => mockProductCount(...args),
    },
    category: {
      findUnique: (...args: unknown[]) => mockCategoryFindUnique(...args),
    },
    cardKey: {
      groupBy: (...args: unknown[]) => mockCardKeyGroupBy(...args),
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

let mockAdminSession: { id: string; role: string } | null = { id: "admin-1", role: "ADMIN" };
vi.mock("@/lib/admin-auth", () => ({
  getAdminSession: () => {
    if (!mockAdminSession) {
      const { NextResponse } = require("next/server");
      return { session: null, error: NextResponse.json({ success: false }, { status: 401 }) };
    }
    if (mockAdminSession.role !== "ADMIN") {
      const { NextResponse } = require("next/server");
      return { session: null, error: NextResponse.json({ success: false }, { status: 403 }) };
    }
    return { session: mockAdminSession, error: null };
  },
}));

vi.mock("@/lib/validators", () => ({
  createProductSchema: {
    safeParse: (data: Record<string, unknown>) => {
      if (!data.name || !data.price || !data.categoryId) {
        return { success: false, error: { issues: [{ message: "必填字段缺失" }] } };
      }
      return { success: true, data };
    },
  },
  updateProductSchema: {
    safeParse: (data: Record<string, unknown>) => ({ success: true, data }),
  },
  formatZodError: (err: { issues: Array<{ message: string }> }) => err.issues[0]?.message ?? "验证错误",
}));

vi.mock("@/lib/utils", () => ({
  slugify: (s: string) => s.toLowerCase().replace(/\s+/g, "-"),
}));

vi.mock("@/lib/pagination", () => ({
  parsePagination: (_sp: URLSearchParams, opts: { pageSize: number }) => ({
    page: Number(_sp.get("page")) || 1,
    pageSize: opts.pageSize,
  }),
  paginationMeta: (total: number, page: number, pageSize: number) => ({
    total, page, pageSize, totalPages: Math.ceil(total / pageSize),
  }),
}));

// Import route AFTER mocks
const { GET, POST, PUT, DELETE, PATCH } = await import(
  "@/app/api/admin/products/route"
);

// Helper: build a mock product object
function buildMockProduct(overrides: Record<string, unknown> = {}) {
  const now = new Date();
  return {
    id: "p1",
    name: "Test Product",
    slug: "test-product",
    description: "desc",
    price: 99.99,
    originalPrice: 199.99,
    categoryId: "cat1",
    category: { id: "cat1", name: "Cat", slug: "cat" },
    image: null,
    images: [],
    tags: [],
    stockCount: 10,
    soldCount: 5,
    viewCount: 100,
    isActive: true,
    sortOrder: 0,
    deliveryType: "AUTO",
    afterSaleHours: 24,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("Admin Products API — /api/admin/products", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdminSession = { id: "admin-1", role: "ADMIN" };
  });

  // ──────────────────────────── GET ────────────────────────────

  describe("GET", () => {
    it("1. returns products list with pagination", async () => {
      const product = buildMockProduct();
      mockProductFindMany.mockResolvedValue([product]);
      mockProductCount.mockResolvedValue(1);

      const req = new NextRequest("http://localhost/api/admin/products");
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.products).toHaveLength(1);
      expect(json.products[0].id).toBe("p1");
      expect(json.products[0].price).toBe(99.99);
      expect(json.pagination).toEqual({
        total: 1,
        page: 1,
        pageSize: 50,
        totalPages: 1,
      });
    });

    it("2. filters by search query", async () => {
      mockProductFindMany.mockResolvedValue([]);
      mockProductCount.mockResolvedValue(0);

      const req = new NextRequest("http://localhost/api/admin/products?search=widget");
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.products).toHaveLength(0);

      // Verify the where clause included the OR search filter
      const findManyCall = mockProductFindMany.mock.calls[0][0];
      expect(findManyCall.where.OR).toBeDefined();
      expect(findManyCall.where.OR).toHaveLength(3);
      expect(findManyCall.where.OR[0]).toEqual({
        name: { contains: "widget", mode: "insensitive" },
      });
    });

    it("3. returns 401 when not authenticated", async () => {
      mockAdminSession = null;

      const req = new NextRequest("http://localhost/api/admin/products");
      const res = await GET(req);

      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.success).toBe(false);
    });

    it("4. returns 403 when not admin role", async () => {
      mockAdminSession = { id: "user-1", role: "USER" };

      const req = new NextRequest("http://localhost/api/admin/products");
      const res = await GET(req);

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.success).toBe(false);
    });
  });

  // ──────────────────────────── POST ────────────────────────────

  describe("POST", () => {
    it("5. creates product successfully", async () => {
      const created = buildMockProduct();
      mockCategoryFindUnique.mockResolvedValue({ id: "cat1", name: "Cat" });
      mockProductFindUnique.mockResolvedValue(null); // slug not taken
      mockProductFindFirst.mockResolvedValue(null);  // no duplicate name
      mockProductCreate.mockResolvedValue(created);

      const req = new NextRequest("http://localhost/api/admin/products", {
        method: "POST",
        body: JSON.stringify({
          name: "Test Product",
          price: 99.99,
          categoryId: "cat1",
          description: "desc",
        }),
      });

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.product.name).toBe("Test Product");
      expect(json.product.price).toBe(99.99);
      expect(json.warning).toBeUndefined();
    });

    it("6. returns 400 on validation error (missing name)", async () => {
      const req = new NextRequest("http://localhost/api/admin/products", {
        method: "POST",
        body: JSON.stringify({ price: 99.99 }),
      });

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message).toBe("必填字段缺失");
    });

    it("7. returns 400 when category doesn't exist", async () => {
      mockCategoryFindUnique.mockResolvedValue(null);

      const req = new NextRequest("http://localhost/api/admin/products", {
        method: "POST",
        body: JSON.stringify({
          name: "Test Product",
          price: 99.99,
          categoryId: "nonexistent",
        }),
      });

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message).toBe("分类不存在");
    });

    it("8. returns 409 when slug already exists", async () => {
      mockCategoryFindUnique.mockResolvedValue({ id: "cat1", name: "Cat" });
      // slug check returns an existing product
      mockProductFindUnique.mockResolvedValue({ id: "existing", slug: "test-product" });
      mockProductFindFirst.mockResolvedValue(null);

      const req = new NextRequest("http://localhost/api/admin/products", {
        method: "POST",
        body: JSON.stringify({
          name: "Test Product",
          price: 99.99,
          categoryId: "cat1",
        }),
      });

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(409);
      expect(json.success).toBe(false);
      expect(json.message).toContain("slug 已存在");
    });

    it("9. includes warning for duplicate name", async () => {
      const created = buildMockProduct();
      mockCategoryFindUnique.mockResolvedValue({ id: "cat1", name: "Cat" });
      mockProductFindUnique.mockResolvedValue(null); // slug free
      mockProductFindFirst.mockResolvedValue({ id: "old-p1", name: "Test Product" }); // duplicate name
      mockProductCreate.mockResolvedValue(created);

      const req = new NextRequest("http://localhost/api/admin/products", {
        method: "POST",
        body: JSON.stringify({
          name: "Test Product",
          price: 99.99,
          categoryId: "cat1",
          description: "desc",
        }),
      });

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.warning).toBeDefined();
      expect(json.warning).toContain("已存在同名商品");
      expect(json.warning).toContain("old-p1");
    });

    it("10. handles product duplication with ?duplicateId=", async () => {
      const source = buildMockProduct({ id: "source-1", name: "Original" });
      const duplicated = buildMockProduct({
        id: "dup-1",
        name: "Original (副本)",
        slug: "original-(副本)-abc123",
        isActive: false,
        stockCount: 0,
        soldCount: 0,
      });

      // First findUnique is for the source product in handleDuplicate
      mockProductFindUnique.mockResolvedValue(source);
      mockProductCreate.mockResolvedValue(duplicated);

      const req = new NextRequest(
        "http://localhost/api/admin/products?duplicateId=source-1",
        {
          method: "POST",
          body: JSON.stringify({}),
        }
      );

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.message).toContain("商品已复制");
      expect(json.product.isActive).toBe(false);
      expect(json.product.stockCount).toBe(0);
    });
  });

  // ──────────────────────────── PUT ────────────────────────────

  describe("PUT", () => {
    it("11. updates product successfully", async () => {
      const existing = buildMockProduct();
      const updated = buildMockProduct({ name: "Updated Product" });

      mockProductFindUnique.mockResolvedValue(existing);
      mockProductUpdate.mockResolvedValue(updated);

      const req = new NextRequest("http://localhost/api/admin/products?id=p1", {
        method: "PUT",
        body: JSON.stringify({ name: "Updated Product" }),
      });

      const res = await PUT(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.product.name).toBe("Updated Product");
    });

    it("12. returns 400 when id param missing", async () => {
      const req = new NextRequest("http://localhost/api/admin/products", {
        method: "PUT",
        body: JSON.stringify({ name: "Updated Product" }),
      });

      const res = await PUT(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message).toBe("缺少商品ID参数");
    });

    it("13. returns 404 when product not found", async () => {
      mockProductFindUnique.mockResolvedValue(null);

      const req = new NextRequest("http://localhost/api/admin/products?id=nonexistent", {
        method: "PUT",
        body: JSON.stringify({ name: "Updated Product" }),
      });

      const res = await PUT(req);
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.success).toBe(false);
      expect(json.message).toBe("商品不存在");
    });

    it("14. returns 409 when new slug already exists", async () => {
      const existing = buildMockProduct({ slug: "old-slug" });
      mockProductFindUnique
        .mockResolvedValueOnce(existing)         // first call: find product by id
        .mockResolvedValueOnce({ id: "other" }); // second call: slug uniqueness check

      const req = new NextRequest("http://localhost/api/admin/products?id=p1", {
        method: "PUT",
        body: JSON.stringify({ slug: "taken-slug" }),
      });

      const res = await PUT(req);
      const json = await res.json();

      expect(res.status).toBe(409);
      expect(json.success).toBe(false);
      expect(json.message).toContain("slug 已存在");
    });
  });

  // ──────────────────────────── DELETE ────────────────────────────

  describe("DELETE", () => {
    it("15. soft deletes product (sets isActive=false)", async () => {
      const existing = buildMockProduct();
      mockProductFindUnique.mockResolvedValue(existing);
      mockProductUpdate.mockResolvedValue({ ...existing, isActive: false });

      const req = new NextRequest("http://localhost/api/admin/products?id=p1", {
        method: "DELETE",
      });

      const res = await DELETE(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.message).toBe("商品已下架");

      // Verify update was called with isActive: false
      expect(mockProductUpdate).toHaveBeenCalledWith({
        where: { id: "p1" },
        data: { isActive: false },
      });
    });

    it("16. returns 400 when id param missing", async () => {
      const req = new NextRequest("http://localhost/api/admin/products", {
        method: "DELETE",
      });

      const res = await DELETE(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message).toBe("缺少商品ID参数");
    });

    it("17. returns 404 when product not found", async () => {
      mockProductFindUnique.mockResolvedValue(null);

      const req = new NextRequest("http://localhost/api/admin/products?id=nonexistent", {
        method: "DELETE",
      });

      const res = await DELETE(req);
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.success).toBe(false);
      expect(json.message).toBe("商品不存在");
    });
  });

  // ──────────────────────────── PATCH ────────────────────────────

  describe("PATCH", () => {
    it("18. reconciles stock counts successfully", async () => {
      const products = [
        { id: "p1", name: "Product A", stockCount: 10 },
        { id: "p2", name: "Product B", stockCount: 5 },
      ];
      const availableCounts = [
        { productId: "p1", _count: { id: 8 } },
        { productId: "p2", _count: { id: 5 } },
      ];

      mockProductFindMany.mockResolvedValue(products);
      mockCardKeyGroupBy.mockResolvedValue(availableCounts);
      mockProductUpdate.mockResolvedValue({});

      const req = new NextRequest("http://localhost/api/admin/products", {
        method: "PATCH",
        body: JSON.stringify({ action: "reconcile-stock" }),
      });

      const res = await PATCH(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.fixedCount).toBe(1);
      expect(json.fixes).toHaveLength(1);
      expect(json.fixes[0]).toEqual({
        name: "Product A",
        oldStock: 10,
        newStock: 8,
      });
      // Product B had matching count so no update call for it
      expect(mockProductUpdate).toHaveBeenCalledTimes(1);
      expect(mockProductUpdate).toHaveBeenCalledWith({
        where: { id: "p1" },
        data: { stockCount: 8 },
      });
    });

    it("19. returns 'no fixes needed' when all counts match", async () => {
      const products = [
        { id: "p1", name: "Product A", stockCount: 10 },
      ];
      const availableCounts = [
        { productId: "p1", _count: { id: 10 } },
      ];

      mockProductFindMany.mockResolvedValue(products);
      mockCardKeyGroupBy.mockResolvedValue(availableCounts);

      const req = new NextRequest("http://localhost/api/admin/products", {
        method: "PATCH",
        body: JSON.stringify({ action: "reconcile-stock" }),
      });

      const res = await PATCH(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.fixedCount).toBe(0);
      expect(json.message).toContain("无需修复");
      expect(json.fixes).toHaveLength(0);
      expect(mockProductUpdate).not.toHaveBeenCalled();
    });

    it("20. returns 400 for invalid action", async () => {
      const req = new NextRequest("http://localhost/api/admin/products", {
        method: "PATCH",
        body: JSON.stringify({ action: "invalid-action" }),
      });

      const res = await PATCH(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message).toBe("无效操作");
    });
  });
});
