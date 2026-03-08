import { NextRequest, NextResponse } from "next/server";
import { decodeSession } from "@/lib/auth";
import { db } from "@/server/db";
import { createLogger } from "@/lib/logger";
import { apiLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { favoriteSchema, formatZodError } from "@/lib/validators";

const log = createLogger("favorites");

export async function GET(request: NextRequest) {
  try {
    const session = decodeSession(
      request.cookies.get("session")?.value || ""
    );

    if (!session) {
      return NextResponse.json(
        { success: false, message: "未登录" },
        { status: 401 }
      );
    }

    const favorites = await db.favorite.findMany({
      where: { userId: session.id },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            price: true,
            originalPrice: true,
            stockCount: true,
            soldCount: true,
            image: true,
            category: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = favorites.map((fav) => ({
      id: fav.id,
      createdAt: fav.createdAt.toISOString(),
      product: {
        id: fav.product.id,
        name: fav.product.name,
        slug: fav.product.slug,
        price: Number(fav.product.price),
        originalPrice: fav.product.originalPrice
          ? Number(fav.product.originalPrice)
          : null,
        stockCount: fav.product.stockCount,
        soldCount: fav.product.soldCount,
        image: fav.product.image,
        categoryName: fav.product.category.name,
      },
    }));

    return NextResponse.json({ success: true, favorites: formatted });
  } catch (error) {
    log.error({ err: error }, "Favorites GET error");
    return NextResponse.json(
      { success: false, message: "服务器内部错误" },
      { status: 500 }
    );
  }
}

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

    const body = await request.json();
    const parsed = favoriteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: formatZodError(parsed.error) },
        { status: 400 }
      );
    }
    const { productId } = parsed.data;

    // Check if already favorited
    const existing = await db.favorite.findUnique({
      where: {
        userId_productId: {
          userId: session.id,
          productId,
        },
      },
    });

    if (existing) {
      return NextResponse.json({ success: true });
    }

    await db.favorite.create({
      data: {
        userId: session.id,
        productId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    log.error({ err: error }, "Favorites POST error");
    return NextResponse.json(
      { success: false, message: "服务器内部错误" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = decodeSession(
      request.cookies.get("session")?.value || ""
    );

    if (!session) {
      return NextResponse.json(
        { success: false, message: "未登录" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");

    if (!productId) {
      return NextResponse.json(
        { success: false, message: "缺少商品ID" },
        { status: 400 }
      );
    }

    await db.favorite.deleteMany({
      where: {
        userId: session.id,
        productId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    log.error({ err: error }, "Favorites DELETE error");
    return NextResponse.json(
      { success: false, message: "服务器内部错误" },
      { status: 500 }
    );
  }
}
