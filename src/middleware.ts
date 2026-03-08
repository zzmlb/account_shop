import { NextRequest, NextResponse } from "next/server";

const SESSION_SECRET =
  process.env.NEXTAUTH_SECRET || "pj37-dev-fallback-secret";

/**
 * Verify HMAC signature using Web Crypto API (Edge Runtime compatible).
 */
async function verifyHmac(
  payload: string,
  signature: string
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(SESSION_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const computed = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(payload)
    );
    const expectedHex = Array.from(new Uint8Array(computed))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    // Constant-length comparison
    if (expectedHex.length !== signature.length) return false;
    let mismatch = 0;
    for (let i = 0; i < expectedHex.length; i++) {
      mismatch |= expectedHex.charCodeAt(i) ^ signature.charCodeAt(i);
    }
    return mismatch === 0;
  } catch {
    return false;
  }
}

/**
 * Decode base64 payload (Edge Runtime compatible).
 */
function decodeBase64(str: string): string {
  try {
    return decodeURIComponent(
      atob(str)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
  } catch {
    return atob(str);
  }
}

/**
 * Parse and verify session cookie.
 */
async function parseSession(
  sessionCookie: string
): Promise<{ isAuthenticated: boolean; isAdmin: boolean }> {
  const dotIdx = sessionCookie.lastIndexOf(".");
  if (dotIdx === -1) {
    return { isAuthenticated: false, isAdmin: false };
  }

  const payload = sessionCookie.slice(0, dotIdx);
  const sig = sessionCookie.slice(dotIdx + 1);
  if (!payload || !sig) {
    return { isAuthenticated: false, isAdmin: false };
  }

  // Verify HMAC signature
  const valid = await verifyHmac(payload, sig);
  if (!valid) {
    return { isAuthenticated: false, isAdmin: false };
  }

  try {
    const decoded = decodeBase64(payload);
    const data = JSON.parse(decoded);
    if (data && data.id && data.username) {
      const role = (data.role || "").toUpperCase();
      return {
        isAuthenticated: true,
        isAdmin: role === "ADMIN" || role === "SUPER_ADMIN",
      };
    }
  } catch {
    // Invalid payload
  }
  return { isAuthenticated: false, isAdmin: false };
}

const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // --- CSRF Protection for API mutation requests ---
  if (pathname.startsWith("/api/") && MUTATION_METHODS.has(request.method)) {
    const origin = request.headers.get("origin");
    const referer = request.headers.get("referer");

    // If Origin or Referer is present, verify it matches the request host
    if (origin || referer) {
      const requestHost = request.nextUrl.host;
      let sourceHost: string | null = null;

      if (origin) {
        try {
          sourceHost = new URL(origin).host;
        } catch {
          return NextResponse.json(
            { success: false, message: "Invalid request origin" },
            { status: 403 }
          );
        }
      } else if (referer) {
        try {
          sourceHost = new URL(referer).host;
        } catch {
          // Ignore invalid referer
        }
      }

      if (sourceHost && sourceHost !== requestHost) {
        return NextResponse.json(
          { success: false, message: "跨站请求被拒绝" },
          { status: 403 }
        );
      }
    }
  }

  // --- Auth checks for page routes ---
  const sessionCookie = request.cookies.get("session")?.value;

  let isAuthenticated = false;
  let isAdmin = false;

  if (sessionCookie) {
    const result = await parseSession(sessionCookie);
    isAuthenticated = result.isAuthenticated;
    isAdmin = result.isAdmin;
  }

  // Protect /dashboard routes - require authentication
  if (pathname.startsWith("/dashboard")) {
    if (!isAuthenticated) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Protect /admin routes - require admin role
  if (pathname.startsWith("/admin")) {
    if (!isAuthenticated) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (!isAdmin) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  // Redirect authenticated users away from auth pages
  if (
    isAuthenticated &&
    (pathname === "/login" || pathname === "/register")
  ) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Refresh session cookie on page navigation to extend session lifetime
  const response = NextResponse.next();

  // Add request ID for debugging and tracing
  const requestId = crypto.randomUUID().slice(0, 8);
  response.headers.set("X-Request-Id", requestId);

  // Add Server-Timing header for API routes
  if (pathname.startsWith("/api/")) {
    response.headers.set("X-Request-Start", Date.now().toString());
  }

  if (isAuthenticated && sessionCookie && !pathname.startsWith("/api/")) {
    response.cookies.set("session", sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days from now
    });
  }

  return response;
}

export const config = {
  matcher: [
    "/api/:path*",
    "/dashboard/:path*",
    "/admin/:path*",
    "/login",
    "/register",
    "/checkout",
    "/products/:path*",
    "/order/:path*",
  ],
};
