import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { hashPassword } from "@/lib/auth";
import { loginLimiter } from "@/lib/rate-limit";
import { createLogger } from "@/lib/logger";

const log = createLogger("auth/reset-password");

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const rl = loginLimiter(ip + ":reset");
    if (!rl.success) {
      return NextResponse.json(
        { success: false, message: "请求过于频繁，请稍后再试" },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { token, password } = body;

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { success: false, message: "无效的重置链接" },
        { status: 400 }
      );
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json(
        { success: false, message: "密码长度至少为6位" },
        { status: 400 }
      );
    }

    if (password.length > 50) {
      return NextResponse.json(
        { success: false, message: "密码最多50个字符" },
        { status: 400 }
      );
    }

    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      return NextResponse.json(
        { success: false, message: "密码需包含至少一个字母和一个数字" },
        { status: 400 }
      );
    }

    // Find the token
    const resetRecord = await db.passwordReset.findUnique({
      where: { token },
      include: { user: { select: { id: true, username: true } } },
    });

    if (!resetRecord) {
      return NextResponse.json(
        { success: false, message: "无效的重置链接" },
        { status: 400 }
      );
    }

    // Check if already used
    if (resetRecord.usedAt) {
      return NextResponse.json(
        { success: false, message: "此重置链接已使用" },
        { status: 400 }
      );
    }

    // Check expiry
    if (new Date() > resetRecord.expiresAt) {
      return NextResponse.json(
        { success: false, message: "重置链接已过期，请重新申请" },
        { status: 400 }
      );
    }

    // Hash new password and update user (with optimistic lock on usedAt)
    const passwordHash = await hashPassword(password);

    await db.$transaction(async (tx) => {
      // Re-check token hasn't been used (prevents race condition)
      const updated = await tx.passwordReset.updateMany({
        where: { id: resetRecord.id, usedAt: null },
        data: { usedAt: new Date() },
      });
      if (updated.count === 0) {
        throw new Error("TOKEN_ALREADY_USED");
      }

      await tx.user.update({
        where: { id: resetRecord.userId },
        data: { passwordHash },
      });
    });

    log.info({ userId: resetRecord.userId }, "Password reset completed");

    return NextResponse.json({
      success: true,
      message: "密码重置成功，请使用新密码登录",
    });
  } catch (error) {
    if (error instanceof Error && error.message === "TOKEN_ALREADY_USED") {
      return NextResponse.json(
        { success: false, message: "此重置链接已使用" },
        { status: 400 }
      );
    }
    log.error({ err: error }, "Reset password error");
    return NextResponse.json(
      { success: false, message: "服务器内部错误" },
      { status: 500 }
    );
  }
}
