import { NextRequest, NextResponse } from "next/server";
import { decodeSession } from "@/lib/auth";
import { db } from "@/server/db";
import { createLogger } from "@/lib/logger";
import { apiLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { stripHtml } from "@/lib/sanitize";

const log = createLogger("admin/messages");

function getAdminSession(request: NextRequest) {
  const session = decodeSession(
    request.cookies.get("session")?.value || ""
  );
  if (!session) {
    return { session: null, error: NextResponse.json({ success: false, message: "未登录" }, { status: 401 }) };
  }
  const role = session.role.toUpperCase();
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
    return { session: null, error: NextResponse.json({ success: false, message: "无管理员权限" }, { status: 403 }) };
  }
  return { session, error: null };
}

// GET - List contact messages
export async function GET(request: NextRequest) {
  try {
    const rl = apiLimiter(getClientIp(request));
    if (!rl.success) return rateLimitResponse(rl);

    const { session, error } = getAdminSession(request);
    if (!session) return error!;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.max(1, Math.min(50, parseInt(searchParams.get("pageSize") || "20", 10)));

    const where: Record<string, unknown> = {};
    if (status && ["PENDING", "REPLIED", "CLOSED"].includes(status)) {
      where.status = status;
    }

    const [messages, total] = await Promise.all([
      db.contactMessage.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.contactMessage.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      messages: messages.map((m) => ({
        id: m.id,
        name: m.name,
        email: m.email,
        subject: m.subject,
        message: m.message,
        status: m.status,
        adminNote: m.adminNote,
        createdAt: m.createdAt.toISOString(),
      })),
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (error) {
    log.error({ err: error }, "获取留言列表失败");
    return NextResponse.json({ success: false, message: "服务器内部错误" }, { status: 500 });
  }
}

// PUT - Update message status
export async function PUT(request: NextRequest) {
  try {
    const { session, error } = getAdminSession(request);
    if (!session) return error!;

    const body = await request.json();
    const { id, status, adminNote } = body;

    if (!id || !status) {
      return NextResponse.json({ success: false, message: "缺少参数" }, { status: 400 });
    }

    if (!["PENDING", "REPLIED", "CLOSED"].includes(status)) {
      return NextResponse.json({ success: false, message: "无效状态" }, { status: 400 });
    }

    await db.contactMessage.update({
      where: { id },
      data: {
        status,
        adminNote: adminNote ? stripHtml(adminNote) : null,
      },
    });

    log.info({ messageId: id, status, adminId: session.id }, "留言状态已更新");

    return NextResponse.json({ success: true, message: "状态已更新" });
  } catch (error) {
    log.error({ err: error }, "更新留言状态失败");
    return NextResponse.json({ success: false, message: "服务器内部错误" }, { status: 500 });
  }
}
