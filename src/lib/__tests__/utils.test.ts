import { describe, it, expect } from "vitest";
import { formatPrice, formatDateTime, formatDateTimeFull, formatDate, slugify } from "../utils";

describe("formatPrice", () => {
  it("formats number to yen with 2 decimals", () => {
    expect(formatPrice(9.9)).toBe("¥9.90");
    expect(formatPrice(100)).toBe("¥100.00");
    expect(formatPrice(0)).toBe("¥0.00");
  });

  it("formats string input", () => {
    expect(formatPrice("19.99")).toBe("¥19.99");
    expect(formatPrice("5")).toBe("¥5.00");
  });

  it("handles large numbers", () => {
    expect(formatPrice(99999.99)).toBe("¥99999.99");
  });
});

describe("formatDateTime", () => {
  it("formats ISO date to YYYY-MM-DD HH:MM", () => {
    const result = formatDateTime("2026-03-08T14:30:00Z");
    expect(result).toMatch(/2026-03-0[89] \d{2}:\d{2}/);
  });

  it("returns dash for invalid date", () => {
    expect(formatDateTime("invalid")).toBe("-");
    expect(formatDateTime("")).toBe("-");
  });
});

describe("formatDateTimeFull", () => {
  it("formats ISO date to YYYY-MM-DD HH:MM:SS", () => {
    const result = formatDateTimeFull("2026-03-08T14:30:45Z");
    expect(result).toMatch(/2026-03-0[89] \d{2}:\d{2}:\d{2}/);
  });

  it("returns dash for invalid date", () => {
    expect(formatDateTimeFull("not-a-date")).toBe("-");
  });
});

describe("formatDate", () => {
  it("formats ISO date to YYYY-MM-DD", () => {
    const result = formatDate("2026-03-08T14:30:00Z");
    expect(result).toMatch(/2026-03-0[89]/);
  });

  it("returns dash for invalid date", () => {
    expect(formatDate("garbage")).toBe("-");
  });
});

describe("slugify", () => {
  it("converts text to lowercase slug", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  it("removes special characters", () => {
    expect(slugify("Hello! World@#$%")).toBe("hello-world");
  });

  it("handles multiple spaces and dashes", () => {
    expect(slugify("  Hello   World  ")).toBe("hello-world");
    expect(slugify("hello---world")).toBe("hello-world");
  });

  it("handles empty string", () => {
    expect(slugify("")).toBe("");
  });

  it("preserves numbers and underscores", () => {
    expect(slugify("product_123")).toBe("product_123");
  });
});
