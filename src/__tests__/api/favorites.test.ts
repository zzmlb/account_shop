import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockFavoriteFindMany = vi.fn();
const mockFavoriteFindUnique = vi.fn();
const mockFavoriteCreate = vi.fn();
const mockFavoriteDeleteMany = vi.fn();

vi.mock("@/server/db", () => ({
  db: {
    favorite: {
      findMany: (...args: unknown[]) => mockFavoriteFindMany(...args),
      findUnique: (...args: unknown[]) => mockFavoriteFindUnique(...args),
      create: (...args: unknown[]) => mockFavoriteCreate(...args),
      deleteMany: (...args: unknown[]) => mockFavoriteDeleteMany(...args),
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
}));

vi.mock("@/lib/validators", () => ({
  favoriteSchema: {
    safeParse: (data: Record<string, unknown>) => {
      if (!data.productId) {
        return { success: false, error: { issues: [{ message: "商品ID不能为空" }] } };
      }
      return { success: true, data };
    },
  },
  formatZodError: (err: { issues: Array<{ message: string }> }) => err.issues[0]?.message ?? "验证错误",
}));

const { GET, POST, DELETE: DEL } = await import("@/app/api/favorites/route");

describe("Favorites API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserSession = { id: "user-1", role: "USER" };
  });

  // ─── GET ────────────────────────────────────────────────────────────

  describe("GET /api/favorites", () => {
    it("returns favorites list with product details", async () => {
      const mockFavorites = [
        {
          id: "fav1",
          createdAt: new Date("2026-03-01T10:00:00Z"),
          product: {
            id: "p1",
            name: "Product 1",
            slug: "product-1",
            price: 99.99,
            originalPrice: 199.99,
            stockCount: 10,
            soldCount: 5,
            image: "/img.jpg",
            category: { name: "Category 1" },
          },
        },
      ];
      mockFavoriteFindMany.mockResolvedValue(mockFavorites);

      const req = new NextRequest("http://localhost/api/favorites");
      const res = await GET(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.favorites).toHaveLength(1);

      const fav = body.favorites[0];
      expect(fav.id).toBe("fav1");
      expect(fav.createdAt).toBe("2026-03-01T10:00:00.000Z");
      expect(fav.product.id).toBe("p1");
      expect(fav.product.name).toBe("Product 1");
      expect(fav.product.slug).toBe("product-1");
      expect(fav.product.price).toBe(99.99);
      expect(fav.product.originalPrice).toBe(199.99);
      expect(fav.product.stockCount).toBe(10);
      expect(fav.product.soldCount).toBe(5);
      expect(fav.product.image).toBe("/img.jpg");
      expect(fav.product.categoryName).toBe("Category 1");

      expect(mockFavoriteFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: "user-1" },
          orderBy: { createdAt: "desc" },
        })
      );
    });

    it("returns empty list when no favorites", async () => {
      mockFavoriteFindMany.mockResolvedValue([]);

      const req = new NextRequest("http://localhost/api/favorites");
      const res = await GET(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.favorites).toEqual([]);
    });

    it("returns 401 when not authenticated", async () => {
      mockUserSession = null;

      const req = new NextRequest("http://localhost/api/favorites");
      const res = await GET(req);
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.success).toBe(false);
      expect(mockFavoriteFindMany).not.toHaveBeenCalled();
    });
  });

  // ─── POST ───────────────────────────────────────────────────────────

  describe("POST /api/favorites", () => {
    it("adds favorite successfully", async () => {
      mockFavoriteFindUnique.mockResolvedValue(null);
      mockFavoriteCreate.mockResolvedValue({ id: "fav-new", userId: "user-1", productId: "p1" });

      const req = new NextRequest("http://localhost/api/favorites", {
        method: "POST",
        body: JSON.stringify({ productId: "p1" }),
        headers: { "Content-Type": "application/json" },
      });
      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(mockFavoriteFindUnique).toHaveBeenCalledWith({
        where: { userId_productId: { userId: "user-1", productId: "p1" } },
      });
      expect(mockFavoriteCreate).toHaveBeenCalledWith({
        data: { userId: "user-1", productId: "p1" },
      });
    });

    it("returns success silently when already favorited", async () => {
      mockFavoriteFindUnique.mockResolvedValue({ id: "fav-existing", userId: "user-1", productId: "p1" });

      const req = new NextRequest("http://localhost/api/favorites", {
        method: "POST",
        body: JSON.stringify({ productId: "p1" }),
        headers: { "Content-Type": "application/json" },
      });
      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(mockFavoriteCreate).not.toHaveBeenCalled();
    });

    it("returns 400 on validation error when productId is missing", async () => {
      const req = new NextRequest("http://localhost/api/favorites", {
        method: "POST",
        body: JSON.stringify({}),
        headers: { "Content-Type": "application/json" },
      });
      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.message).toBe("商品ID不能为空");
      expect(mockFavoriteFindUnique).not.toHaveBeenCalled();
      expect(mockFavoriteCreate).not.toHaveBeenCalled();
    });

    it("returns 401 when not authenticated", async () => {
      mockUserSession = null;

      const req = new NextRequest("http://localhost/api/favorites", {
        method: "POST",
        body: JSON.stringify({ productId: "p1" }),
        headers: { "Content-Type": "application/json" },
      });
      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.success).toBe(false);
      expect(mockFavoriteFindUnique).not.toHaveBeenCalled();
      expect(mockFavoriteCreate).not.toHaveBeenCalled();
    });
  });

  // ─── DELETE ─────────────────────────────────────────────────────────

  describe("DELETE /api/favorites", () => {
    it("removes favorite successfully", async () => {
      mockFavoriteDeleteMany.mockResolvedValue({ count: 1 });

      const req = new NextRequest("http://localhost/api/favorites?productId=p1", {
        method: "DELETE",
      });
      const res = await DEL(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(mockFavoriteDeleteMany).toHaveBeenCalledWith({
        where: { userId: "user-1", productId: "p1" },
      });
    });

    it("returns 400 when productId query param is missing", async () => {
      const req = new NextRequest("http://localhost/api/favorites", {
        method: "DELETE",
      });
      const res = await DEL(req);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.success).toBe(false);
      expect(body.message).toBe("缺少商品ID");
      expect(mockFavoriteDeleteMany).not.toHaveBeenCalled();
    });

    it("returns 401 when not authenticated", async () => {
      mockUserSession = null;

      const req = new NextRequest("http://localhost/api/favorites?productId=p1", {
        method: "DELETE",
      });
      const res = await DEL(req);
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.success).toBe(false);
      expect(mockFavoriteDeleteMany).not.toHaveBeenCalled();
    });
  });

  // ─── Error Handling ─────────────────────────────────────────────────

  describe("Error handling", () => {
    it("GET returns 500 on unexpected database error", async () => {
      mockFavoriteFindMany.mockRejectedValue(new Error("DB connection failed"));

      const req = new NextRequest("http://localhost/api/favorites");
      const res = await GET(req);
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.success).toBe(false);
      expect(body.message).toBe("服务器内部错误");
    });

    it("POST returns 500 on unexpected database error", async () => {
      mockFavoriteFindUnique.mockRejectedValue(new Error("DB connection failed"));

      const req = new NextRequest("http://localhost/api/favorites", {
        method: "POST",
        body: JSON.stringify({ productId: "p1" }),
        headers: { "Content-Type": "application/json" },
      });
      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.success).toBe(false);
      expect(body.message).toBe("服务器内部错误");
    });
  });
});
