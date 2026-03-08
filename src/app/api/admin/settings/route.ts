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

// Allowed setting keys to prevent arbitrary key creation
const ALLOWED_SETTING_KEYS = new Set([
  "site_name",
  "site_description",
  "site_keywords",
  "contact_email",
  "contact_phone",
  "icp_number",
  "announcement",
  "announcement_enabled",
  "maintenance_mode",
  "register_enabled",
  "min_recharge_amount",
  "max_recharge_amount",
  "after_sale_hours",
  "auto_delivery_enabled",
  "wechat_qr",
  "alipay_qr",
  "usdt_address",
]);

// PUT - Update settings (admin only)
export async function PUT(request: NextRequest) {
  try {
    const rl = apiLimiter(getClientIp(request));
    if (!rl.success) return rateLimitResponse(rl);

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

    // Filter to allowed keys only
    const validEntries = entries.filter(([key]) => ALLOWED_SETTING_KEYS.has(key));
    if (validEntries.length === 0) {
      return NextResponse.json(
        { success: false, message: "无有效的设置项" },
        { status: 400 }
      );
    }

    await Promise.all(
      validEntries.map(([key, value]) =>
        db.siteSetting.upsert({
          where: { key },
          update: { value: String(value) },
          create: { key, value: String(value) },
        })
      )
    );

    log.info(
      { adminId: session.id, keys: validEntries.map(([k]) => k) },
      "Admin updated site settings"
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
