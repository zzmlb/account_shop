import { describe, it, expect, vi, beforeEach } from "vitest";

// We test the CSRF logic and auth parsing logic from middleware
// Since middleware uses NextRequest/NextResponse, we mock those

const { middleware } = await vi.hoisted(async () => {
  // Set required env before import
  process.env.NEXTAUTH_SECRET = "test-secret-key-for-testing";
  return {} as { middleware: typeof import("../middleware").middleware };
});

// Mock next/server
const mockRedirect = vi.fn();
const mockNext = vi.fn();
const mockJsonResponse = vi.fn();

vi.mock("next/server", () => {
  class MockNextRequest {
    method: string;
    nextUrl: { pathname: string; host: string; searchParams: URLSearchParams };
    url: string;
    headers: Map<string, string>;
    cookies: Map<string, { value: string }>;

    constructor(url: string, init?: { method?: string; headers?: Record<string, string> }) {
      this.url = url;
      const parsedUrl = new URL(url);
      this.method = init?.method || "GET";
      this.nextUrl = {
        pathname: parsedUrl.pathname,
        host: parsedUrl.host,
        searchParams: parsedUrl.searchParams,
      };
      this.headers = new Map(Object.entries(init?.headers || {}));
      this.cookies = new Map();
    }
  }

  const MockNextResponse = {
    json: (body: unknown, init?: { status?: number }) => {
      mockJsonResponse(body, init);
      return { body, status: init?.status, type: "json" };
    },
    redirect: (url: URL | string) => {
      mockRedirect(url);
      return { url: url.toString(), type: "redirect" };
    },
    next: () => {
      const resp = {
        type: "next",
        headers: new Map<string, string>(),
        cookies: {
          set: vi.fn(),
        },
      };
      resp.headers.set = vi.fn();
      mockNext(resp);
      return resp;
    },
  };

  return {
    NextRequest: MockNextRequest,
    NextResponse: MockNextResponse,
  };
});

// Import after mocks
const mod = await import("../middleware");
const testMiddleware = mod.middleware;

describe("middleware", () => {
  beforeEach(() => {
    mockRedirect.mockClear();
    mockNext.mockClear();
    mockJsonResponse.mockClear();
  });

  describe("CSRF protection", () => {
    it("blocks cross-origin POST to API", async () => {
      const { NextRequest } = await import("next/server");
      const req = new NextRequest("http://localhost:3001/api/orders", {
        method: "POST",
        headers: { origin: "http://evil.com" },
      });

      const result = await testMiddleware(req as any);
      expect(mockJsonResponse).toHaveBeenCalledWith(
        expect.objectContaining({ success: false }),
        expect.objectContaining({ status: 403 })
      );
    });

    it("allows same-origin POST to API", async () => {
      const { NextRequest } = await import("next/server");
      const req = new NextRequest("http://localhost:3001/api/orders", {
        method: "POST",
        headers: { origin: "http://localhost:3001" },
      });

      await testMiddleware(req as any);
      expect(mockJsonResponse).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it("allows GET requests without origin check", async () => {
      const { NextRequest } = await import("next/server");
      const req = new NextRequest("http://localhost:3001/api/products", {
        method: "GET",
      });

      await testMiddleware(req as any);
      expect(mockJsonResponse).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it("allows POST without origin header (server-to-server)", async () => {
      const { NextRequest } = await import("next/server");
      const req = new NextRequest("http://localhost:3001/api/orders", {
        method: "POST",
      });

      await testMiddleware(req as any);
      expect(mockJsonResponse).not.toHaveBeenCalled();
    });
  });

  describe("auth protection", () => {
    it("redirects unauthenticated users from /dashboard", async () => {
      const { NextRequest } = await import("next/server");
      const req = new NextRequest("http://localhost:3001/dashboard");

      await testMiddleware(req as any);
      expect(mockRedirect).toHaveBeenCalledWith(
        expect.objectContaining({
          pathname: "/login",
        })
      );
    });

    it("redirects unauthenticated users from /admin", async () => {
      const { NextRequest } = await import("next/server");
      const req = new NextRequest("http://localhost:3001/admin");

      await testMiddleware(req as any);
      expect(mockRedirect).toHaveBeenCalled();
    });

    it("allows public pages without auth", async () => {
      const { NextRequest } = await import("next/server");
      const req = new NextRequest("http://localhost:3001/products");

      await testMiddleware(req as any);
      expect(mockRedirect).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe("security headers", () => {
    it("sets security headers on response", async () => {
      const { NextRequest } = await import("next/server");
      const req = new NextRequest("http://localhost:3001/products");

      await testMiddleware(req as any);
      expect(mockNext).toHaveBeenCalled();
      const resp = mockNext.mock.calls[0][0];
      expect(resp.headers.set).toHaveBeenCalledWith("X-Frame-Options", "DENY");
      expect(resp.headers.set).toHaveBeenCalledWith("X-Content-Type-Options", "nosniff");
      expect(resp.headers.set).toHaveBeenCalledWith("X-XSS-Protection", "1; mode=block");
    });

    it("sets cache control for API GET", async () => {
      const { NextRequest } = await import("next/server");
      const req = new NextRequest("http://localhost:3001/api/products", {
        method: "GET",
      });

      await testMiddleware(req as any);
      const resp = mockNext.mock.calls[0][0];
      expect(resp.headers.set).toHaveBeenCalledWith(
        "Cache-Control",
        "private, no-cache, no-store"
      );
    });
  });
});
