import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

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

let mockAdminSession: { id: string; username: string; role: string } | null = {
  id: "admin-1",
  username: "admin",
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
    return { session: mockAdminSession, error: null };
  },
}));

const mockSendMail = vi.fn().mockResolvedValue({ messageId: "test-id" });
const mockClose = vi.fn();
vi.mock("nodemailer", () => ({
  default: {
    createTransport: () => ({
      sendMail: (...args: unknown[]) => mockSendMail(...args),
      close: mockClose,
    }),
  },
}));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

const { POST } = await import("@/app/api/admin/test-email/route");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeReq(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/admin/test-email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/admin/test-email", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdminSession = { id: "admin-1", username: "admin", role: "ADMIN" };
    mockSendMail.mockResolvedValue({ messageId: "test-id" });

    process.env.SMTP_HOST = "smtp.test.com";
    process.env.SMTP_PORT = "587";
    process.env.SMTP_USER = "user@test.com";
    process.env.SMTP_PASS = "pass123";
  });

  it("1. sends test email successfully", async () => {
    const res = await POST(makeReq({ to: "recipient@example.com" }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toContain("recipient@example.com");
    expect(mockSendMail).toHaveBeenCalledTimes(1);
  });

  it("2. returns 401 when not authenticated", async () => {
    mockAdminSession = null;

    const res = await POST(makeReq({ to: "test@example.com" }));
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.success).toBe(false);
  });

  it("3. returns 400 for invalid email format", async () => {
    const res = await POST(makeReq({ to: "not-an-email" }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.message).toContain("邮箱");
  });

  it("4. returns 400 for invalid port", async () => {
    const res = await POST(
      makeReq({
        to: "test@example.com",
        smtpHost: "smtp.test.com",
        smtpPort: "99999",
        smtpUser: "user",
        smtpPass: "pass",
      })
    );
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.message).toContain("端口");
  });

  it("5. returns 400 for missing SMTP config", async () => {
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;

    const res = await POST(makeReq({ to: "test@example.com" }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.message).toContain("SMTP");
  });

  it("6. uses custom SMTP config when provided", async () => {
    const res = await POST(
      makeReq({
        to: "test@example.com",
        smtpHost: "custom.smtp.com",
        smtpPort: "465",
        smtpUser: "custom@smtp.com",
        smtpPass: "custompass",
        senderName: "Custom Sender",
      })
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockSendMail).toHaveBeenCalledTimes(1);

    const sendMailArgs = mockSendMail.mock.calls[0][0] as {
      from: string;
      to: string;
    };
    expect(sendMailArgs.from).toContain("Custom Sender");
    expect(sendMailArgs.to).toBe("test@example.com");
  });

  it("7. returns 500 with error message on send failure", async () => {
    mockSendMail.mockRejectedValue(new Error("Connection refused"));

    const res = await POST(
      makeReq({
        to: "test@example.com",
        smtpHost: "smtp.test.com",
        smtpPort: "587",
        smtpUser: "user@test.com",
        smtpPass: "pass",
      })
    );
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.message).toContain("Connection refused");
  });

  it("8. closes transport after sending", async () => {
    await POST(
      makeReq({
        to: "test@example.com",
        smtpHost: "smtp.test.com",
        smtpPort: "587",
        smtpUser: "user@test.com",
        smtpPass: "pass",
      })
    );

    expect(mockSendMail).toHaveBeenCalledTimes(1);
    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  // -----------------------------------------------------------------------
  // Edge cases
  // -----------------------------------------------------------------------

  it("returns 400 for empty recipient email", async () => {
    const res = await POST(makeReq({ to: "" }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
  });

  it("returns 400 for port 0 (below valid range)", async () => {
    const res = await POST(
      makeReq({
        to: "test@example.com",
        smtpHost: "smtp.test.com",
        smtpPort: "0",
        smtpUser: "user@test.com",
        smtpPass: "pass",
      })
    );
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.message).toContain("端口");
  });
});
