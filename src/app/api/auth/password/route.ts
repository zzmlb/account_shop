import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { getSessionFromRequest, verifyPassword, hashPassword } from "@/lib/auth";
import { loginLimiter } from "@/lib/rate-limit";

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
    const { currentPassword, newPassword } = body;

    // Validate input
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { success: false, message: "请提供当前密码和新密码" },
        { status: 400 }
      );
    }

    if (typeof newPassword !== "string" || newPassword.length < 6) {
      return NextResponse.json(
        { success: false, message: "新密码至少需要6个字符" },
        { status: 400 }
      );
    }

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

    return NextResponse.json({
      success: true,
      message: "密码修改成功",
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "服务器内部错误" },
      { status: 500 }
    );
  }
}
