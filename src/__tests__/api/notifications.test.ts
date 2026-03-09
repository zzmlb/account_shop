import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Mocks — declared BEFORE importing the route handlers
// ---------------------------------------------------------------------------

const mockNotificationFindMany = vi.fn();
const mockNotificationCount = vi.fn();
const mockNotificationUpdateMany = vi.fn();
const mockNotificationDeleteMany = vi.fn();

vi.mock("@/server/db", () => ({
  db: {
    notification: {
      findMany: (...args: unknown[]) => mockNotificationFindMany(...args),
      count: (...args: unknown[]) => mockNotificationCount(...args),
      updateMany: (...args: unknown[]) => mockNotificationUpdateMany(...args),
      deleteMany: (...args: unknown[]) => mockNotificationDeleteMany(...args),
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

const mockGetUserSession = vi.fn();
const mockDecodeSession = vi.fn();
vi.mock("@/lib/auth", () => ({
  getUserSession: (...args: unknown[]) => mockGetUserSession(...args),
  decodeSession: (...args: unknown[]) => mockDecodeSession(...args),
}));

// ---------------------------------------------------------------------------
// Import the route handlers AFTER all mocks are in place
// ---------------------------------------------------------------------------

const { GET, PUT, DELETE } = await import("@/app/api/notifications/route");
const { GET: GET_UNREAD_COUNT } = await import(
  "@/app/api/notifications/unread-count/route"
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setupAuth(userId = "user-1") {
  mockGetUserSession.mockReturnValue({
    session: { id: userId, username: "testuser", email: "test@example.com", role: "USER" },
    error: null,
  });
  mockDecodeSession.mockReturnValue({
    id: userId,
    username: "testuser",
    email: "test@example.com",
    role: "USER",
  });
}

function setupUnauth() {
  const { NextResponse } = require("next/server");
  mockGetUserSession.mockReturnValue({
    session: null,
    error: NextResponse.json({ success: false, message: "未登录" }, { status: 401 }),
  });
  mockDecodeSession.mockReturnValue(null);
}

function createGetRequest(
  params: Record<string, string> = {},
  path = "/api/notifications"
) {
  const url = new URL(`http://localhost:3001${path}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return new NextRequest(url);
}

function createPutRequest(body: unknown) {
  return new NextRequest("http://localhost:3001/api/notifications", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function createDeleteRequest(
  params: Record<string, string> = {},
  body?: unknown
) {
  const url = new URL("http://localhost:3001/api/notifications");
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  const init: RequestInit = { method: "DELETE" };
  if (body !== undefined) {
    init.headers = { "Content-Type": "application/json" };
    init.body = JSON.stringify(body);
  }
  return new NextRequest(url, init as ConstructorParameters<typeof NextRequest>[1]);
}

const now = new Date("2026-03-09T10:00:00Z");

const mockNotification = {
  id: "notif-1",
  type: "ORDER",
  title: "订单已发货",
  content: "您的订单 PJ37-001 已发货",
  href: "/orders/PJ37-001",
  isRead: false,
  createdAt: now,
  userId: "user-1",
};

const mockNotification2 = {
  id: "notif-2",
  type: "SYSTEM",
  title: "系统通知",
  content: "平台维护公告",
  href: null,
  isRead: true,
  createdAt: new Date("2026-03-08T10:00:00Z"),
  userId: "user-1",
};

// ===========================================================================
// Tests — GET /api/notifications
// ===========================================================================

describe("GET /api/notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuth();
    mockNotificationFindMany.mockResolvedValue([mockNotification, mockNotification2]);
    // count is called twice in Promise.all: once for total, once for unreadCount
    mockNotificationCount
      .mockResolvedValueOnce(2) // total
      .mockResolvedValueOnce(1); // unreadCount
  });

  // -------------------------------------------------------------------------
  // 1. Returns notifications list with pagination
  // -------------------------------------------------------------------------

  it("returns notifications list with pagination", async () => {
    const req = createGetRequest();
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.notifications).toHaveLength(2);
    expect(data.unreadCount).toBe(1);
    expect(data.pagination).toEqual({
      page: 1,
      pageSize: 20,
      total: 2,
      totalPages: 1,
    });
  });

  // -------------------------------------------------------------------------
  // 2. Formats notification data correctly
  // -------------------------------------------------------------------------

  it("formats notification data correctly", async () => {
    mockNotificationFindMany.mockResolvedValue([mockNotification]);
    mockNotificationCount.mockReset();
    mockNotificationCount
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1);

    const req = createGetRequest();
    const response = await GET(req);
    const data = await response.json();

    const notif = data.notifications[0];
    expect(notif).toEqual({
      id: "notif-1",
      type: "ORDER",
      title: "订单已发货",
      content: "您的订单 PJ37-001 已发货",
      href: "/orders/PJ37-001",
      isRead: false,
      createdAt: now.toISOString(),
    });
  });

  // -------------------------------------------------------------------------
  // 3. Filters by unread only
  // -------------------------------------------------------------------------

  it("filters by unread only when unread=true", async () => {
    const req = createGetRequest({ unread: "true" });
    await GET(req);

    const whereArg = mockNotificationFindMany.mock.calls[0][0].where;
    expect(whereArg.isRead).toBe(false);
    expect(whereArg.userId).toBe("user-1");
  });

  it("does not filter by read status when unread param is absent", async () => {
    const req = createGetRequest();
    await GET(req);

    const whereArg = mockNotificationFindMany.mock.calls[0][0].where;
    expect(whereArg.isRead).toBeUndefined();
  });

  // -------------------------------------------------------------------------
  // 4. Filters by type
  // -------------------------------------------------------------------------

  it("filters by valid type", async () => {
    const req = createGetRequest({ type: "SYSTEM" });
    await GET(req);

    const whereArg = mockNotificationFindMany.mock.calls[0][0].where;
    expect(whereArg.type).toBe("SYSTEM");
  });

  it("ignores invalid type values", async () => {
    const req = createGetRequest({ type: "INVALID" });
    await GET(req);

    const whereArg = mockNotificationFindMany.mock.calls[0][0].where;
    expect(whereArg.type).toBeUndefined();
  });

  it("accepts all valid notification types", async () => {
    for (const type of ["ORDER", "REFUND", "BALANCE", "SYSTEM", "COUPON"]) {
      vi.clearAllMocks();
      setupAuth();
      mockNotificationFindMany.mockResolvedValue([]);
      mockNotificationCount.mockResolvedValueOnce(0).mockResolvedValueOnce(0);

      const req = createGetRequest({ type });
      await GET(req);

      const whereArg = mockNotificationFindMany.mock.calls[0][0].where;
      expect(whereArg.type).toBe(type);
    }
  });

  // -------------------------------------------------------------------------
  // 5. Respects pagination params
  // -------------------------------------------------------------------------

  it("respects page and pageSize params", async () => {
    const req = createGetRequest({ page: "2", pageSize: "5" });
    await GET(req);

    const findManyArg = mockNotificationFindMany.mock.calls[0][0];
    expect(findManyArg.skip).toBe(5); // (page 2 - 1) * pageSize 5
    expect(findManyArg.take).toBe(5);
  });

  it("orders notifications by createdAt desc", async () => {
    const req = createGetRequest();
    await GET(req);

    const findManyArg = mockNotificationFindMany.mock.calls[0][0];
    expect(findManyArg.orderBy).toEqual({ createdAt: "desc" });
  });

  // -------------------------------------------------------------------------
  // 6. Auth checks
  // -------------------------------------------------------------------------

  it("returns 401 for unauthenticated users", async () => {
    setupUnauth();

    const req = createGetRequest();
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.message).toBe("未登录");
  });

  // -------------------------------------------------------------------------
  // 7. Error handling
  // -------------------------------------------------------------------------

  it("returns 500 on database error", async () => {
    mockNotificationFindMany.mockRejectedValue(new Error("DB connection failed"));

    const req = createGetRequest();
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.message).toBe("服务器内部错误");
  });
});

// ===========================================================================
// Tests — PUT /api/notifications (mark as read)
// ===========================================================================

describe("PUT /api/notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuth();
    mockNotificationUpdateMany.mockResolvedValue({ count: 1 });
  });

  // -------------------------------------------------------------------------
  // 1. Mark all as read
  // -------------------------------------------------------------------------

  it("marks all notifications as read when all=true", async () => {
    const req = createPutRequest({ all: true });
    const response = await PUT(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe("已全部标为已读");

    expect(mockNotificationUpdateMany).toHaveBeenCalledWith({
      where: { userId: "user-1", isRead: false },
      data: { isRead: true },
    });
  });

  // -------------------------------------------------------------------------
  // 2. Mark specific notifications as read by IDs
  // -------------------------------------------------------------------------

  it("marks specific notifications as read by IDs", async () => {
    const req = createPutRequest({ ids: ["notif-1", "notif-2"] });
    const response = await PUT(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe("已标为已读");

    expect(mockNotificationUpdateMany).toHaveBeenCalledWith({
      where: {
        id: { in: ["notif-1", "notif-2"] },
        userId: "user-1",
      },
      data: { isRead: true },
    });
  });

  // -------------------------------------------------------------------------
  // 3. Returns 400 for too many IDs (over 200)
  // -------------------------------------------------------------------------

  it("returns 400 when more than 200 IDs are provided", async () => {
    const ids = Array.from({ length: 201 }, (_, i) => `notif-${i}`);
    const req = createPutRequest({ ids });
    const response = await PUT(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.message).toBe("单次最多标记200条通知");
  });

  // -------------------------------------------------------------------------
  // 4. Returns 400 for invalid IDs (non-string or empty)
  // -------------------------------------------------------------------------

  it("returns 400 when all IDs are invalid (non-string)", async () => {
    const req = createPutRequest({ ids: [123, null, ""] });
    const response = await PUT(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.message).toBe("无效的通知ID");
  });

  // -------------------------------------------------------------------------
  // 5. Returns 400 when no ids and no all flag
  // -------------------------------------------------------------------------

  it("returns 400 when neither ids nor all is provided", async () => {
    const req = createPutRequest({});
    const response = await PUT(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.message).toBe("缺少参数");
  });

  it("returns 400 when ids is an empty array", async () => {
    const req = createPutRequest({ ids: [] });
    const response = await PUT(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.message).toBe("缺少参数");
  });

  // -------------------------------------------------------------------------
  // 6. Auth check
  // -------------------------------------------------------------------------

  it("returns 401 for unauthenticated users", async () => {
    setupUnauth();

    const req = createPutRequest({ all: true });
    const response = await PUT(req);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.message).toBe("未登录");
  });

  // -------------------------------------------------------------------------
  // 7. Error handling
  // -------------------------------------------------------------------------

  it("returns 500 on database error", async () => {
    mockNotificationUpdateMany.mockRejectedValue(new Error("DB write failed"));

    const req = createPutRequest({ all: true });
    const response = await PUT(req);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.message).toBe("服务器内部错误");
  });

  // -------------------------------------------------------------------------
  // 8. Filters out invalid IDs but keeps valid ones
  // -------------------------------------------------------------------------

  it("filters out invalid IDs but keeps valid ones", async () => {
    const req = createPutRequest({ ids: ["notif-1", "", 123, "notif-2", null] });
    const response = await PUT(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);

    expect(mockNotificationUpdateMany).toHaveBeenCalledWith({
      where: {
        id: { in: ["notif-1", "notif-2"] },
        userId: "user-1",
      },
      data: { isRead: true },
    });
  });
});

// ===========================================================================
// Tests — DELETE /api/notifications
// ===========================================================================

describe("DELETE /api/notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuth();
    mockNotificationDeleteMany.mockResolvedValue({ count: 1 });
  });

  // -------------------------------------------------------------------------
  // 1. Deletes a single notification by query param
  // -------------------------------------------------------------------------

  it("deletes a single notification by query param id", async () => {
    const req = createDeleteRequest({ id: "notif-1" });
    const response = await DELETE(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);

    expect(mockNotificationDeleteMany).toHaveBeenCalledWith({
      where: { id: "notif-1", userId: "user-1" },
    });
  });

  // -------------------------------------------------------------------------
  // 2. Batch deletes notifications via JSON body
  // -------------------------------------------------------------------------

  it("batch deletes notifications via JSON body", async () => {
    mockNotificationDeleteMany.mockResolvedValue({ count: 3 });

    const req = createDeleteRequest({}, { ids: ["notif-1", "notif-2", "notif-3"] });
    const response = await DELETE(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe("已删除 3 条通知");
    expect(data.count).toBe(3);

    expect(mockNotificationDeleteMany).toHaveBeenCalledWith({
      where: {
        id: { in: ["notif-1", "notif-2", "notif-3"] },
        userId: "user-1",
      },
    });
  });

  // -------------------------------------------------------------------------
  // 3. Returns 400 for too many IDs (over 200)
  // -------------------------------------------------------------------------

  it("returns 400 when more than 200 IDs are provided", async () => {
    const ids = Array.from({ length: 201 }, (_, i) => `notif-${i}`);
    const req = createDeleteRequest({}, { ids });
    const response = await DELETE(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.message).toBe("单次最多删除200条通知");
  });

  // -------------------------------------------------------------------------
  // 4. Returns 400 for invalid IDs
  // -------------------------------------------------------------------------

  it("returns 400 when all IDs are invalid", async () => {
    const req = createDeleteRequest({}, { ids: [123, null, ""] });
    const response = await DELETE(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.message).toBe("无效的通知ID");
  });

  // -------------------------------------------------------------------------
  // 5. Returns 400 when no id param and no body
  // -------------------------------------------------------------------------

  it("returns 400 when no id param and body has no ids", async () => {
    const req = createDeleteRequest({}, { ids: [] });
    const response = await DELETE(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.message).toBe("缺少通知ID");
  });

  it("returns 400 when no id param and body is missing", async () => {
    // DELETE with no query param and no JSON body
    const req = new NextRequest("http://localhost:3001/api/notifications", {
      method: "DELETE",
    });
    const response = await DELETE(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.message).toBe("缺少通知ID");
  });

  // -------------------------------------------------------------------------
  // 6. Auth check
  // -------------------------------------------------------------------------

  it("returns 401 for unauthenticated users", async () => {
    setupUnauth();

    const req = createDeleteRequest({ id: "notif-1" });
    const response = await DELETE(req);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.message).toBe("未登录");
  });

  // -------------------------------------------------------------------------
  // 7. Error handling
  // -------------------------------------------------------------------------

  it("returns 500 on database error", async () => {
    mockNotificationDeleteMany.mockRejectedValue(new Error("DB delete failed"));

    const req = createDeleteRequest({ id: "notif-1" });
    const response = await DELETE(req);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.message).toBe("服务器内部错误");
  });
});

// ===========================================================================
// Tests — GET /api/notifications/unread-count
// ===========================================================================

describe("GET /api/notifications/unread-count", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNotificationCount.mockReset();
    setupAuth();
    mockNotificationCount.mockResolvedValue(5);
  });

  // -------------------------------------------------------------------------
  // 1. Returns unread count for authenticated user
  // -------------------------------------------------------------------------

  it("returns unread count for authenticated user", async () => {
    const req = createGetRequest({}, "/api/notifications/unread-count");
    const response = await GET_UNREAD_COUNT(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.count).toBe(5);
  });

  // -------------------------------------------------------------------------
  // 2. Sets cache headers
  // -------------------------------------------------------------------------

  it("sets Cache-Control header on successful response", async () => {
    const req = createGetRequest({}, "/api/notifications/unread-count");
    const response = await GET_UNREAD_COUNT(req);

    expect(response.headers.get("Cache-Control")).toBe(
      "private, max-age=15, stale-while-revalidate=60"
    );
  });

  // -------------------------------------------------------------------------
  // 3. Returns count: 0 for unauthenticated users (no 401)
  // -------------------------------------------------------------------------

  it("returns count: 0 for unauthenticated users (no 401 error)", async () => {
    mockDecodeSession.mockReturnValue(null);

    const req = createGetRequest({}, "/api/notifications/unread-count");
    const response = await GET_UNREAD_COUNT(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.count).toBe(0);
    // Should NOT have called the DB
    expect(mockNotificationCount).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // 4. Returns count: 0 on database error (graceful)
  // -------------------------------------------------------------------------

  it("returns count: 0 on database error", async () => {
    mockNotificationCount.mockRejectedValue(new Error("DB read failed"));

    const req = createGetRequest({}, "/api/notifications/unread-count");
    const response = await GET_UNREAD_COUNT(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.count).toBe(0);
  });

  // -------------------------------------------------------------------------
  // 5. Queries with correct userId and isRead filter
  // -------------------------------------------------------------------------

  it("queries with correct userId and isRead=false", async () => {
    const req = createGetRequest({}, "/api/notifications/unread-count");
    await GET_UNREAD_COUNT(req);

    expect(mockNotificationCount).toHaveBeenCalledWith({
      where: { userId: "user-1", isRead: false },
    });
  });
});
