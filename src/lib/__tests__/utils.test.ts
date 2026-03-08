import { describe, it, expect, vi } from "vitest";
import { cn, formatPrice, formatDateTime, formatDateTimeFull, formatDate, timeAgo, slugify } from "../utils";

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("handles conditional classes", () => {
    expect(cn("base", false && "hidden", "visible")).toBe("base visible");
  });

  it("merges tailwind conflicts correctly", () => {
    expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4");
  });

  it("handles empty input", () => {
    expect(cn()).toBe("");
  });
});

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

describe("timeAgo", () => {
  it("returns '刚刚' for just now", () => {
    expect(timeAgo(new Date().toISOString())).toBe("刚刚");
  });

  it("returns minutes ago", () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(timeAgo(fiveMinAgo)).toBe("5分钟前");
  });

  it("returns hours ago", () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    expect(timeAgo(threeHoursAgo)).toBe("3小时前");
  });

  it("returns days ago", () => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    expect(timeAgo(sevenDaysAgo)).toBe("7天前");
  });

  it("returns formatted date for 30+ days ago", () => {
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
    const result = timeAgo(sixtyDaysAgo);
    expect(result).toMatch(/\d{4}-\d{2}-\d{2}/);
  });

  it("returns '刚刚' for future dates", () => {
    const future = new Date(Date.now() + 60000).toISOString();
    expect(timeAgo(future)).toBe("刚刚");
  });

  it("returns dash for invalid date", () => {
    expect(timeAgo("invalid")).toBe("-");
  });

  it("handles boundary: exactly 1 minute ago", () => {
    const oneMinAgo = new Date(Date.now() - 60 * 1000).toISOString();
    expect(timeAgo(oneMinAgo)).toBe("1分钟前");
  });

  it("handles boundary: exactly 1 hour ago", () => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    expect(timeAgo(oneHourAgo)).toBe("1小时前");
  });

  it("handles boundary: exactly 1 day ago", () => {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    expect(timeAgo(oneDayAgo)).toBe("1天前");
  });
});
