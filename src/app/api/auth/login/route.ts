import { NextRequest, NextResponse } from "next/server";
import { loginSchema } from "@/lib/validators";

// Mock test user — will be replaced with database lookup + bcrypt
const TEST_USER = {
  id: "usr_001",
  username: "admin",
  password: "admin123",
  email: "admin@pj37.com",
  role: "admin" as const,
  balance: 1000,
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
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

    // Mock authentication check
    if (username !== TEST_USER.username || password !== TEST_USER.password) {
      return NextResponse.json(
        {
          success: false,
          message: "用户名或密码错误",
        },
        { status: 401 }
      );
    }

    // Create response with user data (excluding password)
    const userData = {
      id: TEST_USER.id,
      username: TEST_USER.username,
      email: TEST_USER.email,
      role: TEST_USER.role,
      balance: TEST_USER.balance,
    };

    const response = NextResponse.json({
      success: true,
      user: userData,
    });

    // Set a mock session cookie
    response.cookies.set("session", `mock_session_${TEST_USER.id}`, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
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
