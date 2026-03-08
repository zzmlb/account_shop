import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/server/db";
import { hashPassword, encodeSession } from "@/lib/auth";
import { registerLimiter } from "@/lib/rate-limit";
import { createLogger } from "@/lib/logger";

const log = createLogger("auth/register");

const registerBodySchema = z.object({
  username: z
    .string()
    .min(2, "用户名至少2个字符")
    .max(20, "用户名最多20个字符")
    .regex(/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/, "用户名只能包含字母、数字、下划线或中文"),
  email: z.string().email("请输入有效的邮箱地址"),
  password: z
    .string()
    .min(6, "密码至少6个字符")
    .max(50, "密码最多50个字符")
    .regex(/[A-Za-z]/, "密码需包含至少一个字母")
    .regex(/[0-9]/, "密码需包含至少一个数字"),
});

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const rl = registerLimiter(ip);
    if (!rl.success) {
      return NextResponse.json(
        { success: false, message: "注册请求过于频繁，请5分钟后再试" },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rl.reset - Date.now()) / 1000)) } }
      );
    }

    const body = await request.json();

    const parsed = registerBodySchema.safeParse(body);
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
    const email = parsed.data.email.toLowerCase().trim();

    // Check if username already exists
    const existingUsername = await db.user.findUnique({
      where: { username: username.trim() },
    });
    if (existingUsername) {
      return NextResponse.json(
        { success: false, message: "用户名已被注册" },
        { status: 409 }
      );
    }

    // Check if email already exists (case-insensitive)
    const existingEmail = await db.user.findUnique({
      where: { email },
    });
    if (existingEmail) {
      return NextResponse.json(
        { success: false, message: "邮箱已被注册" },
        { status: 409 }
      );
    }

    // Hash password and create user
    const passwordHash = await hashPassword(password);
    const user = await db.user.create({
      data: {
        username,
        email,
        passwordHash,
        role: "USER",
        balance: 0,
      },
    });

    // Create session token
    const token = encodeSession({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
    });

    const response = NextResponse.json({
      success: true,
      message: "注册成功",
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role.toLowerCase(),
        balance: 0,
      },
    });

    response.cookies.set("session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    log.error({ err: error }, "Register error");
    return NextResponse.json(
      { success: false, message: "注册失败，请稍后再试" },
      { status: 500 }
    );
  }
}
