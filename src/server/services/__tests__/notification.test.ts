import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock db
const notificationCreateMock = vi.fn();
const notificationCreateManyMock = vi.fn();
const userFindManyMock = vi.fn();

vi.mock("@/server/db", () => ({
  db: {
    notification: {
      create: (...args: unknown[]) => notificationCreateMock(...args),
      createMany: (...args: unknown[]) => notificationCreateManyMock(...args),
    },
    user: {
      findMany: (...args: unknown[]) => userFindManyMock(...args),
    },
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

import {
  createNotification,
  createBulkNotifications,
  notifyAdminsStockShortage,
  notifyAdminsNewOrder,
} from "../notification";

describe("notification service", () => {
  beforeEach(() => {
    notificationCreateMock.mockReset();
    notificationCreateManyMock.mockReset();
    userFindManyMock.mockReset();
    notificationCreateMock.mockResolvedValue({ id: "n1" });
    notificationCreateManyMock.mockResolvedValue({ count: 1 });
  });

  describe("createNotification", () => {
    it("creates a notification with correct data", () => {
      createNotification({
        userId: "user-1",
        type: "ORDER",
        title: "新订单",
        content: "您的订单已创建",
        href: "/orders/1",
      });

      expect(notificationCreateMock).toHaveBeenCalledWith({
        data: {
          userId: "user-1",
          type: "ORDER",
          title: "新订单",
          content: "您的订单已创建",
          href: "/orders/1",
        },
      });
    });

    it("sets href to null when not provided", () => {
      createNotification({
        userId: "user-1",
        type: "SYSTEM",
        title: "系统通知",
        content: "系统维护中",
      });

      expect(notificationCreateMock).toHaveBeenCalledWith({
        data: expect.objectContaining({
          href: null,
        }),
      });
    });

    it("does not throw on db error (fire-and-forget)", async () => {
      notificationCreateMock.mockRejectedValue(new Error("DB error"));

      expect(() =>
        createNotification({
          userId: "user-1",
          type: "ORDER",
          title: "test",
          content: "test",
        })
      ).not.toThrow();

      // Let the promise settle
      await new Promise((r) => setTimeout(r, 10));
    });
  });

  describe("createBulkNotifications", () => {
    it("creates notifications for multiple users", () => {
      createBulkNotifications(["u1", "u2", "u3"], {
        type: "SYSTEM",
        title: "公告",
        content: "系统更新",
        href: "/announcements",
      });

      expect(notificationCreateManyMock).toHaveBeenCalledWith({
        data: [
          { userId: "u1", type: "SYSTEM", title: "公告", content: "系统更新", href: "/announcements" },
          { userId: "u2", type: "SYSTEM", title: "公告", content: "系统更新", href: "/announcements" },
          { userId: "u3", type: "SYSTEM", title: "公告", content: "系统更新", href: "/announcements" },
        ],
      });
    });

    it("does nothing for empty user list", () => {
      createBulkNotifications([], {
        type: "SYSTEM",
        title: "test",
        content: "test",
      });

      expect(notificationCreateManyMock).not.toHaveBeenCalled();
    });

    it("does not throw on db error", async () => {
      notificationCreateManyMock.mockRejectedValue(new Error("DB error"));

      expect(() =>
        createBulkNotifications(["u1"], {
          type: "SYSTEM",
          title: "test",
          content: "test",
        })
      ).not.toThrow();

      await new Promise((r) => setTimeout(r, 10));
    });
  });

  describe("notifyAdminsStockShortage", () => {
    it("notifies all admin users about stock shortage", async () => {
      userFindManyMock.mockResolvedValue([
        { id: "admin-1" },
        { id: "admin-2" },
      ]);

      notifyAdminsStockShortage("ORD-100", ["Product A", "Product B"]);

      // Wait for async chain to resolve
      await new Promise((r) => setTimeout(r, 20));

      expect(userFindManyMock).toHaveBeenCalledWith({
        where: { role: { in: ["ADMIN", "SUPER_ADMIN"] } },
        select: { id: true },
      });

      expect(notificationCreateManyMock).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            userId: "admin-1",
            type: "SYSTEM",
            title: expect.stringContaining("ORD-100"),
            content: expect.stringContaining("Product A"),
          }),
        ]),
      });
    });

    it("does nothing when no admins found", async () => {
      userFindManyMock.mockResolvedValue([]);

      notifyAdminsStockShortage("ORD-101", ["Product X"]);
      await new Promise((r) => setTimeout(r, 20));

      expect(notificationCreateManyMock).not.toHaveBeenCalled();
    });
  });

  describe("notifyAdminsNewOrder", () => {
    it("notifies admins about new order with amount and count", async () => {
      userFindManyMock.mockResolvedValue([{ id: "admin-1" }]);

      notifyAdminsNewOrder("ORD-200", 299.99, 3);
      await new Promise((r) => setTimeout(r, 20));

      expect(notificationCreateManyMock).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({
            userId: "admin-1",
            type: "ORDER",
            title: expect.stringContaining("ORD-200"),
            content: expect.stringContaining("¥299.99"),
          }),
        ],
      });
    });
  });
});
