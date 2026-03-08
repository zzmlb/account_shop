import { NextRequest, NextResponse } from "next/server";
import { decodeSession } from "@/lib/auth";
import { db } from "@/server/db";
import { createLogger } from "@/lib/logger";
import { apiLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

const log = createLogger("admin/users");

function isAdmin(role: string): boolean {
  const upper = role.toUpperCase();
  return upper === "ADMIN" || upper === "SUPER_ADMIN";
}

function getAdminSession(request: NextRequest) {
  const session = decodeSession(
    request.cookies.get("session")?.value || ""
  );

  if (!session) {
    return {
      session: null,
      error: NextResponse.json(
        { success: false, message: "未登录" },
        { status: 401 }
      ),
    };
  }

  if (!isAdmin(session.role)) {
    return {
      session: null,
      error: NextResponse.json(
        { success: false, message: "无管理员权限" },
        { status: 403 }
      ),
    };
  }

  return { session, error: null };
}

// GET - List all users (admin only)
export async function GET(request: NextRequest) {
  try {
    const rl = apiLimiter(getClientIp(request));
    if (!rl.success) return rateLimitResponse(rl);

    const { session, error } = getAdminSession(request);
    if (!session) return error!;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const rawPage = parseInt(searchParams.get("page") || "1", 10);
    const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
    const rawSize = parseInt(searchParams.get("pageSize") || "20", 10);
    const pageSize = Number.isFinite(rawSize) && rawSize > 0 ? Math.min(rawSize, 50) : 20;

    const role = searchParams.get("role");
    const status = searchParams.get("status");

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { username: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    if (role && ["USER", "ADMIN", "SUPER_ADMIN"].includes(role.toUpperCase())) {
      where.role = role.toUpperCase();
    }

    if (status && ["ACTIVE", "BANNED", "INACTIVE"].includes(status.toUpperCase())) {
      where.status = status.toUpperCase();
    }

    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        select: {
          id: true,
          username: true,
          email: true,
          avatar: true,
          balance: true,
          role: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              orders: true,
            },
          },
          orders: {
            where: { status: { in: ["PAID", "DELIVERED"] } },
            select: { payAmount: true },
          },
          loginLogs: {
            where: { success: true },
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { createdAt: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.user.count({ where }),
    ]);

    const formatted = users.map((u) => ({
      id: u.id,
      username: u.username,
      email: u.email,
      avatar: u.avatar,
      balance: Number(u.balance),
      role: u.role,
      status: u.status,
      orderCount: u._count.orders,
      totalSpent: u.orders.reduce((sum, o) => sum + Number(o.payAmount), 0),
      lastLoginAt: u.loginLogs[0]?.createdAt.toISOString() ?? null,
      createdAt: u.createdAt.toISOString(),
      updatedAt: u.updatedAt.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      users: formatted,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    log.error({ err: error }, "Admin users GET error");
    return NextResponse.json(
      { success: false, message: "服务器内部错误" },
      { status: 500 }
    );
  }
}

// PUT - Update user (admin only)
export async function PUT(request: NextRequest) {
  try {
    const rl = apiLimiter(getClientIp(request));
    if (!rl.success) return rateLimitResponse(rl);

    const { session, error } = getAdminSession(request);
    if (!session) return error!;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, message: "缺少用户ID参数" },
        { status: 400 }
      );
    }

    const existing = await db.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "用户不存在" },
        { status: 404 }
      );
    }

    // Prevent admins from modifying themselves (ban/balance)
    if (id === session.id) {
      return NextResponse.json(
        { success: false, message: "不能修改自己的账户" },
        { status: 400 }
      );
    }

    // Prevent regular ADMIN from modifying SUPER_ADMIN users
    if (
      existing.role.toUpperCase() === "SUPER_ADMIN" &&
      session.role.toUpperCase() !== "SUPER_ADMIN"
    ) {
      return NextResponse.json(
        { success: false, message: "权限不足，无法修改超级管理员" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { status: newStatus, balanceAdjust } = body;

    // Validate inputs
    if (newStatus !== undefined) {
      const validStatuses = ["ACTIVE", "BANNED"];
      if (!validStatuses.includes(newStatus)) {
        return NextResponse.json(
          {
            success: false,
            message: `无效的用户状态，可选值: ${validStatuses.join(", ")}`,
          },
          { status: 400 }
        );
      }
    }

    if (balanceAdjust !== undefined) {
      if (typeof balanceAdjust !== "number" || balanceAdjust === 0) {
        return NextResponse.json(
          { success: false, message: "余额调整金额必须为非零数值" },
          { status: 400 }
        );
      }

      // Cap balance adjustments to prevent accidental huge changes
      if (Math.abs(balanceAdjust) > 100000) {
        return NextResponse.json(
          { success: false, message: "单次余额调整不能超过 ¥100,000" },
          { status: 400 }
        );
      }

      // Prevent negative balance
      const currentBalance = Number(existing.balance);
      if (currentBalance + balanceAdjust < 0) {
        return NextResponse.json(
          {
            success: false,
            message: `余额不足，当前余额 ${currentBalance}，调整金额 ${balanceAdjust}`,
          },
          { status: 400 }
        );
      }
    }

    // Use transaction if balance adjustment is needed
    if (balanceAdjust !== undefined) {
      const updated = await db.$transaction(async (tx) => {
        // Build update data
        const updateData: Record<string, unknown> = {};
        if (newStatus !== undefined) updateData.status = newStatus;
        updateData.balance = { increment: balanceAdjust };

        const updatedUser = await tx.user.update({
          where: { id },
          data: updateData,
          select: {
            id: true,
            username: true,
            email: true,
            avatar: true,
            balance: true,
            role: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            _count: {
              select: {
                orders: true,
              },
            },
          },
        });

        // Create balance log for the adjustment
        const description =
          balanceAdjust > 0
            ? `管理员增加余额 +${balanceAdjust}`
            : `管理员扣减余额 ${balanceAdjust}`;

        await tx.balanceLog.create({
          data: {
            userId: id,
            amount: balanceAdjust,
            type: "ADMIN_ADJUST",
            description,
            relatedId: session.id,
          },
        });

        return updatedUser;
      });

      log.info(
        {
          targetUserId: id,
          targetUsername: existing.username,
          adminId: session.id,
          balanceAdjust,
          newStatus: newStatus ?? existing.status,
        },
        "Admin updated user (balance adjustment)"
      );

      return NextResponse.json({
        success: true,
        message: "用户信息已更新",
        user: {
          id: updated.id,
          username: updated.username,
          email: updated.email,
          avatar: updated.avatar,
          balance: Number(updated.balance),
          role: updated.role,
          status: updated.status,
          orderCount: updated._count.orders,
          createdAt: updated.createdAt.toISOString(),
          updatedAt: updated.updatedAt.toISOString(),
        },
      });
    }

    // Simple status-only update (no balance change)
    const updateData: Record<string, unknown> = {};
    if (newStatus !== undefined) updateData.status = newStatus;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, message: "没有需要更新的字段" },
        { status: 400 }
      );
    }

    const updated = await db.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
        balance: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            orders: true,
          },
        },
      },
    });

    log.info(
      {
        targetUserId: id,
        targetUsername: existing.username,
        adminId: session.id,
        newStatus,
      },
      "Admin updated user status"
    );

    return NextResponse.json({
      success: true,
      message: "用户信息已更新",
      user: {
        id: updated.id,
        username: updated.username,
        email: updated.email,
        avatar: updated.avatar,
        balance: Number(updated.balance),
        role: updated.role,
        status: updated.status,
        orderCount: updated._count.orders,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    log.error({ err: error }, "Admin users PUT error");
    return NextResponse.json(
      { success: false, message: "服务器内部错误" },
      { status: 500 }
    );
  }
}
