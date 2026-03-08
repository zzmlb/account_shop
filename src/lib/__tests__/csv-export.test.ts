import { describe, it, expect } from "vitest";
import { escapeCsvField } from "../csv-export";

describe("escapeCsvField", () => {
  it("returns plain strings unchanged", () => {
    expect(escapeCsvField("hello")).toBe("hello");
    expect(escapeCsvField("123")).toBe("123");
    expect(escapeCsvField("simple text")).toBe("simple text");
  });

  it("wraps strings containing commas in quotes", () => {
    expect(escapeCsvField("hello,world")).toBe('"hello,world"');
    expect(escapeCsvField("a,b,c")).toBe('"a,b,c"');
  });

  it("wraps strings containing newlines in quotes", () => {
    expect(escapeCsvField("line1\nline2")).toBe('"line1\nline2"');
  });

  it("escapes double quotes by doubling them", () => {
    expect(escapeCsvField('say "hello"')).toBe('"say ""hello"""');
    expect(escapeCsvField('"quoted"')).toBe('"""quoted"""');
  });

  it("handles strings with both commas and quotes", () => {
    expect(escapeCsvField('a "b", c')).toBe('"a ""b"", c"');
  });

  it("handles empty string", () => {
    expect(escapeCsvField("")).toBe("");
  });

  it("handles Chinese characters", () => {
    expect(escapeCsvField("用户名")).toBe("用户名");
    expect(escapeCsvField("用户,名称")).toBe('"用户,名称"');
  });

  // CSV injection prevention tests
  it("prefixes formula-triggering = with single-quote", () => {
    const result = escapeCsvField("=SUM(A1:A10)");
    expect(result).not.toMatch(/^"?=/);
    expect(result).toContain("'=SUM(A1:A10)");
  });

  it("prefixes formula-triggering + with single-quote", () => {
    const result = escapeCsvField("+1234567890");
    expect(result).toContain("'+1234567890");
  });

  it("prefixes formula-triggering - with single-quote", () => {
    const result = escapeCsvField("-1+1");
    expect(result).toContain("'-1+1");
  });

  it("prefixes formula-triggering @ with single-quote", () => {
    const result = escapeCsvField("@SUM(A1)");
    expect(result).toContain("'@SUM(A1)");
  });

  it("prefixes tab-prefixed values with single-quote", () => {
    const result = escapeCsvField("\t=cmd|'/C calc'!A0");
    expect(result).toContain("'");
  });

  it("handles =cmd|'/C calc'!A0 DDE attack", () => {
    const result = escapeCsvField("=cmd|'/C calc'!A0");
    expect(result).not.toMatch(/^"?=/);
  });

  it("does not prefix normal negative numbers", () => {
    // Negative numbers do get prefixed as they start with -
    const result = escapeCsvField("-100");
    expect(result).toContain("'-100");
  });

  it("handles carriage return prefix", () => {
    const result = escapeCsvField("\r=evil");
    expect(result).toContain("'");
  });
});
