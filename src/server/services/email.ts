import { Resend } from "resend";
import nodemailer from "nodemailer";
import { createLogger } from "@/lib/logger";

const log = createLogger("email");

// Resend client (preferred if configured)
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

// SMTP transport (fallback when Resend not configured)
const smtpTransport = (() => {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
})();

const FROM_EMAIL = process.env.EMAIL_FROM || "PJ37 Digital <noreply@pj37.com>";
const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || "PJ37 Digital";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

/** Send email via Resend or SMTP */
async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (resend) {
    await resend.emails.send({ from: FROM_EMAIL, to, subject, html });
    return true;
  }
  if (smtpTransport) {
    await smtpTransport.sendMail({ from: FROM_EMAIL, to, subject, html });
    return true;
  }
  log.warn("No email transport configured (set RESEND_API_KEY or SMTP_HOST/SMTP_USER/SMTP_PASS)");
  return false;
}

interface OrderEmailData {
  to: string;
  orderNo: string;
  items: { name: string; quantity: number; unitPrice: number }[];
  totalAmount: number;
  paymentMethod: string;
}

interface CardKeyEmailData {
  to: string;
  orderNo: string;
  items: { productName: string; cardKeys: string[] }[];
}

interface PasswordResetEmailData {
  to: string;
  resetToken: string;
  username: string;
}

