import { NextRequest, NextResponse } from "next/server";
import { forgotPasswordSchema } from "@/lib/validators";
import { db } from "@/server/db";
import { loginLimiter } from "@/lib/rate-limit";
import { createLogger } from "@/lib/logger";

const log = createLogger("auth/forgot-password");

export async function POST(request: NextRequest) {
  try {
    // Rate limit: same as login (5 per 60s)
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const rl = loginLimiter(ip + ":forgot");
    if (!rl.success) {
      return NextResponse.json(
        { success: false, message: "请求过于频繁，请稍后再试" },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rl.reset - Date.now()) / 1000)) } }
      );
    }

    const body = await request.json();

    const parsed = forgotPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: "请输入有效的邮箱地址",
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { email } = parsed.data;

    // Look up user by email — we don't reveal whether the email exists
    const user = await db.user.findFirst({
      where: { email },
      select: { id: true },
    });

    if (user) {
      // TODO: In the future, generate a reset token, store it, and send an email.
      // For now we just accept the request silently.
      log.info({ userId: user.id }, "Password reset requested");
    }

    // Always return the same success response regardless of whether the email exists
    return NextResponse.json({
      success: true,
      message: "如果该邮箱已注册，我们会发送重置链接",
    });
  } catch (error) {
    log.error({ err: error }, "Forgot password error");
    return NextResponse.json(
      { success: false, message: "服务器内部错误" },
      { status: 500 }
    );
  }
}
