import { NextResponse } from "next/server";
import { db } from "@/server/db";

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
  } catch {
    return NextResponse.json(
      { success: false, message: "服务器错误" },
      { status: 500 }
    );
  }
}
