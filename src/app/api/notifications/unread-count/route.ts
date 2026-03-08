import { NextRequest, NextResponse } from "next/server";
import { decodeSession } from "@/lib/auth";
import { db } from "@/server/db";

// GET - Lightweight unread notification count
export async function GET(request: NextRequest) {
  const session = decodeSession(request.cookies.get("session")?.value || "");
  if (!session) {
    return NextResponse.json({ count: 0 });
  }

  const count = await db.notification.count({
    where: { userId: session.id, isRead: false },
  });

  return NextResponse.json({ count });
}
