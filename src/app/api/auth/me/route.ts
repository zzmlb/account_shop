import { NextRequest, NextResponse } from "next/server";
import { getUserSession, encodeSession } from "@/lib/auth";
import { db } from "@/server/db";
import { createLogger } from "@/lib/logger";
import { apiLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { updateProfileSchema, formatZodError } from "@/lib/validators";

const log = createLogger("auth/me");

export async function GET(request: NextRequest) {
  try {
    const { session, error } = getUserSession(request);
    if (error) return error;

    // Fetch fresh user data from DB
    const user = await db.user.findUnique({
      where: { id: session.id },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        balance: true,
        avatar: true,
        status: true,
      },
    });

    if (!user || user.status === "BANNED") {
      return NextResponse.json(
        { success: false, message: user ? "账户已被封禁" : "用户不存在" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role.toLowerCase(),
        balance: Number(user.balance),
        avatar: user.avatar,
      },
    });
  } catch (error) {
    log.error({ err: error }, "Session check error");
    return NextResponse.json(
      { success: false, message: "服务器内部错误" },
      { status: 500 }
    );
  }
}

// PUT - Update user profile (avatar)
export async function PUT(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = apiLimiter(ip);
    if (!rl.success) return rateLimitResponse(rl);

    const { session, error: authError } = getUserSession(request);
    if (authError) return authError;

    const body = await request.json();
    const parsed = updateProfileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: formatZodError(parsed.error) },
        { status: 400 }
      );
    }

    const { avatar } = parsed.data;

    const user = await db.user.update({
      where: { id: session.id },
      data: { avatar: avatar || null },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        balance: true,
        avatar: true,
      },
    });

    // Re-encode session with updated avatar
    const newToken = encodeSession({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
    });

    const response = NextResponse.json({
      success: true,
      message: "头像已更新",
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role.toLowerCase(),
        balance: Number(user.balance),
        avatar: user.avatar,
      },
    });

    response.cookies.set("session", newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    log.error({ err: error }, "Profile update error");
    return NextResponse.json(
      { success: false, message: "更新失败" },
      { status: 500 }
    );
  }
}
