import { NextRequest, NextResponse } from "next/server";
import { decodeSession } from "@/lib/auth";
import { db } from "@/server/db";

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
  } catch {
    return NextResponse.json(
      { success: false, message: "服务器内部错误" },
      { status: 500 }
    );
  }
}
