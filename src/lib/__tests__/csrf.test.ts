import { describe, it, expect } from "vitest";
import { verifyCsrf } from "../csrf";

function mockRequest(
  method: string,
  url: string,
  headers: Record<string, string | null> = {}
) {
  return {
    method,
    url,
    headers: {
      get(name: string): string | null {
        return headers[name.toLowerCase()] ?? null;
      },
    },
  };
}

describe("verifyCsrf", () => {
  it("allows GET requests without any checks", () => {
    const req = mockRequest("GET", "https://example.com/api/data");
    expect(verifyCsrf(req)).toBe(null);
  });

  it("allows HEAD requests", () => {
    const req = mockRequest("HEAD", "https://example.com/api/data");
    expect(verifyCsrf(req)).toBe(null);
  });

  it("allows POST with matching origin", () => {
    const req = mockRequest("POST", "https://example.com/api/data", {
      origin: "https://example.com",
    });
    expect(verifyCsrf(req)).toBe(null);
  });

  it("blocks POST with mismatched origin", () => {
    const req = mockRequest("POST", "https://example.com/api/data", {
      origin: "https://evil.com",
    });
    const result = verifyCsrf(req);
    expect(result).toContain("CSRF");
    expect(result).toContain("mismatch");
  });

  it("allows PUT with matching referer (no origin)", () => {
    const req = mockRequest("PUT", "https://example.com/api/data", {
      referer: "https://example.com/page",
    });
    expect(verifyCsrf(req)).toBe(null);
  });

  it("blocks DELETE with mismatched referer", () => {
    const req = mockRequest("DELETE", "https://example.com/api/data", {
      referer: "https://evil.com/attack",
    });
    const result = verifyCsrf(req);
    expect(result).toContain("CSRF");
  });

  it("prefers origin over referer", () => {
    // Origin matches but referer doesn't - should pass because origin is checked first
    const req = mockRequest("POST", "https://example.com/api/data", {
      origin: "https://example.com",
      referer: "https://evil.com/attack",
    });
    expect(verifyCsrf(req)).toBe(null);
  });

  it("allows requests without origin or referer (server-to-server)", () => {
    const req = mockRequest("POST", "https://example.com/api/data");
    expect(verifyCsrf(req)).toBe(null);
  });

  it("handles PATCH method", () => {
    const req = mockRequest("PATCH", "https://example.com/api/data", {
      origin: "https://evil.com",
    });
    expect(verifyCsrf(req)).toContain("CSRF");
  });

  it("handles invalid origin header", () => {
    const req = mockRequest("POST", "https://example.com/api/data", {
      origin: "not-a-url",
    });
    expect(verifyCsrf(req)).toContain("Invalid Origin");
  });

  it("handles invalid referer header", () => {
    const req = mockRequest("POST", "https://example.com/api/data", {
      referer: "not-a-url",
    });
    expect(verifyCsrf(req)).toContain("Invalid Referer");
  });
});
