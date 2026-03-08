import { NextRequest, NextResponse } from "next/server";
import { decodeSession } from "@/lib/auth";
import { db } from "@/server/db";
import { createLogger } from "@/lib/logger";

const log = createLogger("auth/email");

export async function PUT(request: NextRequest) {
  try {
    const session = decodeSession(
      request.cookies.get("session")?.value || ""
    );

    if (!session) {
      return NextResponse.json(
        { success: false, message: "未登录" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { success: false, message: "请输入邮箱地址" },
        { status: 400 }
      );
    }

    const trimmed = email.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      return NextResponse.json(
        { success: false, message: "邮箱格式不正确" },
        { status: 400 }
      );
    }

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
