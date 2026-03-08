import { NextRequest, NextResponse } from "next/server";
import { getUserSession, verifyPassword } from "@/lib/auth";
import { db } from "@/server/db";
import { loginLimiter } from "@/lib/rate-limit";
import { createLogger } from "@/lib/logger";
import { deleteAccountSchema, formatZodError } from "@/lib/validators";

export const dynamic = "force-dynamic";
const log = createLogger("auth/delete-account");

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "unknown";
    const rl = loginLimiter(ip);
    if (!rl.success) {
      return NextResponse.json(
        { success: false, message: "请求过于频繁，请稍后再试" },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil((rl.reset - Date.now()) / 1000)) },
        }
      );
    }

    const { session, error } = getUserSession(request);
    if (error) return error;

    const body = await request.json();
    const parsed = deleteAccountSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: formatZodError(parsed.error) },
        { status: 400 }
      );
    }

    const { password } = parsed.data;

    // Find user and verify password
    const user = await db.user.findUnique({
      where: { id: session.id },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "用户不存在" },
        { status: 404 }
      );
    }

    // Prevent admin account deletion
    if (user.role === "ADMIN" || user.role === "SUPER_ADMIN") {
      return NextResponse.json(
        { success: false, message: "管理员账户不可自行删除" },
        { status: 403 }
      );
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { success: false, message: "密码错误" },
        { status: 401 }
      );
    }

    // Check for pending orders
    const pendingOrders = await db.order.count({
      where: { userId: user.id, status: "PENDING" },
    });

    if (pendingOrders > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `您有 ${pendingOrders} 个待处理的订单，请先处理完毕后再删除账户`,
        },
        { status: 400 }
      );
    }

    // Soft-delete: anonymize user data instead of hard delete
    // This preserves order history integrity
    await db.$transaction(async (tx) => {
      // Anonymize user data
      await tx.user.update({
        where: { id: user.id },
        data: {
          username: `deleted_${user.id.slice(0, 8)}`,
          email: `deleted_${user.id}@deleted.local`,
          passwordHash: "DELETED",
          status: "BANNED",
          avatar: null,
          balance: 0,
        },
      });

      // Remove favorites
      await tx.favorite.deleteMany({ where: { userId: user.id } });

      // Remove password reset tokens
      await tx.passwordReset.deleteMany({ where: { userId: user.id } });
    });

    log.info({ userId: user.id }, "User account deleted (anonymized)");

    // Clear session cookie
    const response = NextResponse.json({
      success: true,
      message: "账户已删除",
    });
    response.cookies.delete("session");

    return response;
  } catch (error) {
    log.error({ err: error }, "Delete account error");
    return NextResponse.json(
      { success: false, message: "服务器内部错误" },
      { status: 500 }
    );
  }
}
