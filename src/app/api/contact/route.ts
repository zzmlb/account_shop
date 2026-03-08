import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { createLogger } from "@/lib/logger";
import { apiLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { stripHtml } from "@/lib/sanitize";

const log = createLogger("contact");

// POST - Submit a contact message
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = apiLimiter(ip);
    if (!rl.success) return rateLimitResponse(rl);

    const body = await request.json();
    const { name, email, subject, message } = body;

    // Validation
    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { success: false, message: "请填写所有必填字段" },
        { status: 400 }
      );
    }

    if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 50) {
      return NextResponse.json(
        { success: false, message: "姓名长度应为2-50字符" },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, message: "邮箱格式不正确" },
        { status: 400 }
      );
    }

    if (typeof subject !== "string" || subject.trim().length < 2 || subject.trim().length > 100) {
      return NextResponse.json(
        { success: false, message: "主题长度应为2-100字符" },
        { status: 400 }
      );
    }

    if (typeof message !== "string" || message.trim().length < 10 || message.trim().length > 2000) {
      return NextResponse.json(
        { success: false, message: "留言内容长度应为10-2000字符" },
        { status: 400 }
      );
    }

    await db.contactMessage.create({
      data: {
        name: stripHtml(name),
        email: email.trim().toLowerCase(),
        subject: stripHtml(subject),
        message: stripHtml(message),
      },
    });

    log.info({ email, subject }, "New contact message received");

    return NextResponse.json({
      success: true,
      message: "留言已提交，我们会尽快回复您",
    });
  } catch (error) {
    log.error({ err: error }, "Contact form submission error");
    return NextResponse.json(
      { success: false, message: "服务器内部错误" },
      { status: 500 }
    );
  }
}
