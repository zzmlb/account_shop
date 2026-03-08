import { NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";

const log = createLogger("auth/logout");

export async function POST() {
  try {
    const response = NextResponse.json({
      success: true,
      message: "已成功退出登录",
    });

    // Clear the session cookie
    response.cookies.set("session", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0, // Expire immediately
    });

    return response;
  } catch (error) {
    log.error({ err: error }, "Logout error");
    return NextResponse.json(
      {
        success: false,
        message: "退出登录失败",
      },
      { status: 500 }
    );
  }
}
