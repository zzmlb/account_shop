import { Resend } from "resend";
import { createLogger } from "@/lib/logger";

const log = createLogger("email");

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL = process.env.EMAIL_FROM || "PJ37 Digital <noreply@pj37.com>";
const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || "PJ37 Digital";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

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
  const sections = data.items
    .map(
      (item) =>
        `<div style="margin-bottom:20px;">
          <h3 style="color:#333;font-size:16px;margin:0 0 10px;">${item.productName}</h3>
          ${item.cardKeys
            .map(
              (key) =>
                `<div style="background:#f0f0f0;border-radius:6px;padding:10px 14px;margin-bottom:6px;font-family:monospace;font-size:14px;color:#333;word-break:break-all;">${key}</div>`
            )
            .join("")}
        </div>`
    )
    .join("");

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
  if (!resend) {
    log.warn("Resend not configured, skipping order confirmation email");
    return false;
  }

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: data.to,
      subject: `订单确认 - ${data.orderNo} | ${SITE_NAME}`,
      html: orderConfirmationHtml(data),
    });
    log.info({ orderNo: data.orderNo, to: data.to }, "Order confirmation email sent");
    return true;
  } catch (error) {
    log.error({ err: error, orderNo: data.orderNo }, "Failed to send order confirmation email");
    return false;
  }
}

export async function sendCardKeyDelivery(data: CardKeyEmailData): Promise<boolean> {
  if (!resend) {
    log.warn("Resend not configured, skipping card key delivery email");
    return false;
  }

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: data.to,
      subject: `卡密发货 - ${data.orderNo} | ${SITE_NAME}`,
      html: cardKeyDeliveryHtml(data),
    });
    log.info({ orderNo: data.orderNo, to: data.to }, "Card key delivery email sent");
    return true;
  } catch (error) {
    log.error({ err: error, orderNo: data.orderNo }, "Failed to send card key delivery email");
    return false;
  }
}

export async function sendPasswordReset(data: PasswordResetEmailData): Promise<boolean> {
  if (!resend) {
    log.warn("Resend not configured, skipping password reset email");
    return false;
  }

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: data.to,
      subject: `密码重置 | ${SITE_NAME}`,
      html: passwordResetHtml(data),
    });
    log.info({ to: data.to }, "Password reset email sent");
    return true;
  } catch (error) {
    log.error({ err: error }, "Failed to send password reset email");
    return false;
  }
}
