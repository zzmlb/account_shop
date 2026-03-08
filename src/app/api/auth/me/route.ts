import { NextRequest, NextResponse } from "next/server";
import { decodeSession, encodeSession } from "@/lib/auth";
import { db } from "@/server/db";
import { createLogger } from "@/lib/logger";

const log = createLogger("auth/me");

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("session")?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, message: "未登录" },
        { status: 401 }
      );
    }

    const session = decodeSession(token);
    if (!session) {
      return NextResponse.json(
        { success: false, message: "会话无效或已过期" },
        { status: 401 }
      );
    }

    // Fetch fresh user data from DB
    const user = await db.user.findUnique({
      where: { id: session.id },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        balance: true,
        avatar: true,
        status: true,
      },
    });

    if (!user || user.status === "BANNED") {
      return NextResponse.json(
        { success: false, message: user ? "账户已被封禁" : "用户不存在" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role.toLowerCase(),
        balance: Number(user.balance),
        avatar: user.avatar,
      },
    });
  } catch (error) {
    log.error({ err: error }, "Session check error");
    return NextResponse.json(
      { success: false, message: "服务器内部错误" },
      { status: 500 }
    );
  }
}

// PUT - Update user profile (avatar)
export async function PUT(request: NextRequest) {
  try {
    const token = request.cookies.get("session")?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, message: "未登录" },
        { status: 401 }
      );
    }

    const session = decodeSession(token);
    if (!session) {
      return NextResponse.json(
        { success: false, message: "会话无效或已过期" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { avatar } = body;

    if (avatar !== null && avatar !== undefined && typeof avatar !== "string") {
      return NextResponse.json(
        { success: false, message: "头像地址格式不正确" },
        { status: 400 }
      );
    }

    // Validate avatar URL if provided
    if (avatar && avatar.length > 500) {
      return NextResponse.json(
        { success: false, message: "头像地址过长" },
        { status: 400 }
      );
    }

    const user = await db.user.update({
      where: { id: session.id },
      data: { avatar: avatar || null },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        balance: true,
        avatar: true,
      },
    });

    // Re-encode session with updated avatar
    const newToken = encodeSession({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
    });

    const response = NextResponse.json({
      success: true,
      message: "头像已更新",
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role.toLowerCase(),
        balance: Number(user.balance),
        avatar: user.avatar,
      },
    });

    response.cookies.set("session", newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    log.error({ err: error }, "Profile update error");
    return NextResponse.json(
      { success: false, message: "更新失败" },
      { status: 500 }
    );
  }
}
