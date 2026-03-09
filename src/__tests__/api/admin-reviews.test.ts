import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockReviewFindMany = vi.fn();
const mockReviewFindUnique = vi.fn();
const mockReviewCount = vi.fn();
const mockReviewUpdate = vi.fn();
const mockReviewUpdateMany = vi.fn();
const mockReviewDelete = vi.fn();

vi.mock("@/server/db", () => ({
  db: {
    review: {
      findMany: (...args: unknown[]) => mockReviewFindMany(...args),
      findUnique: (...args: unknown[]) => mockReviewFindUnique(...args),
      count: (...args: unknown[]) => mockReviewCount(...args),
      update: (...args: unknown[]) => mockReviewUpdate(...args),
      updateMany: (...args: unknown[]) => mockReviewUpdateMany(...args),
      delete: (...args: unknown[]) => mockReviewDelete(...args),
    },
  },
}));

const mockGetAdminSession = vi.fn();

vi.mock("@/lib/admin-auth", () => ({
  getAdminSession: (...args: unknown[]) => mockGetAdminSession(...args),
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

vi.mock("@/lib/sanitize", () => ({
  stripHtml: (s: string) => s.replace(/<[^>]*>/g, ""),
}));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

const { GET, PUT, PATCH, POST, DELETE } = await import("@/app/api/admin/reviews/route");

function setupAdmin() {
  mockGetAdminSession.mockReturnValue({
    session: { id: "admin-1", username: "admin", role: "ADMIN" },
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

const now = new Date("2026-03-01T10:00:00Z");

const mockReview = {
  id: "rev-1",
  rating: 5,
  content: "Great product!",
  adminReply: null,
  repliedAt: null,
  isVisible: true,
  createdAt: now,
  user: { id: "user-1", username: "testuser" },
  product: { id: "prod-1", name: "Test Product", slug: "test-product" },
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Admin Reviews API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // GET
  // =========================================================================

  describe("GET /api/admin/reviews", () => {
    it("returns reviews list with pagination", async () => {
      setupAdmin();
      mockReviewFindMany.mockResolvedValue([mockReview]);
      mockReviewCount.mockResolvedValue(1);

      const req = new NextRequest("http://localhost/api/admin/reviews", { method: "GET" });
      const res = await GET(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.reviews).toHaveLength(1);
      expect(data.reviews[0]).toMatchObject({
        id: "rev-1",
        rating: 5,
        content: "Great product!",
        isVisible: true,
      });
      expect(data.total).toBe(1);
    });

    it("returns 401 when not authenticated", async () => {
      setupUnauth();

      const req = new NextRequest("http://localhost/api/admin/reviews", { method: "GET" });
      const res = await GET(req);
      expect(res.status).toBe(401);
    });
  });

  // =========================================================================
  // PUT - Toggle visibility
  // =========================================================================

  describe("PUT /api/admin/reviews", () => {
    it("toggles review visibility", async () => {
      setupAdmin();
      mockReviewFindUnique.mockResolvedValue({ ...mockReview, isVisible: true });
      mockReviewUpdate.mockResolvedValue({ isVisible: false });

      const req = new NextRequest("http://localhost/api/admin/reviews?id=rev-1", { method: "PUT" });
      const res = await PUT(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockReviewUpdate).toHaveBeenCalledWith({
        where: { id: "rev-1" },
        data: { isVisible: false },
      });
    });

    it("returns 400 when id is missing", async () => {
      setupAdmin();

      const req = new NextRequest("http://localhost/api/admin/reviews", { method: "PUT" });
      const res = await PUT(req);
      expect(res.status).toBe(400);
    });

    it("returns 404 when review not found", async () => {
      setupAdmin();
      mockReviewFindUnique.mockResolvedValue(null);

      const req = new NextRequest("http://localhost/api/admin/reviews?id=nonexistent", { method: "PUT" });
      const res = await PUT(req);
      expect(res.status).toBe(404);
    });
  });

  // =========================================================================
  // PATCH - Reply to review
  // =========================================================================

  describe("PATCH /api/admin/reviews", () => {
    it("saves admin reply", async () => {
      setupAdmin();
      mockReviewFindUnique.mockResolvedValue(mockReview);
      mockReviewUpdate.mockResolvedValue({
        adminReply: "Thank you!",
        repliedAt: now,
      });

      const req = new NextRequest("http://localhost/api/admin/reviews", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: "rev-1", reply: "Thank you!" }),
      });
      const res = await PATCH(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain("保存");
    });

    it("returns 400 when id is missing", async () => {
      setupAdmin();

      const req = new NextRequest("http://localhost/api/admin/reviews", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reply: "test" }),
      });
      const res = await PATCH(req);
      expect(res.status).toBe(400);
    });

    it("returns 400 when reply is not a string", async () => {
      setupAdmin();

      const req = new NextRequest("http://localhost/api/admin/reviews", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: "rev-1", reply: 123 }),
      });
      const res = await PATCH(req);
      expect(res.status).toBe(400);
    });

    it("returns 404 when review not found", async () => {
      setupAdmin();
      mockReviewFindUnique.mockResolvedValue(null);

      const req = new NextRequest("http://localhost/api/admin/reviews", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: "nonexistent", reply: "test" }),
      });
      const res = await PATCH(req);
      expect(res.status).toBe(404);
    });
  });

  // =========================================================================
  // POST - Batch toggle visibility
  // =========================================================================

  describe("POST /api/admin/reviews", () => {
    it("batch toggles visibility", async () => {
      setupAdmin();
      mockReviewUpdateMany.mockResolvedValue({ count: 3 });

      const req = new NextRequest("http://localhost/api/admin/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: ["r1", "r2", "r3"], visible: false }),
      });
      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.affected).toBe(3);
    });

    it("returns 400 when ids is empty", async () => {
      setupAdmin();

      const req = new NextRequest("http://localhost/api/admin/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [], visible: true }),
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("returns 400 when visible is not boolean", async () => {
      setupAdmin();

      const req = new NextRequest("http://localhost/api/admin/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: ["r1"], visible: "yes" }),
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });
  });

  // =========================================================================
  // DELETE
  // =========================================================================

  describe("DELETE /api/admin/reviews", () => {
    it("deletes a review", async () => {
      setupAdmin();
      mockReviewFindUnique.mockResolvedValue(mockReview);
      mockReviewDelete.mockResolvedValue({});

      const req = new NextRequest("http://localhost/api/admin/reviews?id=rev-1", { method: "DELETE" });
      const res = await DELETE(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain("删除");
    });

    it("returns 400 when id is missing", async () => {
      setupAdmin();

      const req = new NextRequest("http://localhost/api/admin/reviews", { method: "DELETE" });
      const res = await DELETE(req);
      expect(res.status).toBe(400);
    });

    it("returns 404 when review not found", async () => {
      setupAdmin();
      mockReviewFindUnique.mockResolvedValue(null);

      const req = new NextRequest("http://localhost/api/admin/reviews?id=nonexistent", { method: "DELETE" });
      const res = await DELETE(req);
      expect(res.status).toBe(404);
    });
  });
});
