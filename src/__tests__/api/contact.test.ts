import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockContactMessageCreate = vi.fn();

vi.mock("@/server/db", () => ({
  db: {
    contactMessage: {
      create: (...args: unknown[]) => mockContactMessageCreate(...args),
    },
  },
}));

vi.mock("@/lib/rate-limit", () => ({
  contactLimiter: () => ({ success: true, remaining: 5, reset: Date.now() + 60000 }),
  getClientIp: () => "127.0.0.1",
  rateLimitResponse: () => {
    const { NextResponse } = require("next/server");
    return NextResponse.json({ success: false, message: "请求过于频繁" }, { status: 429 });
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

vi.mock("@/lib/validators", () => ({
  contactMessageSchema: {
    safeParse: (data: Record<string, unknown>) => {
      if (!data.name || !data.email || !data.subject || !data.message) {
        return { success: false, error: { issues: [{ message: "必填字段缺失" }] } };
      }
      if (typeof data.message === "string" && data.message.length < 10) {
        return { success: false, error: { issues: [{ message: "留言内容至少10字" }] } };
      }
      return { success: true, data };
    },
  },
  formatZodError: (err: { issues: Array<{ message: string }> }) => err.issues[0]?.message ?? "验证错误",
}));

const { POST } = await import("@/app/api/contact/route");

function makeReq(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/contact", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/contact", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockContactMessageCreate.mockResolvedValue({ id: "msg-1" });
  });

  it("submits contact message successfully", async () => {
    const res = await POST(makeReq({
      name: "张三",
      email: "zhang@example.com",
      subject: "咨询产品",
      message: "您好，我想了解一下贵公司的产品详情。",
      category: "general",
    }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.message).toBe("留言已提交，我们会尽快回复您");
    expect(mockContactMessageCreate).toHaveBeenCalledOnce();
  });

  it("returns 400 when name is missing", async () => {
    const res = await POST(makeReq({
      email: "zhang@example.com",
      subject: "咨询产品",
      message: "您好，我想了解一下贵公司的产品详情。",
    }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(mockContactMessageCreate).not.toHaveBeenCalled();
  });

  it("returns 400 when email is missing", async () => {
    const res = await POST(makeReq({
      name: "张三",
      subject: "咨询产品",
      message: "您好，我想了解一下贵公司的产品详情。",
    }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(mockContactMessageCreate).not.toHaveBeenCalled();
  });

  it("returns 400 when subject is missing", async () => {
    const res = await POST(makeReq({
      name: "张三",
      email: "zhang@example.com",
      message: "您好，我想了解一下贵公司的产品详情。",
    }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(mockContactMessageCreate).not.toHaveBeenCalled();
  });

  it("returns 400 when message is too short", async () => {
    const res = await POST(makeReq({
      name: "张三",
      email: "zhang@example.com",
      subject: "咨询产品",
      message: "你好",
    }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.message).toBe("留言内容至少10字");
    expect(mockContactMessageCreate).not.toHaveBeenCalled();
  });

  it("honeypot: silently succeeds when website field is filled (no db create)", async () => {
    const res = await POST(makeReq({
      name: "Bot",
      email: "bot@spam.com",
      subject: "Spam",
      message: "Buy cheap stuff now!!!!!!",
      website: "http://spam.example.com",
    }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.message).toBe("留言已提交，我们会尽快回复您");
    expect(mockContactMessageCreate).not.toHaveBeenCalled();
  });

  it("time-based bot detection: silently succeeds when _t is recent (< 3s)", async () => {
    const res = await POST(makeReq({
      name: "Bot",
      email: "bot@spam.com",
      subject: "Spam subject",
      message: "This is automated spam message content.",
      _t: Date.now() - 1000, // 1 second ago – too fast
    }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.message).toBe("留言已提交，我们会尽快回复您");
    expect(mockContactMessageCreate).not.toHaveBeenCalled();
  });

  it("passes time check when _t is old enough (> 3s)", async () => {
    const res = await POST(makeReq({
      name: "张三",
      email: "zhang@example.com",
      subject: "咨询产品",
      message: "您好，我想了解一下贵公司的产品详情。",
      _t: Date.now() - 10000, // 10 seconds ago – valid
    }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(mockContactMessageCreate).toHaveBeenCalledOnce();
  });

  it("strips HTML from input fields", async () => {
    const res = await POST(makeReq({
      name: "<b>John</b>",
      email: "john@example.com",
      subject: "<script>alert('xss')</script>Important",
      message: "<p>Hello, this is a message with HTML tags.</p>",
    }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(mockContactMessageCreate).toHaveBeenCalledWith({
      data: {
        name: "John",
        email: "john@example.com",
        subject: "alert('xss')Important",
        message: "Hello, this is a message with HTML tags.",
      },
    });
  });

  it("returns 500 on database error", async () => {
    mockContactMessageCreate.mockRejectedValue(new Error("DB error"));

    const res = await POST(makeReq({
      name: "张三",
      email: "zhang@example.com",
      subject: "咨询产品",
      message: "您好，我想了解一下贵公司的产品详情。",
    }));
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.success).toBe(false);
    expect(json.message).toBe("服务器内部错误");
  });

  it("lowercases and trims email", async () => {
    const res = await POST(makeReq({
      name: "张三",
      email: "  Test@EXAMPLE.com  ",
      subject: "咨询产品",
      message: "您好，我想了解一下贵公司的产品详情。",
    }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(mockContactMessageCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: "test@example.com",
        }),
      }),
    );
  });
});
