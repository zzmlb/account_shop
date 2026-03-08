import { NextRequest, NextResponse } from "next/server";
import { decodeSession } from "@/lib/auth";
import { db } from "@/server/db";

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

// GET - List card keys (admin only)
export async function GET(request: NextRequest) {
  try {
    const { session, error } = getAdminSession(request);
    if (!session) return error!;

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.max(
      1,
      Math.min(200, parseInt(searchParams.get("pageSize") || "50", 10))
    );

    const where: Record<string, unknown> = {};

    if (productId) {
      where.productId = productId;
    }

    if (
      status &&
      ["AVAILABLE", "SOLD", "DISABLED"].includes(status.toUpperCase())
    ) {
      where.status = status.toUpperCase();
    }

    if (search) {
      where.content = { contains: search, mode: "insensitive" };
    }

    const [cardKeys, total] = await Promise.all([
      db.cardKey.findMany({
        where,
        include: {
          product: {
            select: {
              name: true,
              slug: true,
            },
          },
          orderItem: {
            select: {
              order: {
                select: {
                  orderNo: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.cardKey.count({ where }),
    ]);

    const formatted = cardKeys.map((ck) => ({
      id: ck.id,
      content: ck.content,
      productId: ck.productId,
      product: {
        name: ck.product.name,
        slug: ck.product.slug,
      },
      status: ck.status,
      orderItemId: ck.orderId,
      orderNo: ck.orderItem?.order?.orderNo ?? null,
      soldAt: ck.soldAt ? ck.soldAt.toISOString() : null,
      createdAt: ck.createdAt.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      cardKeys: formatted,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error("Admin card-keys GET error:", error);
    return NextResponse.json(
      { success: false, message: "服务器内部错误" },
      { status: 500 }
    );
  }
}

// POST - Bulk import card keys (admin only)
export async function POST(request: NextRequest) {
  try {
    const { session, error } = getAdminSession(request);
    if (!session) return error!;

    const body = await request.json();
    const { productId, keys } = body;

    if (!productId) {
      return NextResponse.json(
        { success: false, message: "缺少必填字段: productId" },
        { status: 400 }
      );
    }

    if (!Array.isArray(keys) || keys.length === 0) {
      return NextResponse.json(
        { success: false, message: "keys 必须为非空数组" },
        { status: 400 }
      );
    }

    // Verify product exists
    const product = await db.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, message: "商品不存在" },
        { status: 404 }
      );
    }

    // Filter out empty strings
    const validKeys = keys
      .map((k: unknown) => (typeof k === "string" ? k.trim() : ""))
      .filter((k: string) => k.length > 0);

    if (validKeys.length === 0) {
      return NextResponse.json(
        { success: false, message: "没有有效的卡密内容" },
        { status: 400 }
      );
    }

    // Bulk create card keys
    const result = await db.cardKey.createMany({
      data: validKeys.map((content: string) => ({
        productId,
        content,
        status: "AVAILABLE" as const,
      })),
    });

    // Update product stock count
    await db.product.update({
      where: { id: productId },
      data: {
        stockCount: { increment: result.count },
      },
    });

    return NextResponse.json({
      success: true,
      count: result.count,
      message: `成功导入 ${result.count} 个卡密`,
    });
  } catch (error) {
    console.error("Admin card-keys POST error:", error);
    return NextResponse.json(
      { success: false, message: "服务器内部错误" },
      { status: 500 }
    );
  }
}

// PUT - Update card key status (admin only, ?id= query param)
export async function PUT(request: NextRequest) {
  try {
    const { session, error } = getAdminSession(request);
    if (!session) return error!;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, message: "缺少卡密ID参数" },
        { status: 400 }
      );
    }

    const existing = await db.cardKey.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "卡密不存在" },
        { status: 404 }
      );
    }

    // Do not allow changing status of sold card keys
    if (existing.status === "SOLD") {
      return NextResponse.json(
        { success: false, message: "已售出的卡密不能修改状态" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { status } = body;

    if (!status || !["AVAILABLE", "DISABLED"].includes(status)) {
      return NextResponse.json(
        {
          success: false,
          message: "状态值无效，只允许 AVAILABLE 或 DISABLED",
        },
        { status: 400 }
      );
    }

    const updated = await db.cardKey.update({
      where: { id },
      data: { status },
      include: {
        product: {
          select: {
            name: true,
            slug: true,
          },
        },
        orderItem: {
          select: {
            order: {
              select: {
                orderNo: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      cardKey: {
        id: updated.id,
        content: updated.content,
        productId: updated.productId,
        product: {
          name: updated.product.name,
          slug: updated.product.slug,
        },
        status: updated.status,
        orderItemId: updated.orderId,
        orderNo: updated.orderItem?.order?.orderNo ?? null,
        soldAt: updated.soldAt ? updated.soldAt.toISOString() : null,
        createdAt: updated.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Admin card-keys PUT error:", error);
    return NextResponse.json(
      { success: false, message: "服务器内部错误" },
      { status: 500 }
    );
  }
}

// DELETE - Delete card key (admin only, ?id= query param)
export async function DELETE(request: NextRequest) {
  try {
    const { session, error } = getAdminSession(request);
    if (!session) return error!;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, message: "缺少卡密ID参数" },
        { status: 400 }
      );
    }

    const existing = await db.cardKey.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "卡密不存在" },
        { status: 404 }
      );
    }

    if (existing.status === "SOLD") {
      return NextResponse.json(
        { success: false, message: "已售出的卡密不能删除" },
        { status: 400 }
      );
    }

    if (existing.status === "LOCKED") {
      return NextResponse.json(
        { success: false, message: "已锁定的卡密不能删除" },
        { status: 400 }
      );
    }

    await db.cardKey.delete({ where: { id } });

    // If the card key was AVAILABLE, decrement the product stock count
    if (existing.status === "AVAILABLE") {
      await db.product.update({
        where: { id: existing.productId },
        data: {
          stockCount: { decrement: 1 },
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "卡密已删除",
    });
  } catch (error) {
    console.error("Admin card-keys DELETE error:", error);
    return NextResponse.json(
      { success: false, message: "服务器内部错误" },
      { status: 500 }
    );
  }
}
