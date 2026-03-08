import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { createLogger } from "@/lib/logger";

const log = createLogger("stats");

function formatCount(count: number): string {
  if (count >= 10000) {
    const thousands = Math.floor(count / 1000);
    return `${thousands.toLocaleString("en-US")},000+`;
  }
  if (count >= 1000) {
    const thousands = Math.floor(count / 1000);
    return `${thousands.toLocaleString("en-US")},000+`;
  }
  if (count >= 100) {
    const hundreds = Math.floor(count / 100) * 100;
    return `${hundreds}+`;
  }
  return String(count);
}

export async function GET() {
  try {
    const [productsCount, usersCount, ordersCount] = await Promise.all([
      db.product.count({
        where: { isActive: true },
      }),
      db.user.count(),
      db.order.count({
        where: { status: "DELIVERED" },
      }),
    ]);

    return NextResponse.json({
      success: true,
      stats: {
        products: formatCount(productsCount),
        users: formatCount(usersCount),
        orders: formatCount(ordersCount),
      },
    });
  } catch (error) {
    log.error({ err: error }, "Public stats GET error");
    return NextResponse.json(
      { success: false, message: "服务器内部错误" },
      { status: 500 }
    );
  }
}
