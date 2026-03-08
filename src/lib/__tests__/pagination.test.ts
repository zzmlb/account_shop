import { describe, it, expect } from "vitest";
import { parsePagination, paginationMeta } from "../pagination";

function params(obj: Record<string, string> = {}): URLSearchParams {
  return new URLSearchParams(obj);
}

describe("parsePagination", () => {
  it("returns defaults when no params", () => {
    const result = parsePagination(params());
    expect(result).toEqual({ page: 1, pageSize: 20 });
  });

  it("parses page and pageSize", () => {
    const result = parsePagination(params({ page: "3", pageSize: "10" }));
    expect(result).toEqual({ page: 3, pageSize: 10 });
  });

  it("uses custom defaults", () => {
    const result = parsePagination(params(), {
      pageSize: 50,
      maxPageSize: 100,
    });
    expect(result).toEqual({ page: 1, pageSize: 50 });
  });

  it("clamps pageSize to maxPageSize", () => {
    const result = parsePagination(params({ pageSize: "200" }), {
      maxPageSize: 50,
    });
    expect(result.pageSize).toBe(50);
  });

  it("rejects negative page", () => {
    const result = parsePagination(params({ page: "-1" }));
    expect(result.page).toBe(1);
  });

  it("rejects zero page", () => {
    const result = parsePagination(params({ page: "0" }));
    expect(result.page).toBe(1);
  });

  it("rejects NaN page", () => {
    const result = parsePagination(params({ page: "abc" }));
    expect(result.page).toBe(1);
  });

  it("rejects negative pageSize", () => {
    const result = parsePagination(params({ pageSize: "-5" }));
    expect(result.pageSize).toBe(20);
  });

  it("rejects zero pageSize", () => {
    const result = parsePagination(params({ pageSize: "0" }));
    expect(result.pageSize).toBe(20);
  });

  it("rejects NaN pageSize", () => {
    const result = parsePagination(params({ pageSize: "abc" }));
    expect(result.pageSize).toBe(20);
  });
});

describe("paginationMeta", () => {
  it("calculates totalPages correctly", () => {
    expect(paginationMeta(100, 1, 20)).toEqual({
      page: 1,
      pageSize: 20,
      total: 100,
      totalPages: 5,
    });
  });

  it("rounds up totalPages", () => {
    expect(paginationMeta(21, 1, 20).totalPages).toBe(2);
  });

  it("handles zero total", () => {
    expect(paginationMeta(0, 1, 20).totalPages).toBe(0);
  });

  it("handles single page", () => {
    expect(paginationMeta(5, 1, 20).totalPages).toBe(1);
  });
});
