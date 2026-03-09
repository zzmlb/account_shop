import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mock functions declared before vi.mock ──────────────────────────────
const mockCardKeyFindMany = vi.fn();
const mockCardKeyCount = vi.fn();
const mockCardKeyFindUnique = vi.fn();
const mockCardKeyCreate = vi.fn();
const mockCardKeyCreateMany = vi.fn();
const mockCardKeyUpdate = vi.fn();
const mockCardKeyUpdateMany = vi.fn();
const mockCardKeyDelete = vi.fn();
const mockCardKeyDeleteMany = vi.fn();

const mockProductFindUnique = vi.fn();
const mockProductUpdate = vi.fn();

const mock$transaction = vi.fn().mockImplementation(async (fn) =>
  fn({
    cardKey: { deleteMany: mockCardKeyDeleteMany },
    product: { update: mockProductUpdate },
  })
);

vi.mock("@/server/db", () => ({
  db: {
    cardKey: {
      findMany: (...args: unknown[]) => mockCardKeyFindMany(...args),
      count: (...args: unknown[]) => mockCardKeyCount(...args),
      findUnique: (...args: unknown[]) => mockCardKeyFindUnique(...args),
      create: (...args: unknown[]) => mockCardKeyCreate(...args),
      createMany: (...args: unknown[]) => mockCardKeyCreateMany(...args),
      update: (...args: unknown[]) => mockCardKeyUpdate(...args),
      updateMany: (...args: unknown[]) => mockCardKeyUpdateMany(...args),
      delete: (...args: unknown[]) => mockCardKeyDelete(...args),
      deleteMany: (...args: unknown[]) => mockCardKeyDeleteMany(...args),
    },
    product: {
      findUnique: (...args: unknown[]) => mockProductFindUnique(...args),
      update: (...args: unknown[]) => mockProductUpdate(...args),
    },
    $transaction: (...args: unknown[]) => mock$transaction(...args),
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

vi.mock("@/lib/crypto", () => ({
  encryptCardKey: (v: string) => `enc_${v}`,
  decryptCardKey: (v: string) => v.replace(/^enc_/, ""),
}));

let mockAdminSession: { id: string; role: string } | null = {
  id: "admin-1",
  role: "ADMIN",
};
vi.mock("@/lib/admin-auth", () => ({
  getAdminSession: () => {
    if (!mockAdminSession) {
      const { NextResponse } = require("next/server");
      return {
        session: null,
        error: NextResponse.json(
          { success: false, message: "未登录" },
          { status: 401 }
        ),
      };
    }
    if (mockAdminSession.role !== "ADMIN") {
      const { NextResponse } = require("next/server");
      return {
        session: null,
        error: NextResponse.json(
          { success: false, message: "无权限" },
          { status: 403 }
        ),
      };
    }
    return { session: mockAdminSession, error: null };
  },
}));

vi.mock("@/lib/pagination", () => ({
  parsePagination: (
    _sp: URLSearchParams,
    opts: { pageSize: number }
  ) => ({
    page: Number(_sp.get("page")) || 1,
    pageSize: opts.pageSize,
  }),
  paginationMeta: (total: number, page: number, pageSize: number) => ({
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }),
}));

// ── Import route AFTER mocks ────────────────────────────────────────────
const { GET, POST, PUT, PATCH, DELETE: DELETE_HANDLER } = await import(
  "@/app/api/admin/card-keys/route"
);

// ── Shared mock data ────────────────────────────────────────────────────
const now = new Date("2026-03-08T10:00:00Z");

const mockCardKey = {
  id: "ck-1",
  content: "enc_KEY-001",
  productId: "prod-1",
  status: "AVAILABLE",
  orderId: null,
  soldAt: null,
  createdAt: now,
  product: { name: "Test Product", slug: "test-product" },
  orderItem: null,
};

describe("Admin Card-Keys API — /api/admin/card-keys", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdminSession = { id: "admin-1", role: "ADMIN" };
  });

  // ──────────────────────────── GET ────────────────────────────

  describe("GET", () => {
    it("1. lists card keys with decrypted content", async () => {
      mockCardKeyFindMany.mockResolvedValue([mockCardKey]);
      mockCardKeyCount.mockResolvedValue(1);

      const req = new NextRequest("http://localhost/api/admin/card-keys");
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.cardKeys).toHaveLength(1);
      expect(json.cardKeys[0].id).toBe("ck-1");
      // Content should be decrypted (enc_ prefix removed)
      expect(json.cardKeys[0].content).toBe("KEY-001");
      expect(json.cardKeys[0].product.name).toBe("Test Product");
      expect(json.pagination).toEqual({
        total: 1,
        page: 1,
        pageSize: 50,
        totalPages: 1,
      });
    });

    it("2. returns 401 when not authenticated", async () => {
      mockAdminSession = null;

      const req = new NextRequest("http://localhost/api/admin/card-keys");
      const res = await GET(req);

      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.success).toBe(false);
    });

    it("3. filters by productId", async () => {
      mockCardKeyFindMany.mockResolvedValue([]);
      mockCardKeyCount.mockResolvedValue(0);

      const req = new NextRequest(
        "http://localhost/api/admin/card-keys?productId=prod-1"
      );
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);

      const call = mockCardKeyFindMany.mock.calls[0][0];
      expect(call.where.productId).toBe("prod-1");
    });

    it("4. filters by status", async () => {
      mockCardKeyFindMany.mockResolvedValue([]);
      mockCardKeyCount.mockResolvedValue(0);

      const req = new NextRequest(
        "http://localhost/api/admin/card-keys?status=sold"
      );
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);

      const call = mockCardKeyFindMany.mock.calls[0][0];
      expect(call.where.status).toBe("SOLD");
    });

    it("5. filters by search keyword", async () => {
      mockCardKeyFindMany.mockResolvedValue([]);
      mockCardKeyCount.mockResolvedValue(0);

      const req = new NextRequest(
        "http://localhost/api/admin/card-keys?search=KEY"
      );
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);

      const call = mockCardKeyFindMany.mock.calls[0][0];
      expect(call.where.content).toEqual({
        contains: "KEY",
        mode: "insensitive",
      });
    });

    it("6. returns 500 on unexpected error", async () => {
      mockCardKeyFindMany.mockRejectedValue(new Error("DB failure"));

      const req = new NextRequest("http://localhost/api/admin/card-keys");
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.success).toBe(false);
      expect(json.message).toBe("服务器内部错误");
    });
  });

  // ──────────────────────────── POST ────────────────────────────

  describe("POST", () => {
    it("7. bulk imports card keys successfully", async () => {
      mockProductFindUnique.mockResolvedValue({
        id: "prod-1",
        name: "Test Product",
      });
      mockCardKeyFindMany.mockResolvedValue([]); // no existing keys
      mockCardKeyCreateMany.mockResolvedValue({ count: 3 });
      mockProductUpdate.mockResolvedValue({});

      const req = new NextRequest("http://localhost/api/admin/card-keys", {
        method: "POST",
        body: JSON.stringify({
          productId: "prod-1",
          keys: ["KEY-001", "KEY-002", "KEY-003"],
        }),
      });

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.count).toBe(3);
      expect(json.duplicates.batch).toBe(0);
      expect(json.duplicates.existing).toBe(0);

      // Verify createMany was called with encrypted keys
      const createCall = mockCardKeyCreateMany.mock.calls[0][0];
      expect(createCall.data).toHaveLength(3);
      expect(createCall.data[0].content).toBe("enc_KEY-001");
      expect(createCall.data[0].status).toBe("AVAILABLE");

      // Verify stock increment
      expect(mockProductUpdate).toHaveBeenCalledWith({
        where: { id: "prod-1" },
        data: { stockCount: { increment: 3 } },
      });
    });

    it("8. deduplicates within batch", async () => {
      mockProductFindUnique.mockResolvedValue({
        id: "prod-1",
        name: "Test Product",
      });
      mockCardKeyFindMany.mockResolvedValue([]);
      mockCardKeyCreateMany.mockResolvedValue({ count: 2 });
      mockProductUpdate.mockResolvedValue({});

      const req = new NextRequest("http://localhost/api/admin/card-keys", {
        method: "POST",
        body: JSON.stringify({
          productId: "prod-1",
          keys: ["KEY-001", "KEY-001", "KEY-002"],
        }),
      });

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.count).toBe(2);
      expect(json.duplicates.batch).toBe(1);
    });

    it("9. skips keys that already exist in DB", async () => {
      mockProductFindUnique.mockResolvedValue({
        id: "prod-1",
        name: "Test Product",
      });
      // Simulate enc_KEY-001 already exists in DB
      mockCardKeyFindMany.mockResolvedValue([{ content: "enc_KEY-001" }]);
      mockCardKeyCreateMany.mockResolvedValue({ count: 1 });
      mockProductUpdate.mockResolvedValue({});

      const req = new NextRequest("http://localhost/api/admin/card-keys", {
        method: "POST",
        body: JSON.stringify({
          productId: "prod-1",
          keys: ["KEY-001", "KEY-002"],
        }),
      });

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.count).toBe(1);
      expect(json.duplicates.existing).toBe(1);

      // Only KEY-002 should be inserted
      const createCall = mockCardKeyCreateMany.mock.calls[0][0];
      expect(createCall.data).toHaveLength(1);
      expect(createCall.data[0].content).toBe("enc_KEY-002");
    });

    it("10. returns 400 when productId is missing", async () => {
      const req = new NextRequest("http://localhost/api/admin/card-keys", {
        method: "POST",
        body: JSON.stringify({ keys: ["KEY-001"] }),
      });

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message).toContain("productId");
    });

    it("11. returns 400 when keys array is empty", async () => {
      const req = new NextRequest("http://localhost/api/admin/card-keys", {
        method: "POST",
        body: JSON.stringify({ productId: "prod-1", keys: [] }),
      });

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message).toContain("非空数组");
    });

    it("12. returns 400 when keys exceed 1000", async () => {
      const hugeKeys = Array.from({ length: 1001 }, (_, i) => `KEY-${i}`);

      const req = new NextRequest("http://localhost/api/admin/card-keys", {
        method: "POST",
        body: JSON.stringify({ productId: "prod-1", keys: hugeKeys }),
      });

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message).toContain("1000");
    });

    it("13. returns 404 when product not found", async () => {
      mockProductFindUnique.mockResolvedValue(null);

      const req = new NextRequest("http://localhost/api/admin/card-keys", {
        method: "POST",
        body: JSON.stringify({ productId: "nonexistent", keys: ["KEY-001"] }),
      });

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.success).toBe(false);
      expect(json.message).toBe("商品不存在");
    });

    it("14. returns success with count=0 when all keys are duplicates", async () => {
      mockProductFindUnique.mockResolvedValue({
        id: "prod-1",
        name: "Test Product",
      });
      mockCardKeyFindMany.mockResolvedValue([{ content: "enc_KEY-001" }]);

      const req = new NextRequest("http://localhost/api/admin/card-keys", {
        method: "POST",
        body: JSON.stringify({
          productId: "prod-1",
          keys: ["KEY-001"],
        }),
      });

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.count).toBe(0);
      expect(json.message).toContain("已存在");
      // createMany should NOT have been called
      expect(mockCardKeyCreateMany).not.toHaveBeenCalled();
    });
  });

  // ──────────────────────────── PUT ────────────────────────────

  describe("PUT", () => {
    it("15. updates card key status successfully", async () => {
      const existing = {
        id: "ck-1",
        content: "enc_KEY-001",
        status: "AVAILABLE",
        productId: "prod-1",
      };
      const updated = {
        ...mockCardKey,
        status: "DISABLED",
      };

      mockCardKeyFindUnique.mockResolvedValue(existing);
      mockCardKeyUpdate.mockResolvedValue(updated);

      const req = new NextRequest(
        "http://localhost/api/admin/card-keys?id=ck-1",
        {
          method: "PUT",
          body: JSON.stringify({ status: "DISABLED" }),
        }
      );

      const res = await PUT(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.cardKey.status).toBe("DISABLED");
      expect(json.cardKey.content).toBe("KEY-001");
    });

    it("16. returns 400 when id param is missing", async () => {
      const req = new NextRequest("http://localhost/api/admin/card-keys", {
        method: "PUT",
        body: JSON.stringify({ status: "DISABLED" }),
      });

      const res = await PUT(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message).toContain("卡密ID");
    });

    it("17. returns 404 when card key not found", async () => {
      mockCardKeyFindUnique.mockResolvedValue(null);

      const req = new NextRequest(
        "http://localhost/api/admin/card-keys?id=nonexistent",
        {
          method: "PUT",
          body: JSON.stringify({ status: "DISABLED" }),
        }
      );

      const res = await PUT(req);
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.success).toBe(false);
      expect(json.message).toBe("卡密不存在");
    });

    it("18. returns 400 when trying to change SOLD key status", async () => {
      mockCardKeyFindUnique.mockResolvedValue({
        id: "ck-sold",
        status: "SOLD",
        content: "enc_SOLD-KEY",
        productId: "prod-1",
      });

      const req = new NextRequest(
        "http://localhost/api/admin/card-keys?id=ck-sold",
        {
          method: "PUT",
          body: JSON.stringify({ status: "AVAILABLE" }),
        }
      );

      const res = await PUT(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message).toContain("已售出");
    });

    it("19. returns 400 for invalid status value", async () => {
      mockCardKeyFindUnique.mockResolvedValue({
        id: "ck-1",
        status: "AVAILABLE",
        content: "enc_KEY-001",
        productId: "prod-1",
      });

      const req = new NextRequest(
        "http://localhost/api/admin/card-keys?id=ck-1",
        {
          method: "PUT",
          body: JSON.stringify({ status: "INVALID" }),
        }
      );

      const res = await PUT(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message).toContain("AVAILABLE");
      expect(json.message).toContain("DISABLED");
    });
  });

  // ──────────────────────────── PATCH ────────────────────────────

  describe("PATCH", () => {
    it("20. batch enable (disabled -> available)", async () => {
      mockCardKeyFindMany.mockResolvedValue([
        { id: "ck-1", status: "DISABLED", productId: "prod-1" },
        { id: "ck-2", status: "DISABLED", productId: "prod-1" },
      ]);
      mockCardKeyUpdateMany.mockResolvedValue({ count: 2 });

      const req = new NextRequest("http://localhost/api/admin/card-keys", {
        method: "PATCH",
        body: JSON.stringify({ action: "enable", ids: ["ck-1", "ck-2"] }),
      });

      const res = await PATCH(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.count).toBe(2);
      expect(json.message).toContain("启用");
    });

    it("21. batch disable (available -> disabled)", async () => {
      mockCardKeyFindMany.mockResolvedValue([
        { id: "ck-1", status: "AVAILABLE", productId: "prod-1" },
      ]);
      mockCardKeyUpdateMany.mockResolvedValue({ count: 1 });

      const req = new NextRequest("http://localhost/api/admin/card-keys", {
        method: "PATCH",
        body: JSON.stringify({ action: "disable", ids: ["ck-1"] }),
      });

      const res = await PATCH(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.count).toBe(1);
      expect(json.message).toContain("禁用");
    });

    it("22. batch delete with stock adjustment via $transaction", async () => {
      mockCardKeyFindMany.mockResolvedValue([
        { id: "ck-1", status: "AVAILABLE", productId: "prod-1" },
        { id: "ck-2", status: "DISABLED", productId: "prod-1" },
        { id: "ck-3", status: "AVAILABLE", productId: "prod-2" },
      ]);
      mockCardKeyDeleteMany.mockResolvedValue({ count: 3 });
      mockProductUpdate.mockResolvedValue({});

      const req = new NextRequest("http://localhost/api/admin/card-keys", {
        method: "PATCH",
        body: JSON.stringify({
          action: "delete",
          ids: ["ck-1", "ck-2", "ck-3"],
        }),
      });

      const res = await PATCH(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.count).toBe(3);
      expect(json.message).toContain("删除");

      // $transaction should have been called
      expect(mock$transaction).toHaveBeenCalledTimes(1);

      // Inside the transaction: deleteMany + two product stock decrements
      // (prod-1 had 1 AVAILABLE, prod-2 had 1 AVAILABLE)
      expect(mockCardKeyDeleteMany).toHaveBeenCalled();
      expect(mockProductUpdate).toHaveBeenCalledTimes(2);
    });

    it("23. returns 400 when ids array is empty", async () => {
      const req = new NextRequest("http://localhost/api/admin/card-keys", {
        method: "PATCH",
        body: JSON.stringify({ action: "enable", ids: [] }),
      });

      const res = await PATCH(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message).toContain("至少一个");
    });

    it("24. returns 400 when ids exceed 500", async () => {
      const bigIds = Array.from({ length: 501 }, (_, i) => `ck-${i}`);

      const req = new NextRequest("http://localhost/api/admin/card-keys", {
        method: "PATCH",
        body: JSON.stringify({ action: "enable", ids: bigIds }),
      });

      const res = await PATCH(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message).toContain("500");
    });

    it("25. returns 400 when all selected keys are SOLD", async () => {
      mockCardKeyFindMany.mockResolvedValue([
        { id: "ck-sold-1", status: "SOLD", productId: "prod-1" },
        { id: "ck-sold-2", status: "SOLD", productId: "prod-1" },
      ]);

      const req = new NextRequest("http://localhost/api/admin/card-keys", {
        method: "PATCH",
        body: JSON.stringify({
          action: "enable",
          ids: ["ck-sold-1", "ck-sold-2"],
        }),
      });

      const res = await PATCH(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message).toContain("已售");
    });
  });

  // ──────────────────────────── DELETE ────────────────────────────

  describe("DELETE", () => {
    it("26. deletes AVAILABLE key and decrements product stock", async () => {
      mockCardKeyFindUnique.mockResolvedValue({
        id: "ck-1",
        status: "AVAILABLE",
        productId: "prod-1",
        content: "enc_KEY-001",
      });
      mockCardKeyDelete.mockResolvedValue({});
      mockProductUpdate.mockResolvedValue({});

      const req = new NextRequest(
        "http://localhost/api/admin/card-keys?id=ck-1",
        { method: "DELETE" }
      );

      const res = await DELETE_HANDLER(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.message).toContain("已删除");

      expect(mockCardKeyDelete).toHaveBeenCalledWith({
        where: { id: "ck-1" },
      });
      expect(mockProductUpdate).toHaveBeenCalledWith({
        where: { id: "prod-1" },
        data: { stockCount: { decrement: 1 } },
      });
    });

    it("27. deletes DISABLED key without stock change", async () => {
      mockCardKeyFindUnique.mockResolvedValue({
        id: "ck-2",
        status: "DISABLED",
        productId: "prod-1",
        content: "enc_KEY-002",
      });
      mockCardKeyDelete.mockResolvedValue({});

      const req = new NextRequest(
        "http://localhost/api/admin/card-keys?id=ck-2",
        { method: "DELETE" }
      );

      const res = await DELETE_HANDLER(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);

      expect(mockCardKeyDelete).toHaveBeenCalledWith({
        where: { id: "ck-2" },
      });
      // Stock should NOT be decremented for DISABLED keys
      expect(mockProductUpdate).not.toHaveBeenCalled();
    });

    it("28. returns 400 when id param is missing", async () => {
      const req = new NextRequest("http://localhost/api/admin/card-keys", {
        method: "DELETE",
      });

      const res = await DELETE_HANDLER(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message).toContain("卡密ID");
    });

    it("29. returns 404 when card key not found", async () => {
      mockCardKeyFindUnique.mockResolvedValue(null);

      const req = new NextRequest(
        "http://localhost/api/admin/card-keys?id=nonexistent",
        { method: "DELETE" }
      );

      const res = await DELETE_HANDLER(req);
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.success).toBe(false);
      expect(json.message).toBe("卡密不存在");
    });

    it("30. returns 400 when trying to delete SOLD key", async () => {
      mockCardKeyFindUnique.mockResolvedValue({
        id: "ck-sold",
        status: "SOLD",
        productId: "prod-1",
        content: "enc_SOLD-KEY",
      });

      const req = new NextRequest(
        "http://localhost/api/admin/card-keys?id=ck-sold",
        { method: "DELETE" }
      );

      const res = await DELETE_HANDLER(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message).toContain("已售出");
    });

    it("31. returns 400 when trying to delete LOCKED key", async () => {
      mockCardKeyFindUnique.mockResolvedValue({
        id: "ck-locked",
        status: "LOCKED",
        productId: "prod-1",
        content: "enc_LOCKED-KEY",
      });

      const req = new NextRequest(
        "http://localhost/api/admin/card-keys?id=ck-locked",
        { method: "DELETE" }
      );

      const res = await DELETE_HANDLER(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message).toContain("已锁定");
    });
  });
});
