import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { getSessionFromRequest, verifyPassword, hashPassword } from "@/lib/auth";
import { loginLimiter } from "@/lib/rate-limit";
import { changePasswordSchema, formatZodError } from "@/lib/validators";
import { createLogger } from "@/lib/logger";
import { sendPasswordChanged } from "@/server/services/email";
import { createNotification } from "@/server/services/notification";

const log = createLogger("auth/password");

export async function PUT(request: NextRequest) {
  try {
    // Rate limit password changes
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const rl = loginLimiter(ip + ":passwd");
    if (!rl.success) {
      return NextResponse.json(
        { success: false, message: "操作过于频繁，请稍后再试" },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rl.reset - Date.now()) / 1000)) } }
      );
    }

    // Verify authentication
    const session = getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json(
        { success: false, message: "未登录，请先登录" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = changePasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: formatZodError(parsed.error) },
        { status: 400 }
      );
    }
    const { currentPassword, newPassword } = parsed.data;

    // Find user in database
    const user = await db.user.findUnique({
      where: { id: session.id },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "用户不存在" },
        { status: 404 }
      );
    }

    // Verify current password
    const valid = await verifyPassword(currentPassword, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { success: false, message: "当前密码错误" },
        { status: 403 }
      );
    }

    // Hash new password and update
    const newHash = await hashPassword(newPassword);
    await db.user.update({
      where: { id: session.id },
      data: { passwordHash: newHash },
    });

    log.info({ userId: session.id }, "Password changed successfully");

    // Send email notification (fire-and-forget)
    if (user.email) {
      sendPasswordChanged({
        to: user.email,
        username: user.username,
        ip,
        time: new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" }),
      }).catch((err) => {
        log.error({ err, userId: session.id }, "Failed to send password change email");
      });
    }

    // Create in-app notification (fire-and-forget)
    createNotification({
      userId: session.id,
      type: "SYSTEM",
      title: "密码已修改",
      content: `您的账号密码已于 ${new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })} 修改成功。如非本人操作，请立即联系客服。`,
    });

    // Force logout: clear session cookie so user must re-login
    const response = NextResponse.json({
      success: true,
      message: "密码修改成功，请重新登录",
    });
    response.cookies.set("session", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
    return response;
  } catch (error) {
    log.error({ err: error }, "Password change error");
    return NextResponse.json(
      { success: false, message: "服务器内部错误" },
      { status: 500 }
    );
  }
}
