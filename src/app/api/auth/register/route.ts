import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Server-side validation schema (no confirmPassword needed)
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

    // Validate input
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

    const { username, email } = parsed.data;

    // Mock: In future, this will:
    // 1. Check if username/email already exists in database
    // 2. Hash password with bcrypt
    // 3. Create user record in database
    // 4. Send verification email

    // For now, always succeed
    return NextResponse.json({
      success: true,
      message: "注册成功",
      user: {
        id: `usr_${Date.now()}`,
        username,
        email,
        role: "user",
      },
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
