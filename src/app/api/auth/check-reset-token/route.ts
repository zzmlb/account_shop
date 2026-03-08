import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { apiLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

/**
 * GET /api/auth/check-reset-token?token=xxx
 * Public — Check if a password reset token is still valid
 */
export async function GET(request: NextRequest) {
  const rl = apiLimiter(getClientIp(request));
  if (!rl.success) return rateLimitResponse(rl);

  const token = request.nextUrl.searchParams.get("token");

  if (!token || typeof token !== "string" || token.length > 200) {
    return NextResponse.json({ valid: false, reason: "invalid" });
  }

  try {
    const record = await db.passwordReset.findUnique({
      where: { token },
      select: { expiresAt: true, usedAt: true },
    });

    if (!record) {
      return NextResponse.json({ valid: false, reason: "invalid" });
    }

    if (record.usedAt) {
      return NextResponse.json({ valid: false, reason: "used" });
    }

    if (new Date() > record.expiresAt) {
      return NextResponse.json({ valid: false, reason: "expired" });
    }

    return NextResponse.json({ valid: true });
  } catch {
    return NextResponse.json({ valid: false, reason: "error" });
  }
}
