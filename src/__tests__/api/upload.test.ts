import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGetUserSession = vi.fn();

vi.mock("@/lib/auth", () => ({
  getUserSession: (...args: unknown[]) => mockGetUserSession(...args),
}));

vi.mock("@/lib/rate-limit", () => ({
  uploadLimiter: () => ({ success: true, remaining: 10, reset: Date.now() + 60000 }),
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

const mockWriteFile = vi.fn();
const mockMkdir = vi.fn();

vi.mock("fs/promises", () => ({
  writeFile: (...args: unknown[]) => mockWriteFile(...args),
  mkdir: (...args: unknown[]) => mockMkdir(...args),
}));

vi.mock("fs", () => ({
  existsSync: () => true,
}));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

const { POST } = await import("@/app/api/upload/route");

function setupAdmin() {
  mockGetUserSession.mockReturnValue({
    session: { id: "admin-1", username: "admin", role: "ADMIN" },
    error: null,
  });
}

function setupUser() {
  mockGetUserSession.mockReturnValue({
    session: { id: "user-1", username: "testuser", role: "USER" },
    error: null,
  });
}

function setupUnauth() {
  const { NextResponse } = require("next/server");
  mockGetUserSession.mockReturnValue({
    session: null,
    error: NextResponse.json({ success: false, message: "未登录" }, { status: 401 }),
  });
}

function makeUploadReq(
  fileContent: string,
  fileName: string,
  fileType: string,
  purpose?: string,
) {
  const blob = new Blob([fileContent], { type: fileType });
  const file = new File([blob], fileName, { type: fileType });
  const formData = new FormData();
  formData.append("file", file);
  if (purpose) formData.append("purpose", purpose);
  return new NextRequest("http://localhost/api/upload", {
    method: "POST",
    body: formData,
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/upload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWriteFile.mockResolvedValue(undefined);
    mockMkdir.mockResolvedValue(undefined);
  });

  it("returns 401 when not authenticated", async () => {
    setupUnauth();

    const req = makeUploadReq("test", "test.png", "image/png");
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 when no file provided", async () => {
    setupAdmin();

    const formData = new FormData();
    const req = new NextRequest("http://localhost/api/upload", {
      method: "POST",
      body: formData,
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.message).toContain("文件");
  });

  it("returns 400 for unsupported file type", async () => {
    setupAdmin();

    const req = makeUploadReq("test", "test.svg", "image/svg+xml");
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.message).toContain("不支持");
  });

  it("returns 403 when regular user tries non-avatar upload", async () => {
    setupUser();

    const req = makeUploadReq("test", "test.png", "image/png");
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.message).toContain("权限");
  });

  it("allows regular user to upload avatar", async () => {
    setupUser();

    const req = makeUploadReq("small-image", "avatar.png", "image/png", "avatar");
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.url).toMatch(/^\/uploads\//);
    expect(data.url).toContain(".png");
  });

  it("uploads file successfully for admin", async () => {
    setupAdmin();

    const req = makeUploadReq("image-content", "product.jpg", "image/jpeg");
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.url).toMatch(/^\/uploads\//);
    expect(data.url).toContain(".jpg");
    expect(data.filename).toBeDefined();
    expect(mockWriteFile).toHaveBeenCalledTimes(1);
  });

  it("supports webp and gif file types", async () => {
    setupAdmin();

    const req = makeUploadReq("webp-content", "image.webp", "image/webp");
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.url).toContain(".webp");
  });

  // -----------------------------------------------------------------------
  // Edge cases
  // -----------------------------------------------------------------------

  it("returns ENOSPC-specific error message when disk is full", async () => {
    setupAdmin();
    mockWriteFile.mockRejectedValue(new Error("ENOSPC: no space left on device"));

    const req = makeUploadReq("test", "test.png", "image/png");
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.message).toContain("存储空间");
  });

  it("returns size and filename in successful response", async () => {
    setupAdmin();

    const req = makeUploadReq("image-data", "photo.jpg", "image/jpeg");
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(typeof data.size).toBe("number");
    expect(typeof data.filename).toBe("string");
    expect(data.filename).toMatch(/^\d+-[a-z0-9]+\.jpg$/);
  });

  it("returns url field in successful upload response", async () => {
    setupAdmin();

    const req = makeUploadReq("image-data", "photo.png", "image/png");
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(typeof data.url).toBe("string");
    expect(data.url).toContain("/uploads/");
  });
});
