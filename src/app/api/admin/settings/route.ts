import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { getAdminSession } from "@/lib/admin-auth";
import { createLogger } from "@/lib/logger";
import { apiLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { stripHtml } from "@/lib/sanitize";

const log = createLogger("admin/settings");

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

    // Max value length per key type
    const MAX_LENGTHS: Record<string, number> = {
      site_name: 100,
      site_description: 500,
      site_keywords: 300,
      contact_email: 100,
      contact_phone: 30,
      icp_number: 50,
      announcement: 2000,
      announcement_enabled: 10,
      maintenance_mode: 10,
      register_enabled: 10,
      min_recharge_amount: 20,
      max_recharge_amount: 20,
      after_sale_hours: 10,
      auto_delivery_enabled: 10,
      wechat_qr: 500,
      alipay_qr: 500,
      usdt_address: 200,
    };

    // Sanitize HTML-renderable fields
    const HTML_FIELDS = new Set(["announcement", "site_description"]);

    await Promise.all(
      validEntries.map(([key, value]) => {
        let val = String(value);
        const maxLen = MAX_LENGTHS[key] || 500;
        val = val.slice(0, maxLen);
        if (HTML_FIELDS.has(key)) val = stripHtml(val);
        return db.siteSetting.upsert({
          where: { key },
          update: { value: val },
          create: { key, value: val },
        });
      })
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
