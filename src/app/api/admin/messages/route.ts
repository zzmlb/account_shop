import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { createLogger } from "@/lib/logger";
import { apiLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { stripHtml } from "@/lib/sanitize";
import { sendContactReply } from "@/server/services/email";
import { getAdminSession } from "@/lib/admin-auth";
import { parsePagination, paginationMeta } from "@/lib/pagination";

const log = createLogger("admin/messages");

// GET - List contact messages
export async function GET(request: NextRequest) {
  try {
    const rl = apiLimiter(getClientIp(request));
    if (!rl.success) return rateLimitResponse(rl);

    const { session, error } = getAdminSession(request);
    if (!session) return error!;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const { page, pageSize } = parsePagination(searchParams, { pageSize: 20, maxPageSize: 50 });

    const search = searchParams.get("search")?.slice(0, 200);

    const where: Record<string, unknown> = {};
    if (status && ["PENDING", "REPLIED", "CLOSED"].includes(status)) {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { subject: { contains: search, mode: "insensitive" } },
        { message: { contains: search, mode: "insensitive" } },
      ];
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
      pagination: paginationMeta(total, page, pageSize),
    });
  } catch (error) {
    log.error({ err: error }, "获取留言列表失败");
    return NextResponse.json({ success: false, message: "服务器内部错误" }, { status: 500 });
  }
}

// PUT - Update message status
export async function PUT(request: NextRequest) {
  try {
    const rl = apiLimiter(getClientIp(request));
    if (!rl.success) return rateLimitResponse(rl);

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

    const existing = await db.contactMessage.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, message: "留言不存在" }, { status: 404 });
    }

    const sanitizedNote = adminNote ? stripHtml(adminNote) : null;

    await db.contactMessage.update({
      where: { id },
      data: {
        status,
        adminNote: sanitizedNote,
      },
    });

    log.info({ messageId: id, status, adminId: session.id }, "留言状态已更新");

    // Send email reply when status changes to REPLIED and there's an admin note
    if (status === "REPLIED" && sanitizedNote && existing.email) {
      sendContactReply({
        to: existing.email,
        name: existing.name,
        subject: existing.subject,
        originalMessage: existing.message.slice(0, 500),
        reply: sanitizedNote,
      }).catch((err) => {
        log.warn({ err, messageId: id }, "Failed to send contact reply email");
      });
    }

    return NextResponse.json({ success: true, message: "状态已更新" });
  } catch (error) {
    log.error({ err: error }, "更新留言状态失败");
    return NextResponse.json({ success: false, message: "服务器内部错误" }, { status: 500 });
  }
}

// PATCH - Batch close messages
export async function PATCH(request: NextRequest) {
  try {
    const rl = apiLimiter(getClientIp(request));
    if (!rl.success) return rateLimitResponse(rl);

    const { session, error } = getAdminSession(request);
    if (!session) return error!;

    const body = await request.json();
    const { ids, status: newStatus } = body as { ids: string[]; status: string };

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ success: false, message: "请选择至少一条留言" }, { status: 400 });
    }
    if (ids.length > 100) {
      return NextResponse.json({ success: false, message: "单次批量操作最多100条" }, { status: 400 });
    }
    if (!["REPLIED", "CLOSED"].includes(newStatus)) {
      return NextResponse.json({ success: false, message: "批量操作仅支持标记已回复或关闭" }, { status: 400 });
    }

    const typedStatus = newStatus as "REPLIED" | "CLOSED";

    const result = await db.contactMessage.updateMany({
      where: { id: { in: ids } },
      data: { status: typedStatus },
    });

    log.info({ adminId: session.id, ids, status: newStatus, affected: result.count }, "批量更新留言状态");

    return NextResponse.json({
      success: true,
      message: `已更新 ${result.count} 条留言`,
      affected: result.count,
    });
  } catch (error) {
    log.error({ err: error }, "批量更新留言状态失败");
    return NextResponse.json({ success: false, message: "服务器内部错误" }, { status: 500 });
  }
}
