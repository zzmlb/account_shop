import { NextRequest, NextResponse } from "next/server";
import { decodeSession } from "@/lib/auth";
import { db } from "@/server/db";
import { apiLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { createLogger } from "@/lib/logger";

const log = createLogger("notifications/unread-count");

// GET - Lightweight unread notification count
export async function GET(request: NextRequest) {
  const rl = apiLimiter(getClientIp(request));
  if (!rl.success) return rateLimitResponse(rl);

  const session = decodeSession(request.cookies.get("session")?.value || "");
  if (!session) {
    return NextResponse.json({ count: 0 });
  }

  try {
    const count = await db.notification.count({
      where: { userId: session.id, isRead: false },
    });

    const response = NextResponse.json({ count });
    response.headers.set("Cache-Control", "private, max-age=15, stale-while-revalidate=60");
    return response;
  } catch (error) {
    log.warn({ err: error }, "Unread count query failed");
    return NextResponse.json({ count: 0 });
  }
}
