import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { hashPassword } from "@/lib/auth";
import { loginLimiter } from "@/lib/rate-limit";
import { createLogger } from "@/lib/logger";
import { resetPasswordSchema, formatZodError } from "@/lib/validators";

export const dynamic = "force-dynamic";
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
    const parsed = resetPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: formatZodError(parsed.error) },
        { status: 400 }
      );
    }

    const { token, password } = parsed.data;

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
