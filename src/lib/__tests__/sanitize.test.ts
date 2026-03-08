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

  it("removes style tags", () => {
    const input = "<style>body{display:none}</style><p>Visible</p>";
    const result = sanitizeHtml(input);
    expect(result).not.toContain("<style>");
    expect(result).toContain("<p>Visible</p>");
  });

  it("removes onerror attributes", () => {
    const input = '<img src="x" onerror="alert(1)">';
    const result = sanitizeHtml(input);
    expect(result).not.toContain("onerror");
  });

  it("removes form and input tags", () => {
    const input = '<form action="/steal"><input type="text"><p>Safe</p></form>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain("<form");
    expect(result).not.toContain("<input");
    expect(result).toContain("<p>Safe</p>");
  });

  it("removes data attributes", () => {
    const input = '<div data-custom="evil">Content</div>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain("data-custom");
    expect(result).toContain("Content");
  });

  it("preserves table structure", () => {
    const input = "<table><thead><tr><th>Header</th></tr></thead><tbody><tr><td>Cell</td></tr></tbody></table>";
    const result = sanitizeHtml(input);
    expect(result).toContain("<table>");
    expect(result).toContain("<th>Header</th>");
    expect(result).toContain("<td>Cell</td>");
  });
});

describe("stripHtml edge cases", () => {
  it("strips nested tags", () => {
    expect(stripHtml("<div><p><strong>Hello</strong></p></div>")).toBe("Hello");
  });

  it("strips self-closing tags", () => {
    expect(stripHtml("Line1<br/>Line2")).toBe("Line1Line2");
  });

  it("handles entities in plain text", () => {
    expect(stripHtml("5 &gt; 3")).toBe("5 &gt; 3");
  });

  it("strips malformed tags", () => {
    expect(stripHtml("<div class='test'>Text</div>")).toBe("Text");
  });
});
