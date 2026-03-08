import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { apiFetch, apiMutate, ApiError } from "../api-fetch";

const originalFetch = globalThis.fetch;

function mockFetch(status: number, body: unknown) {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  });
}

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("apiFetch", () => {
  it("returns parsed JSON for successful response", async () => {
    mockFetch(200, { success: true, items: [1, 2] });
    const data = await apiFetch("/api/test");
    expect(data).toEqual({ success: true, items: [1, 2] });
  });

  it("throws ApiError when response is not ok", async () => {
    mockFetch(500, { success: false, message: "服务器错误" });
    await expect(apiFetch("/api/test")).rejects.toThrow(ApiError);
    await expect(apiFetch("/api/test")).rejects.toThrow("服务器错误");
  });

  it("throws ApiError when data.success is false even with 200 status", async () => {
    mockFetch(200, { success: false, message: "参数错误" });
    try {
      await apiFetch("/api/test");
      expect.fail("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).message).toBe("参数错误");
      expect((err as ApiError).status).toBe(200);
    }
  });

  it("uses fallback message when data.message is missing", async () => {
    mockFetch(400, { success: false });
    await expect(apiFetch("/api/test")).rejects.toThrow("操作失败");
  });

  it("passes init options to fetch", async () => {
    mockFetch(200, { success: true });
    await apiFetch("/api/test", { headers: { "X-Custom": "yes" } });
    expect(globalThis.fetch).toHaveBeenCalledWith("/api/test", {
      headers: { "X-Custom": "yes" },
    });
  });

  it("returns data without success field as-is (no false check)", async () => {
    mockFetch(200, { count: 5 });
    const data = await apiFetch("/api/test");
    expect(data).toEqual({ count: 5 });
  });
});

describe("apiMutate", () => {
  it("sends POST with JSON body", async () => {
    mockFetch(200, { success: true, id: "abc" });
    const data = await apiMutate("/api/items", "POST", { name: "test" });
    expect(data).toEqual({ success: true, id: "abc" });
    expect(globalThis.fetch).toHaveBeenCalledWith("/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "test" }),
    });
  });

  it("sends DELETE without body", async () => {
    mockFetch(200, { success: true });
    await apiMutate("/api/items?id=1", "DELETE");
    expect(globalThis.fetch).toHaveBeenCalledWith("/api/items?id=1", {
      method: "DELETE",
      headers: undefined,
      body: undefined,
    });
  });

  it("sends PUT with JSON body", async () => {
    mockFetch(200, { success: true });
    await apiMutate("/api/items", "PUT", { id: "1", name: "updated" });
    expect(globalThis.fetch).toHaveBeenCalledWith("/api/items", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "1", name: "updated" }),
    });
  });

  it("throws ApiError on failure", async () => {
    mockFetch(403, { success: false, message: "无权限" });
    await expect(apiMutate("/api/items", "POST", {})).rejects.toThrow("无权限");
  });
});
