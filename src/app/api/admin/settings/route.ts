import { NextRequest, NextResponse } from "next/server";
import { decodeSession } from "@/lib/auth";
import { db } from "@/server/db";
import { createLogger } from "@/lib/logger";
import { apiLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

const log = createLogger("admin/settings");

function isAdmin(role: string): boolean {
  const upper = role.toUpperCase();
  return upper === "ADMIN" || upper === "SUPER_ADMIN";
}

function getAdminSession(request: NextRequest) {
  const session = decodeSession(
    request.cookies.get("session")?.value || ""
  );

  if (!session) {
    return {
      session: null,
      error: NextResponse.json(
        { success: false, message: "未登录" },
        { status: 401 }
      ),
    };
  }

  if (!isAdmin(session.role)) {
    return {
      session: null,
      error: NextResponse.json(
        { success: false, message: "无管理员权限" },
        { status: 403 }
      ),
    };
  }

  return { session, error: null };
}

// GET - Get all site settings (admin only)
export async function GET(request: NextRequest) {
  try {
    const rl = apiLimiter(getClientIp(request));
    if (!rl.success) return rateLimitResponse(rl);

    const { session, error } = getAdminSession(request);
    if (!session) return error!;

    const rows = await db.siteSetting.findMany();

    const settings: Record<string, string> = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }

    return NextResponse.json({ success: true, settings });
  } catch (error) {
    log.error({ err: error }, "Admin settings GET error");
    return NextResponse.json(
      { success: false, message: "服务器内部错误" },
      { status: 500 }
    );
  }
}

// PUT - Update settings (admin only)
export async function PUT(request: NextRequest) {
  try {
    const { session, error } = getAdminSession(request);
    if (!session) return error!;

    const body = await request.json();
    const { settings } = body;

    if (!settings || typeof settings !== "object") {
      return NextResponse.json(
        { success: false, message: "缺少 settings 参数" },
        { status: 400 }
      );
    }

    const entries = Object.entries(settings) as [string, string][];

    await Promise.all(
      entries.map(([key, value]) =>
        db.siteSetting.upsert({
          where: { key },
          update: { value: String(value) },
          create: { key, value: String(value) },
        })
      )
    );

    return NextResponse.json({
      success: true,
      message: "设置已保存",
    });
  } catch (error) {
    log.error({ err: error }, "Admin settings PUT error");
    return NextResponse.json(
      { success: false, message: "服务器内部错误" },
      { status: 500 }
    );
  }
}
