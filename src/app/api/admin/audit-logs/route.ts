import { NextRequest, NextResponse } from "next/server";
import { decodeSession } from "@/lib/auth";
import { db } from "@/server/db";
import { apiLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { parsePagination, paginationMeta } from "@/lib/pagination";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const rl = apiLimiter(getClientIp(request));
    if (!rl.success) return rateLimitResponse(rl);

    const session = decodeSession(
      request.cookies.get("session")?.value || ""
    );

    if (
      !session ||
      (session.role.toUpperCase() !== "ADMIN" &&
        session.role.toUpperCase() !== "SUPER_ADMIN")
    ) {
      return NextResponse.json(
        { success: false, message: "无权限" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const { page, pageSize } = parsePagination(searchParams, { pageSize: 20, maxPageSize: 50 });
    const action = searchParams.get("action");

    const where: Record<string, unknown> = {};
    if (action) {
      where.action = { startsWith: action };
    }

    const [logs, total] = await Promise.all([
      db.adminAuditLog.findMany({
        where,
        include: {
          admin: {
            select: { id: true, username: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: pageSize,
        skip: (page - 1) * pageSize,
      }),
      db.adminAuditLog.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      logs: logs.map((l) => ({
        id: l.id,
        adminUsername: l.admin.username,
        action: l.action,
        target: l.target,
        detail: l.detail,
        ip: l.ip,
        createdAt: l.createdAt.toISOString(),
      })),
      ...paginationMeta(total, page, pageSize),
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "服务器内部错误" },
      { status: 500 }
    );
  }
}
