import { NextRequest, NextResponse } from "next/server";
import { decodeSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("session")?.value;

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: "未登录",
        },
        { status: 401 }
      );
    }

    const user = decodeSession(token);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "会话无效或已过期",
        },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user,
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "服务器内部错误",
      },
      { status: 500 }
    );
  }
}
