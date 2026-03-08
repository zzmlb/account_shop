import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock db before import
const createMock = vi.fn();
vi.mock("@/server/db", () => ({
  db: {
    adminAuditLog: {
      create: (...args: unknown[]) => createMock(...args),
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

import { logAdminAction } from "../audit";

describe("logAdminAction", () => {
  beforeEach(() => {
    createMock.mockReset();
  });

  it("creates an audit log entry with all fields", () => {
    createMock.mockResolvedValue({ id: "1" });

    logAdminAction({
      adminId: "admin-1",
      action: "create_product",
      target: "product-123",
      detail: "Created product X",
      ip: "127.0.0.1",
    });

    expect(createMock).toHaveBeenCalledWith({
      data: {
        adminId: "admin-1",
        action: "create_product",
        target: "product-123",
        detail: "Created product X",
        ip: "127.0.0.1",
      },
    });
  });

  it("uses null for optional fields when not provided", () => {
    createMock.mockResolvedValue({ id: "2" });

    logAdminAction({
      adminId: "admin-1",
      action: "delete_user",
    });

    expect(createMock).toHaveBeenCalledWith({
      data: {
        adminId: "admin-1",
        action: "delete_user",
        target: null,
        detail: null,
        ip: null,
      },
    });
  });

  it("uses null for empty string target/detail/ip", () => {
    createMock.mockResolvedValue({ id: "3" });

    logAdminAction({
      adminId: "admin-1",
      action: "update",
      target: "",
      detail: "",
      ip: "",
    });

    expect(createMock).toHaveBeenCalledWith({
      data: {
        adminId: "admin-1",
        action: "update",
        target: null,
        detail: null,
        ip: null,
      },
    });
  });

  it("does not throw when db.create rejects", async () => {
    createMock.mockRejectedValue(new Error("DB down"));

    // Should not throw — fire-and-forget pattern
    expect(() =>
      logAdminAction({ adminId: "admin-1", action: "test" })
    ).not.toThrow();

    // Let the promise settle
    await new Promise((r) => setTimeout(r, 10));
  });
});
