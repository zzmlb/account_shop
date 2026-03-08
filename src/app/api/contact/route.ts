import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { createLogger } from "@/lib/logger";
import { contactLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { stripHtml } from "@/lib/sanitize";
import { contactMessageSchema, formatZodError } from "@/lib/validators";

export const dynamic = "force-dynamic";
const log = createLogger("contact");

// POST - Submit a contact message
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = contactLimiter(ip);
    if (!rl.success) return rateLimitResponse(rl);

    const body = await request.json();
    const { name, email, subject, message, website, _t } = body;

    // Honeypot anti-spam: if the hidden field is filled, it's a bot
    if (website) {
      return NextResponse.json({
        success: true,
        message: "留言已提交，我们会尽快回复您",
      });
    }

    // Time-based bot detection: form must be open for at least 3 seconds
    if (_t && typeof _t === "number") {
      const elapsed = Date.now() - _t;
      if (elapsed < 3000) {
        log.info({ ip, elapsed }, "Contact form submitted too fast (likely bot)");
        return NextResponse.json({
          success: true,
          message: "留言已提交，我们会尽快回复您",
        });
      }
    }

    // Validation
    const parsed = contactMessageSchema.safeParse({ name, email, subject, message, category: body.category });
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: formatZodError(parsed.error) },
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
