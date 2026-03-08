import { NextRequest, NextResponse } from "next/server";
import { decodeSession } from "@/lib/auth";
import { createLogger } from "@/lib/logger";
import { apiLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import nodemailer from "nodemailer";

const log = createLogger("admin/test-email");

export async function POST(request: NextRequest) {
  try {
    const rl = apiLimiter(getClientIp(request));
    if (!rl.success) return rateLimitResponse(rl);

    const session = decodeSession(
      request.cookies.get("session")?.value || ""
    );
    if (!session) {
      return NextResponse.json(
        { success: false, message: "未登录" },
        { status: 401 }
      );
    }

    const role = session.role.toUpperCase();
    if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { success: false, message: "无管理员权限" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { to, smtpHost, smtpPort, smtpUser, smtpPass, senderName } = body;

    if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      return NextResponse.json(
        { success: false, message: "请输入有效的收件邮箱" },
        { status: 400 }
      );
    }

    // Use provided SMTP config or fallback to env vars
    const host = smtpHost || process.env.SMTP_HOST;
    const port = parseInt(smtpPort || process.env.SMTP_PORT || "587", 10);
    const user = smtpUser || process.env.SMTP_USER;
    const pass = smtpPass || process.env.SMTP_PASS;
    const from = senderName
      ? `${senderName} <${user}>`
      : process.env.EMAIL_FROM || `PJ37 Digital <${user}>`;

    if (!host || !user || !pass) {
      return NextResponse.json(
        { success: false, message: "SMTP 配置不完整，请填写服务器、用户名和密码" },
        { status: 400 }
      );
    }

    const siteName = process.env.NEXT_PUBLIC_SITE_NAME || "PJ37 Digital";

    const html = `
      <div style="max-width:520px;margin:0 auto;font-family:system-ui,-apple-system,sans-serif;color:#1a1a2e;">
        <div style="background:linear-gradient(135deg,#6c5ce7,#a29bfe);padding:24px;text-align:center;border-radius:12px 12px 0 0;">
          <h1 style="color:#fff;margin:0;font-size:20px;">${siteName} 邮件测试</h1>
        </div>
        <div style="padding:24px;background:#fff;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 12px 12px;">
          <p style="margin:0 0 12px;">这是一封来自 <strong>${siteName}</strong> 管理后台的测试邮件。</p>
          <p style="margin:0 0 12px;">如果您收到了这封邮件，说明 SMTP 邮件配置正常工作。</p>
          <div style="background:#f8f9fa;padding:12px 16px;border-radius:8px;margin:16px 0;">
            <p style="margin:0;font-size:13px;color:#666;">
              <strong>SMTP 服务器:</strong> ${host}:${port}<br>
              <strong>发送账户:</strong> ${user}<br>
              <strong>发送时间:</strong> ${new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}
            </p>
          </div>
          <p style="margin:16px 0 0;font-size:12px;color:#999;">此邮件由管理员手动触发，请忽略。</p>
        </div>
      </div>
    `;

    // Create transient SMTP transport for testing
    const transport = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });

    await transport.sendMail({
      from,
      to,
      subject: `[${siteName}] 邮件配置测试`,
      html,
    });

    transport.close();

    log.info({ adminId: session.id, to, smtpHost: host }, "Test email sent successfully");

    return NextResponse.json({
      success: true,
      message: `测试邮件已发送至 ${to}`,
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "未知错误";
    log.error({ err: error }, "Test email failed");
    return NextResponse.json(
      { success: false, message: `发送失败: ${errMsg}` },
      { status: 500 }
    );
  }
}
