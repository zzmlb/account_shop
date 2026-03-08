import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { createLogger } from "@/lib/logger";
import { apiLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

const log = createLogger("settings");

export const dynamic = "force-dynamic";

// Public keys that are safe to expose to the frontend
const PUBLIC_KEYS = [
  "site_name",
  "site_description",
  "logo_url",
  "announcement",
];

export async function GET(request: NextRequest) {
  const rl = apiLimiter(getClientIp(request));
  if (!rl.success) return rateLimitResponse(rl);
  try {
    const rows = await db.siteSetting.findMany({
      where: { key: { in: PUBLIC_KEYS } },
    });

    const settings: Record<string, string> = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }

    const res = NextResponse.json({ success: true, settings });
    res.headers.set("Cache-Control", "public, s-maxage=120, stale-while-revalidate=600");
    return res;
  } catch (error) {
    log.error({ err: error }, "Settings GET error");
    return NextResponse.json(
      { success: false, message: "获取站点设置失败" },
      { status: 500 }
    );
  }
}
