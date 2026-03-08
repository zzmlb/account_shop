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
});
