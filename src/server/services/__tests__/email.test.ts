import { describe, it, expect, vi, beforeEach } from "vitest";

// Use vi.hoisted so mocks and env vars are set up before module loading
const { resendSendMock, smtpSendMailMock } = vi.hoisted(() => {
  // Env vars must be set in vi.hoisted so they're available when the
  // email module initializes (static imports run after vi.hoisted/vi.mock)
  process.env.RESEND_API_KEY = "re_test_key";
  process.env.NEXT_PUBLIC_SITE_NAME = "TestSite";
  process.env.NEXT_PUBLIC_SITE_URL = "https://test.example.com";
  return {
    resendSendMock: vi.fn(),
    smtpSendMailMock: vi.fn(),
  };
});

// Mock Resend
vi.mock("resend", () => {
  return {
    Resend: class {
      emails = { send: resendSendMock };
    },
  };
});

// Mock nodemailer
vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn().mockImplementation(() => ({
      sendMail: smtpSendMailMock,
    })),
  },
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

import {
  sendOrderConfirmation,
  sendCardKeyDelivery,
  sendPasswordReset,
  sendRefundNotification,
  sendBalanceAdjustment,
  sendAccountStatusChange,
  sendPasswordChanged,
  sendContactReply,
} from "../email";

describe("email service", () => {
  beforeEach(() => {
    resendSendMock.mockReset();
    smtpSendMailMock.mockReset();
    resendSendMock.mockResolvedValue({ id: "msg-1" });
  });

  describe("sendOrderConfirmation", () => {
    const data = {
      to: "user@test.com",
      orderNo: "ORD-001",
      items: [
        { name: "Product A", quantity: 2, unitPrice: 49.99 },
        { name: "Product B", quantity: 1, unitPrice: 19.0 },
      ],
      totalAmount: 118.98,
      paymentMethod: "余额支付",
    };

    it("sends email and returns true on success", async () => {
      const result = await sendOrderConfirmation(data);
      expect(result).toBe(true);
      expect(resendSendMock).toHaveBeenCalledTimes(1);
      const call = resendSendMock.mock.calls[0][0];
      expect(call.to).toBe("user@test.com");
      expect(call.subject).toContain("ORD-001");
    });

    it("HTML contains order number and item details", async () => {
      await sendOrderConfirmation(data);
      const html: string = resendSendMock.mock.calls[0][0].html;
      expect(html).toContain("ORD-001");
      expect(html).toContain("Product A");
      expect(html).toContain("Product B");
      expect(html).toContain("¥118.98");
      expect(html).toContain("余额支付");
    });

    it("returns false when send throws", async () => {
      resendSendMock.mockRejectedValue(new Error("Network error"));
      const result = await sendOrderConfirmation(data);
      expect(result).toBe(false);
    });
  });

  describe("sendCardKeyDelivery", () => {
    const data = {
      to: "user@test.com",
      orderNo: "ORD-002",
      items: [
        { productName: "Netflix Account", cardKeys: ["KEY-A1", "KEY-A2"] },
        { productName: "Spotify", cardKeys: ["KEY-B1"] },
      ],
    };

    it("sends email with card key information", async () => {
      const result = await sendCardKeyDelivery(data);
      expect(result).toBe(true);
      const html: string = resendSendMock.mock.calls[0][0].html;
      expect(html).toContain("ORD-002");
      expect(html).toContain("Netflix Account");
      expect(html).toContain("KEY-A1");
      expect(html).toContain("KEY-A2");
      expect(html).toContain("KEY-B1");
      expect(html).toContain("Spotify");
    });

    it("returns false on error", async () => {
      resendSendMock.mockRejectedValue(new Error("fail"));
      const result = await sendCardKeyDelivery(data);
      expect(result).toBe(false);
    });
  });

  describe("sendPasswordReset", () => {
    const data = {
      to: "user@test.com",
      resetToken: "tok_abc123",
      username: "testuser",
    };

    it("includes reset link in HTML", async () => {
      await sendPasswordReset(data);
      const html: string = resendSendMock.mock.calls[0][0].html;
      expect(html).toContain("https://test.example.com/reset-password?token=tok_abc123");
      expect(html).toContain("testuser");
    });

    it("returns false on error", async () => {
      resendSendMock.mockRejectedValue(new Error("fail"));
      const result = await sendPasswordReset(data);
      expect(result).toBe(false);
    });
  });

  describe("sendRefundNotification", () => {
    it("sends approved refund email", async () => {
      const result = await sendRefundNotification({
        to: "user@test.com",
        orderNo: "ORD-003",
        amount: 99.5,
        status: "approved",
      });
      expect(result).toBe(true);
      const call = resendSendMock.mock.calls[0][0];
      expect(call.subject).toContain("已通过");
      expect(call.html).toContain("¥99.50");
      expect(call.html).toContain("退款已通过");
    });

    it("sends rejected refund email", async () => {
      await sendRefundNotification({
        to: "user@test.com",
        orderNo: "ORD-004",
        amount: 50.0,
        status: "rejected",
        adminNote: "不符合退款条件",
      });
      const html: string = resendSendMock.mock.calls[0][0].html;
      expect(html).toContain("退款申请被拒绝");
      expect(html).toContain("不符合退款条件");
    });
  });

  describe("sendBalanceAdjustment", () => {
    it("sends positive balance email", async () => {
      await sendBalanceAdjustment({
        to: "user@test.com",
        username: "testuser",
        amount: 100,
        newBalance: 250,
      });
      const call = resendSendMock.mock.calls[0][0];
      expect(call.subject).toContain("充值");
      expect(call.html).toContain("+¥100.00");
      expect(call.html).toContain("¥250.00");
    });

    it("sends negative balance email", async () => {
      await sendBalanceAdjustment({
        to: "user@test.com",
        username: "testuser",
        amount: -50,
        newBalance: 200,
      });
      const call = resendSendMock.mock.calls[0][0];
      expect(call.subject).toContain("扣减");
      expect(call.html).toContain("-¥50.00");
    });

    it("includes reason when provided", async () => {
      await sendBalanceAdjustment({
        to: "user@test.com",
        username: "testuser",
        amount: 30,
        newBalance: 130,
        reason: "订单补偿",
      });
      const html: string = resendSendMock.mock.calls[0][0].html;
      expect(html).toContain("订单补偿");
    });
  });

  describe("sendAccountStatusChange", () => {
    it("sends banned notification", async () => {
      await sendAccountStatusChange({
        to: "user@test.com",
        username: "baduser",
        newStatus: "BANNED",
      });
      const html: string = resendSendMock.mock.calls[0][0].html;
      expect(html).toContain("账户已被暂停");
      expect(html).toContain("baduser");
    });

    it("sends restored notification", async () => {
      await sendAccountStatusChange({
        to: "user@test.com",
        username: "gooduser",
        newStatus: "ACTIVE",
        reason: "申诉通过",
      });
      const html: string = resendSendMock.mock.calls[0][0].html;
      expect(html).toContain("账户已恢复");
      expect(html).toContain("申诉通过");
    });
  });

  describe("sendPasswordChanged", () => {
    it("includes operation details", async () => {
      await sendPasswordChanged({
        to: "user@test.com",
        username: "testuser",
        ip: "192.168.1.1",
        time: "2026-03-08 12:00:00",
      });
      const html: string = resendSendMock.mock.calls[0][0].html;
      expect(html).toContain("192.168.1.1");
      expect(html).toContain("2026-03-08 12:00:00");
      expect(html).toContain("密码已修改");
    });
  });

  describe("sendContactReply", () => {
    it("includes original message and reply", async () => {
      await sendContactReply({
        to: "user@test.com",
        name: "张三",
        subject: "商品问题",
        originalMessage: "这个商品什么时候补货？",
        reply: "预计下周一补货。",
      });
      const call = resendSendMock.mock.calls[0][0];
      expect(call.subject).toContain("商品问题");
      const html: string = call.html;
      expect(html).toContain("张三");
      expect(html).toContain("这个商品什么时候补货？");
      expect(html).toContain("预计下周一补货。");
    });
  });
});
