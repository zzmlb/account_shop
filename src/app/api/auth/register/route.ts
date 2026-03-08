import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/server/db";
import { hashPassword, encodeSession } from "@/lib/auth";

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
    .max(50, "密码最多50个字符"),
});

export async function POST(request: NextRequest) {
  try {
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

    const { username, email, password } = parsed.data;

    // Check if username already exists
    const existingUsername = await db.user.findUnique({
      where: { username },
    });
    if (existingUsername) {
      return NextResponse.json(
        { success: false, message: "用户名已被注册" },
        { status: 409 }
      );
    }

    // Check if email already exists
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
  } catch {
    return NextResponse.json(
      { success: false, message: "服务器内部错误" },
      { status: 500 }
    );
  }
}
