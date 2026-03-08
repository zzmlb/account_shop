import { NextRequest, NextResponse } from "next/server";
import { getUserSession } from "@/lib/auth";
import { db } from "@/server/db";
import { createLogger } from "@/lib/logger";
import { apiLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { updateEmailSchema, formatZodError } from "@/lib/validators";

export const dynamic = "force-dynamic";
const log = createLogger("auth/email");

export async function PUT(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = apiLimiter(ip);
    if (!rl.success) return rateLimitResponse(rl);

    const { session, error } = getUserSession(request);
    if (error) return error;

    const body = await request.json();
    const parsed = updateEmailSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: formatZodError(parsed.error) },
        { status: 400 }
      );
    }

    const trimmed = parsed.data.email;

    // Check if email is already in use by another user
    const existing = await db.user.findUnique({
      where: { email: trimmed },
    });

    if (existing && existing.id !== session.id) {
      return NextResponse.json(
        { success: false, message: "该邮箱已被其他账户使用" },
        { status: 409 }
      );
    }

    // Update user email
    await db.user.update({
      where: { id: session.id },
      data: { email: trimmed },
    });

    return NextResponse.json({
      success: true,
      message: "邮箱已更新",
      email: trimmed,
    });
  } catch (error) {
    log.error({ err: error }, "Email update error");
    return NextResponse.json(
      { success: false, message: "服务器内部错误" },
      { status: 500 }
    );
  }
}
