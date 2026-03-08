import { NextRequest, NextResponse } from "next/server";

function decodeBase64(str: string): string {
  // Edge Runtime compatible base64 decode using atob
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

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get("session")?.value;

  // Check if user has a valid session cookie
  let isAuthenticated = false;
  let isAdmin = false;

  if (sessionCookie) {
    try {
      const decoded = decodeBase64(sessionCookie);
      const data = JSON.parse(decoded);
      if (data && data.id && data.username) {
        isAuthenticated = true;
        const role = (data.role || "").toUpperCase();
        isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";
      }
    } catch {
      // Invalid session cookie
    }
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

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/login",
    "/register",
  ],
};
