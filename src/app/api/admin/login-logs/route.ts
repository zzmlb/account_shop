import { NextRequest, NextResponse } from "next/server";
import { decodeSession } from "@/lib/auth";
import { db } from "@/server/db";
import { createLogger } from "@/lib/logger";

const log = createLogger("admin/login-logs");

export async function GET(request: NextRequest) {
  try {
    const session = decodeSession(
      request.cookies.get("session")?.value || ""
    );
    if (!session) {
      return NextResponse.json(
        { success: false, message: "未登录" },
        { status: 401 }
      );
    }

    const role = session.role.toUpperCase();
    if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { success: false, message: "无管理员权限" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const status = searchParams.get("status"); // "success" | "failed"
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.max(
      1,
      Math.min(50, parseInt(searchParams.get("pageSize") || "20", 10))
    );

    const where: Record<string, unknown> = {};

    if (status === "success") where.success = true;
    else if (status === "failed") where.success = false;

    if (search) {
      where.OR = [
        { username: { contains: search, mode: "insensitive" } },
        { ip: { contains: search } },
        { user: { email: { contains: search, mode: "insensitive" } } },
      ];
    }

    const [logs, total] = await Promise.all([
      db.loginLog.findMany({
        where,
        include: {
          user: {
            select: { id: true, username: true, email: true, role: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.loginLog.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      logs: logs.map((l) => ({
        id: l.id,
        userId: l.userId,
        username: l.username,
        success: l.success,
        ip: l.ip,
        userAgent: l.userAgent,
        reason: l.reason,
        createdAt: l.createdAt.toISOString(),
        user: l.user
          ? {
              id: l.user.id,
              username: l.user.username,
              email: l.user.email,
              role: l.user.role,
            }
          : null,
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    log.error({ err: error }, "获取登录日志失败");
    return NextResponse.json(
      { success: false, message: "服务器内部错误" },
      { status: 500 }
    );
  }
}
