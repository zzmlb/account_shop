import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { apiLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  const rl = apiLimiter(getClientIp(request));
  if (!rl.success) return rateLimitResponse(rl);

  const username = request.nextUrl.searchParams.get("username")?.trim();
  if (!username || username.length < 2) {
    return NextResponse.json({ available: false });
  }

  const existing = await db.user.findUnique({
    where: { username },
    select: { id: true },
  });

  return NextResponse.json({ available: !existing });
}
