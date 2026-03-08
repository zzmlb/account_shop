import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { createLogger } from "@/lib/logger";

const log = createLogger("settings");

export const dynamic = "force-dynamic";

// Public keys that are safe to expose to the frontend
const PUBLIC_KEYS = [
  "site_name",
  "site_description",
  "logo_url",
  "announcement",
];

export async function GET() {
  try {
    const rows = await db.siteSetting.findMany({
      where: { key: { in: PUBLIC_KEYS } },
    });

    const settings: Record<string, string> = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }

    return NextResponse.json({ success: true, settings });
  } catch (error) {
    log.error({ err: error }, "Settings GET error");
    return NextResponse.json(
      { success: false, message: "获取站点设置失败" },
      { status: 500 }
    );
  }
}
