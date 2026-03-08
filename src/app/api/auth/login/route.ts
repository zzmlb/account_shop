import { NextRequest, NextResponse } from "next/server";
import { loginSchema } from "@/lib/validators";
import { db } from "@/server/db";
import { verifyPassword, encodeSession } from "@/lib/auth";
import { loginLimiter } from "@/lib/rate-limit";
import { createLogger } from "@/lib/logger";

const log = createLogger("auth/login");

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const rl = loginLimiter(ip);
    if (!rl.success) {
      return NextResponse.json(
        { success: false, message: "登录尝试过于频繁，请稍后再试" },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rl.reset - Date.now()) / 1000)) } }
      );
    }

    const body = await request.json();

    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: "输入数据格式错误",
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { username, password } = parsed.data;

    // Find user in database
    const user = await db.user.findFirst({
      where: {
        OR: [{ username }, { email: username }],
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "用户名或密码错误" },
        { status: 401 }
      );
    }

    if (user.status === "BANNED") {
      return NextResponse.json(
        { success: false, message: "账户已被封禁，请联系客服" },
        { status: 403 }
      );
    }

    // Verify password
    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { success: false, message: "用户名或密码错误" },
        { status: 401 }
      );
    }

    const userData = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role.toLowerCase() as "user" | "admin" | "super_admin",
      balance: Number(user.balance),
    };

    // Create session token
    const token = encodeSession({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
    });

    log.info({ userId: user.id, username: user.username }, "User logged in successfully");

    const response = NextResponse.json({
      success: true,
      user: userData,
    });

    response.cookies.set("session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error) {
    log.error({ err: error }, "Login error");
    return NextResponse.json(
      { success: false, message: "服务器内部错误" },
      { status: 500 }
    );
  }
}