function orderConfirmationHtml(data: OrderEmailData): string {
  const itemRows = data.items
    .map(
      (item) =>
        `<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;">${item.name}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">¥${item.unitPrice.toFixed(2)}</td>
        </tr>`
    )
    .join("");

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">
    <div style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
      <div style="background:linear-gradient(135deg,#6c5ce7,#00d2ff);padding:30px;text-align:center;">
        <h1 style="color:#fff;margin:0;font-size:24px;">${SITE_NAME}</h1>
        <p style="color:rgba(255,255,255,0.9);margin:8px 0 0;">订单确认</p>
      </div>
      <div style="padding:30px;">
        <p style="color:#333;font-size:16px;margin:0 0 20px;">您的订单已创建成功！</p>
        <div style="background:#f8f9fa;border-radius:8px;padding:16px;margin-bottom:20px;">
          <p style="margin:0 0 8px;color:#666;font-size:14px;">订单编号</p>
          <p style="margin:0;color:#333;font-size:18px;font-weight:600;">${data.orderNo}</p>
        </div>
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
          <thead>
            <tr style="background:#f8f9fa;">
              <th style="padding:10px 12px;text-align:left;font-size:13px;color:#666;">商品</th>
              <th style="padding:10px 12px;text-align:center;font-size:13px;color:#666;">数量</th>
              <th style="padding:10px 12px;text-align:right;font-size:13px;color:#666;">单价</th>
            </tr>
          </thead>
          <tbody>${itemRows}</tbody>
          <tfoot>
            <tr>
              <td colspan="2" style="padding:12px;text-align:right;font-weight:600;">合计</td>
              <td style="padding:12px;text-align:right;font-weight:600;color:#6c5ce7;">¥${data.totalAmount.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
        <p style="color:#666;font-size:14px;">支付方式：${data.paymentMethod}</p>
        <div style="text-align:center;margin-top:30px;">
          <a href="${SITE_URL}/order/${data.orderNo}" style="display:inline-block;background:#6c5ce7;color:#fff;padding:12px 30px;border-radius:8px;text-decoration:none;font-weight:600;">查看订单</a>
        </div>
      </div>
      <div style="padding:20px 30px;background:#f8f9fa;text-align:center;">
        <p style="margin:0;color:#999;font-size:12px;">此邮件由 ${SITE_NAME} 自动发送，请勿回复。</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

function cardKeyDeliveryHtml(data: CardKeyEmailData): string {
  const totalKeys = data.items.reduce((sum, item) => sum + item.cardKeys.length, 0);
  const sections = data.items
    .map(
      (item) =>
        `<div style="margin-bottom:20px;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;">
          <div style="background:#f8f9fa;padding:10px 14px;border-bottom:1px solid #e0e0e0;">
            <h3 style="color:#333;font-size:15px;margin:0;">${item.productName} <span style="color:#999;font-size:13px;">(${item.cardKeys.length}个)</span></h3>
          </div>
          <div style="padding:10px 14px;">
          ${item.cardKeys
            .map(
              (key, idx) =>
                `<div style="background:#f0f7ff;border:1px solid #d0e3ff;border-radius:6px;padding:10px 14px;margin-bottom:6px;font-family:'Courier New',monospace;font-size:14px;color:#1a1a1a;word-break:break-all;line-height:1.5;">${idx + 1}. ${key}</div>`
            )
            .join("")}
          </div>
        </div>`
    )
    .join("");
  void totalKeys;

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">
    <div style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
      <div style="background:linear-gradient(135deg,#1db954,#191414);padding:30px;text-align:center;">
        <h1 style="color:#fff;margin:0;font-size:24px;">${SITE_NAME}</h1>
        <p style="color:rgba(255,255,255,0.9);margin:8px 0 0;">卡密发货通知</p>
      </div>
      <div style="padding:30px;">
        <p style="color:#333;font-size:16px;margin:0 0 10px;">您的订单 <strong>${data.orderNo}</strong> 已完成支付！</p>
        <p style="color:#666;font-size:14px;margin:0 0 20px;">以下是您购买的卡密信息，请妥善保管：</p>
        ${sections}
        <div style="background:#fff3cd;border-radius:8px;padding:14px;margin-top:20px;">
          <p style="margin:0;color:#856404;font-size:13px;">请及时使用卡密，如有问题请联系客服。卡密信息仅通过此邮件发送，请勿泄露给他人。</p>
        </div>
        <div style="text-align:center;margin-top:30px;">
          <a href="${SITE_URL}/order/${data.orderNo}" style="display:inline-block;background:#1db954;color:#fff;padding:12px 30px;border-radius:8px;text-decoration:none;font-weight:600;">查看订单详情</a>
        </div>
      </div>
      <div style="padding:20px 30px;background:#f8f9fa;text-align:center;">
        <p style="margin:0;color:#999;font-size:12px;">此邮件由 ${SITE_NAME} 自动发送，请勿回复。</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

function passwordResetHtml(data: PasswordResetEmailData): string {
  const resetLink = `${SITE_URL}/reset-password?token=${data.resetToken}`;
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">
    <div style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
      <div style="background:linear-gradient(135deg,#e50914,#b20710);padding:30px;text-align:center;">
        <h1 style="color:#fff;margin:0;font-size:24px;">${SITE_NAME}</h1>
        <p style="color:rgba(255,255,255,0.9);margin:8px 0 0;">密码重置</p>
      </div>
      <div style="padding:30px;">
        <p style="color:#333;font-size:16px;margin:0 0 20px;">您好 ${data.username}，</p>
        <p style="color:#666;font-size:14px;margin:0 0 20px;">我们收到了您的密码重置请求。请点击下方按钮重置密码：</p>
        <div style="text-align:center;margin:30px 0;">
          <a href="${resetLink}" style="display:inline-block;background:#e50914;color:#fff;padding:14px 40px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;">重置密码</a>
        </div>
        <p style="color:#999;font-size:13px;margin:0 0 8px;">如果按钮无法点击，请复制以下链接到浏览器：</p>
        <p style="color:#6c5ce7;font-size:13px;word-break:break-all;margin:0 0 20px;">${resetLink}</p>
        <div style="background:#f8f9fa;border-radius:8px;padding:14px;">
          <p style="margin:0;color:#666;font-size:13px;">此链接将在 30 分钟后失效。如果您没有请求密码重置，请忽略此邮件。</p>
        </div>
      </div>
      <div style="padding:20px 30px;background:#f8f9fa;text-align:center;">
        <p style="margin:0;color:#999;font-size:12px;">此邮件由 ${SITE_NAME} 自动发送，请勿回复。</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export async function sendOrderConfirmation(data: OrderEmailData): Promise<boolean> {
  try {
    const sent = await sendEmail(
      data.to,
      `订单确认 - ${data.orderNo} | ${SITE_NAME}`,
      orderConfirmationHtml(data),
    );
    if (sent) log.info({ orderNo: data.orderNo, to: data.to }, "Order confirmation email sent");
    return sent;
  } catch (error) {
    log.error({ err: error, orderNo: data.orderNo }, "Failed to send order confirmation email");
    return false;
  }
}

export async function sendCardKeyDelivery(data: CardKeyEmailData): Promise<boolean> {
  try {
    const sent = await sendEmail(
      data.to,
      `卡密发货 - ${data.orderNo} | ${SITE_NAME}`,
      cardKeyDeliveryHtml(data),
    );
    if (sent) log.info({ orderNo: data.orderNo, to: data.to }, "Card key delivery email sent");
    return sent;
  } catch (error) {
    log.error({ err: error, orderNo: data.orderNo }, "Failed to send card key delivery email");
    return false;
  }
}

interface RefundEmailData {
  to: string;
  orderNo: string;
  amount: number;
  status: "approved" | "rejected";
  adminNote?: string;
}

function refundNotificationHtml(data: RefundEmailData): string {
  const isApproved = data.status === "approved";
  const statusText = isApproved ? "退款已通过" : "退款申请被拒绝";
  const gradientColors = isApproved
    ? "#1db954,#148c3e"
    : "#e50914,#b20710";
  const statusColor = isApproved ? "#1db954" : "#e50914";

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">
    <div style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
      <div style="background:linear-gradient(135deg,${gradientColors});padding:30px;text-align:center;">
        <h1 style="color:#fff;margin:0;font-size:24px;">${SITE_NAME}</h1>
        <p style="color:rgba(255,255,255,0.9);margin:8px 0 0;">${statusText}</p>
      </div>
      <div style="padding:30px;">
        <p style="color:#333;font-size:16px;margin:0 0 20px;">您的订单 <strong>${data.orderNo}</strong> 的退款申请已处理。</p>
        <div style="background:#f8f9fa;border-radius:8px;padding:16px;margin-bottom:20px;">
          <p style="margin:0 0 8px;color:#666;font-size:14px;">处理结果</p>
          <p style="margin:0;color:${statusColor};font-size:18px;font-weight:600;">${statusText}</p>
          ${isApproved ? `<p style="margin:8px 0 0;color:#333;font-size:16px;">退款金额：¥${data.amount.toFixed(2)}</p>
          <p style="margin:4px 0 0;color:#666;font-size:13px;">金额已退还至您的账户余额</p>` : ""}
        </div>
        ${data.adminNote ? `
        <div style="background:#f0f7ff;border-radius:8px;padding:14px;margin-bottom:20px;">
          <p style="margin:0 0 4px;color:#666;font-size:13px;">管理员备注：</p>
          <p style="margin:0;color:#333;font-size:14px;">${data.adminNote}</p>
        </div>` : ""}
        <div style="text-align:center;margin-top:30px;">
          <a href="${SITE_URL}/order/${data.orderNo}" style="display:inline-block;background:#6c5ce7;color:#fff;padding:12px 30px;border-radius:8px;text-decoration:none;font-weight:600;">查看订单详情</a>
        </div>
      </div>
      <div style="padding:20px 30px;background:#f8f9fa;text-align:center;">
        <p style="margin:0;color:#999;font-size:12px;">此邮件由 ${SITE_NAME} 自动发送，请勿回复。</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export async function sendRefundNotification(data: RefundEmailData): Promise<boolean> {
  try {
    const statusLabel = data.status === "approved" ? "已通过" : "已拒绝";
    const sent = await sendEmail(
      data.to,
      `退款${statusLabel} - ${data.orderNo} | ${SITE_NAME}`,
      refundNotificationHtml(data),
    );
    if (sent) log.info({ orderNo: data.orderNo, to: data.to, status: data.status }, "Refund notification email sent");
    return sent;
  } catch (error) {
    log.error({ err: error, orderNo: data.orderNo }, "Failed to send refund notification email");
    return false;
  }
}

// ==================== Balance Adjustment ====================
interface BalanceAdjustEmailData {
  to: string;
  username: string;
  amount: number;
  newBalance: number;
  reason?: string;
}

function balanceAdjustHtml(data: BalanceAdjustEmailData): string {
  const isPositive = data.amount > 0;
  const amountText = isPositive ? `+¥${data.amount.toFixed(2)}` : `-¥${Math.abs(data.amount).toFixed(2)}`;
  const gradientColors = isPositive ? "#1db954,#148c3e" : "#ff6b35,#e50914";

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">
    <div style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
      <div style="background:linear-gradient(135deg,${gradientColors});padding:30px;text-align:center;">
        <h1 style="color:#fff;margin:0;font-size:24px;">${SITE_NAME}</h1>
        <p style="color:rgba(255,255,255,0.9);margin:8px 0 0;">余额变动通知</p>
      </div>
      <div style="padding:30px;">
        <p style="color:#333;font-size:16px;margin:0 0 20px;">您好 ${data.username}，</p>
        <p style="color:#666;font-size:14px;margin:0 0 20px;">您的账户余额已由管理员调整：</p>
        <div style="background:#f8f9fa;border-radius:8px;padding:16px;margin-bottom:20px;">
          <p style="margin:0 0 8px;color:#666;font-size:14px;">变动金额</p>
          <p style="margin:0;color:${isPositive ? "#1db954" : "#e50914"};font-size:22px;font-weight:700;">${amountText}</p>
          <p style="margin:8px 0 0;color:#666;font-size:14px;">当前余额：¥${data.newBalance.toFixed(2)}</p>
        </div>
        ${data.reason ? `
        <div style="background:#f0f7ff;border-radius:8px;padding:14px;margin-bottom:20px;">
          <p style="margin:0 0 4px;color:#666;font-size:13px;">备注：</p>
          <p style="margin:0;color:#333;font-size:14px;">${data.reason}</p>
        </div>` : ""}
        <div style="text-align:center;margin-top:30px;">
          <a href="${SITE_URL}/dashboard/balance" style="display:inline-block;background:#6c5ce7;color:#fff;padding:12px 30px;border-radius:8px;text-decoration:none;font-weight:600;">查看余额明细</a>
        </div>
      </div>
      <div style="padding:20px 30px;background:#f8f9fa;text-align:center;">
        <p style="margin:0;color:#999;font-size:12px;">此邮件由 ${SITE_NAME} 自动发送，请勿回复。</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export async function sendBalanceAdjustment(data: BalanceAdjustEmailData): Promise<boolean> {
  try {
    const label = data.amount > 0 ? "充值" : "扣减";
    const sent = await sendEmail(
      data.to,
      `余额${label}通知 | ${SITE_NAME}`,
      balanceAdjustHtml(data),
    );
    if (sent) log.info({ to: data.to, amount: data.amount }, "Balance adjustment email sent");
    return sent;
  } catch (error) {
    log.error({ err: error }, "Failed to send balance adjustment email");
    return false;
  }
}

// ==================== Account Status Change ====================
interface AccountStatusEmailData {
  to: string;
  username: string;
  newStatus: "BANNED" | "ACTIVE";
  reason?: string;
}

function accountStatusHtml(data: AccountStatusEmailData): string {
  const isBanned = data.newStatus === "BANNED";
  const statusText = isBanned ? "账户已被暂停" : "账户已恢复";
  const gradientColors = isBanned ? "#e50914,#b20710" : "#1db954,#148c3e";

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">
    <div style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
      <div style="background:linear-gradient(135deg,${gradientColors});padding:30px;text-align:center;">
        <h1 style="color:#fff;margin:0;font-size:24px;">${SITE_NAME}</h1>
        <p style="color:rgba(255,255,255,0.9);margin:8px 0 0;">${statusText}</p>
      </div>
      <div style="padding:30px;">
        <p style="color:#333;font-size:16px;margin:0 0 20px;">您好 ${data.username}，</p>
        ${isBanned
          ? `<p style="color:#666;font-size:14px;margin:0 0 20px;">由于违反平台规则，您的账户已被暂停使用。暂停期间您将无法登录和进行任何操作。</p>`
          : `<p style="color:#666;font-size:14px;margin:0 0 20px;">您的账户已恢复正常使用，您可以正常登录和使用平台服务。</p>`
        }
        ${data.reason ? `
        <div style="background:#f0f7ff;border-radius:8px;padding:14px;margin-bottom:20px;">
          <p style="margin:0 0 4px;color:#666;font-size:13px;">原因：</p>
          <p style="margin:0;color:#333;font-size:14px;">${data.reason}</p>
        </div>` : ""}
        <p style="color:#999;font-size:13px;">如有疑问，请联系客服。</p>
      </div>
      <div style="padding:20px 30px;background:#f8f9fa;text-align:center;">
        <p style="margin:0;color:#999;font-size:12px;">此邮件由 ${SITE_NAME} 自动发送，请勿回复。</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export async function sendAccountStatusChange(data: AccountStatusEmailData): Promise<boolean> {
  try {
    const label = data.newStatus === "BANNED" ? "暂停通知" : "恢复通知";
    const sent = await sendEmail(
      data.to,
      `账户${label} | ${SITE_NAME}`,
      accountStatusHtml(data),
    );
    if (sent) log.info({ to: data.to, status: data.newStatus }, "Account status email sent");
    return sent;
  } catch (error) {
    log.error({ err: error }, "Failed to send account status email");
    return false;
  }
}

export async function sendPasswordReset(data: PasswordResetEmailData): Promise<boolean> {
  try {
    const sent = await sendEmail(
      data.to,
      `密码重置 | ${SITE_NAME}`,
      passwordResetHtml(data),
    );
    if (sent) log.info({ to: data.to }, "Password reset email sent");
    return sent;
  } catch (error) {
    log.error({ err: error }, "Failed to send password reset email");
    return false;
  }
}
