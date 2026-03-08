import { NextRequest, NextResponse } from "next/server";
import { decodeSession } from "@/lib/auth";
import { db } from "@/server/db";
import { createLogger } from "@/lib/logger";
import { apiLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { parsePagination, paginationMeta } from "@/lib/pagination";

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
    const rl = apiLimiter(getClientIp(request));
    if (!rl.success) return rateLimitResponse(rl);

    const { session, error } = getSession(request);
    if (!session) return error!;

    const { searchParams } = new URL(request.url);
    const { page, pageSize } = parsePagination(searchParams, { pageSize: 20, maxPageSize: 50 });
    const unreadOnly = searchParams.get("unread") === "true";
    const typeFilter = searchParams.get("type");
    const validTypes = ["ORDER", "REFUND", "BALANCE", "SYSTEM", "COUPON"];

    const where: Record<string, unknown> = { userId: session.id };
    if (unreadOnly) {
      where.isRead = false;
    }
    if (typeFilter && validTypes.includes(typeFilter)) {
      where.type = typeFilter;
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
      pagination: paginationMeta(total, page, pageSize),
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
    const rl = apiLimiter(getClientIp(request));
    if (!rl.success) return rateLimitResponse(rl);

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
      if (ids.length > 200) {
        return NextResponse.json(
          { success: false, message: "单次最多标记200条通知" },
          { status: 400 }
        );
      }
      const validIds = ids.filter(
        (id: unknown): id is string => typeof id === "string" && id.length > 0
      );
      if (validIds.length === 0) {
        return NextResponse.json(
          { success: false, message: "无效的通知ID" },
          { status: 400 }
        );
      }
      await db.notification.updateMany({
        where: {
          id: { in: validIds },
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

// DELETE - Delete notification(s)
// Supports single ?id=xxx or batch via JSON body { ids: [...] }
export async function DELETE(request: NextRequest) {
  try {
    const rl = apiLimiter(getClientIp(request));
    if (!rl.success) return rateLimitResponse(rl);

    const { session, error } = getSession(request);
    if (!session) return error!;

    const id = new URL(request.url).searchParams.get("id");

    if (id) {
      // Single delete via query param
      await db.notification.deleteMany({
        where: { id, userId: session.id },
      });
      return NextResponse.json({ success: true });
    }

    // Batch delete via JSON body
    let body: { ids?: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "缺少通知ID" },
        { status: 400 }
      );
    }

    if (Array.isArray(body.ids) && body.ids.length > 0) {
      if (body.ids.length > 200) {
        return NextResponse.json(
          { success: false, message: "单次最多删除200条通知" },
          { status: 400 }
        );
      }
      const validIds = body.ids.filter(
        (v: unknown): v is string => typeof v === "string" && v.length > 0
      );
      if (validIds.length === 0) {
        return NextResponse.json(
          { success: false, message: "无效的通知ID" },
          { status: 400 }
        );
      }
      const result = await db.notification.deleteMany({
        where: { id: { in: validIds }, userId: session.id },
      });
      return NextResponse.json({
        success: true,
        message: `已删除 ${result.count} 条通知`,
        count: result.count,
      });
    }

    return NextResponse.json(
      { success: false, message: "缺少通知ID" },
      { status: 400 }
    );
  } catch (error) {
    log.error({ err: error }, "删除通知失败");
    return NextResponse.json(
      { success: false, message: "服务器内部错误" },
      { status: 500 }
    );
  }
}
