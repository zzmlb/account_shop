import { NextRequest, NextResponse } from "next/server";
import { decodeSession } from "@/lib/auth";
import { db } from "@/server/db";
import { createLogger } from "@/lib/logger";

const log = createLogger("notifications");

function getSession(request: NextRequest) {
  const session = decodeSession(request.cookies.get("session")?.value || "");
  if (!session) {
    return {
      session: null,
      error: NextResponse.json(
        { success: false, message: "未登录" },
        { status: 401 }
      ),
    };
  }
  return { session, error: null };
}

// GET - List user notifications
export async function GET(request: NextRequest) {
  try {
    const { session, error } = getSession(request);
    if (!session) return error!;

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.max(
      1,
      Math.min(50, parseInt(searchParams.get("pageSize") || "20", 10))
    );
    const unreadOnly = searchParams.get("unread") === "true";

    const where: Record<string, unknown> = { userId: session.id };
    if (unreadOnly) {
      where.isRead = false;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      db.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.notification.count({ where }),
      db.notification.count({ where: { userId: session.id, isRead: false } }),
    ]);

    return NextResponse.json({
      success: true,
      notifications: notifications.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        content: n.content,
        href: n.href,
        isRead: n.isRead,
        createdAt: n.createdAt.toISOString(),
      })),
      unreadCount,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    log.error({ err: error }, "获取通知列表失败");
    return NextResponse.json(
      { success: false, message: "服务器内部错误" },
      { status: 500 }
    );
  }
}

// PUT - Mark notifications as read
export async function PUT(request: NextRequest) {
  try {
    const { session, error } = getSession(request);
    if (!session) return error!;

    const body = await request.json();
    const { ids, all } = body;

    if (all) {
      // Mark all as read
      await db.notification.updateMany({
        where: { userId: session.id, isRead: false },
        data: { isRead: true },
      });
      return NextResponse.json({ success: true, message: "已全部标为已读" });
    }

    if (Array.isArray(ids) && ids.length > 0) {
      await db.notification.updateMany({
        where: {
          id: { in: ids },
          userId: session.id,
        },
        data: { isRead: true },
      });
      return NextResponse.json({ success: true, message: "已标为已读" });
    }

    return NextResponse.json(
      { success: false, message: "缺少参数" },
      { status: 400 }
    );
  } catch (error) {
    log.error({ err: error }, "标记通知已读失败");
    return NextResponse.json(
      { success: false, message: "服务器内部错误" },
      { status: 500 }
    );
  }
}
