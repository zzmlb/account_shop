import { NextRequest, NextResponse } from "next/server";
import { forgotPasswordSchema } from "@/lib/validators";
import { db } from "@/server/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const parsed = forgotPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: "请输入有效的邮箱地址",
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { email } = parsed.data;

    // Look up user by email — we don't reveal whether the email exists
    const user = await db.user.findFirst({
      where: { email },
      select: { id: true },
    });

    if (user) {
      // TODO: In the future, generate a reset token, store it, and send an email.
      // For now we just accept the request silently.
      console.log(`Password reset requested for user ${user.id}`);
    }

    // Always return the same success response regardless of whether the email exists
    return NextResponse.json({
      success: true,
      message: "如果该邮箱已注册，我们会发送重置链接",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { success: false, message: "服务器内部错误" },
      { status: 500 }
    );
  }
}
