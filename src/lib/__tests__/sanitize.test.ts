import { describe, it, expect } from "vitest";
import { stripHtml, sanitizeHtml } from "../sanitize";

describe("stripHtml", () => {
  it("removes HTML tags", () => {
    expect(stripHtml("<p>Hello</p>")).toBe("Hello");
    expect(stripHtml("<b>Bold</b> text")).toBe("Bold text");
  });

  it("removes script tags", () => {
    expect(stripHtml('<script>alert("xss")</script>Hello')).toBe(
      'alert("xss")Hello'
    );
  });

  it("trims whitespace", () => {
    expect(stripHtml("  Hello  ")).toBe("Hello");
  });

  it("handles empty string", () => {
    expect(stripHtml("")).toBe("");
  });

  it("handles string without HTML", () => {
    expect(stripHtml("plain text")).toBe("plain text");
  });
});

describe("sanitizeHtml", () => {
  it("allows safe tags", () => {
    const input = "<p>Hello <strong>world</strong></p>";
    const result = sanitizeHtml(input);
    expect(result).toContain("<p>");
    expect(result).toContain("<strong>");
  });

  it("removes script tags", () => {
    const input = '<script>alert("xss")</script><p>Safe content</p>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain("<script>");
    expect(result).toContain("<p>Safe content</p>");
  });

  it("removes onclick attributes", () => {
    const input = '<p onclick="alert(1)">Text</p>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain("onclick");
  });

  it("removes iframe tags", () => {
    const input = '<iframe src="evil.com"></iframe><p>Safe</p>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain("<iframe>");
    expect(result).toContain("<p>Safe</p>");
  });

  it("allows links with href", () => {
    const input = '<a href="https://example.com">Link</a>';
    const result = sanitizeHtml(input);
    expect(result).toContain("href=");
    expect(result).toContain("Link");
  });

  it("allows images", () => {
    const input = '<img src="photo.jpg" alt="Photo">';
    const result = sanitizeHtml(input);
    expect(result).toContain("src=");
    expect(result).toContain("alt=");
  });
});
