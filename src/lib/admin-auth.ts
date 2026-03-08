import { NextRequest, NextResponse } from "next/server";
import { decodeSession, type SessionUser } from "@/lib/auth";

/**
 * Check if a role string represents an admin role.
 */
export function isAdmin(role: string): boolean {
  const upper = role.toUpperCase();
  return upper === "ADMIN" || upper === "SUPER_ADMIN";
}

/**
 * Extract and validate an admin session from the request.
 * Returns { session, error } — if error is non-null, return it directly.
 */
export function getAdminSession(request: NextRequest):
  | { session: SessionUser; error: null }
  | { session: null; error: NextResponse } {
  const session = decodeSession(
    request.cookies.get("session")?.value || ""
  );

  if (!session) {
    return {
      session: null,
      error: NextResponse.json(
        { success: false, message: "未登录" },
        { status: 401 }
      ),
    };
  }

  if (!isAdmin(session.role)) {
    return {
      session: null,
      error: NextResponse.json(
        { success: false, message: "无管理员权限" },
        { status: 403 }
      ),
    };
  }

  return { session, error: null };
}
