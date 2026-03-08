import { NextResponse } from "next/server";
import { db } from "@/server/db";

// GET - Fetch featured reviews for homepage testimonials
export async function GET() {
  try {
    const reviews = await db.review.findMany({
      where: {
        isVisible: true,
        rating: { gte: 4 },
        content: { not: "" },
      },
      include: {
        user: { select: { username: true } },
        product: { select: { name: true } },
      },
      orderBy: { rating: "desc" },
      take: 6,
    });

    // Mask usernames for privacy
    const masked = reviews.map((r) => {
      const name = r.user.username;
      const maskedName =
        name.length <= 2
          ? name.charAt(0) + "**"
          : name.charAt(0) + "**" + name.charAt(name.length - 1);

      return {
        username: maskedName,
        rating: r.rating,
        content: r.content.length > 80 ? r.content.slice(0, 80) + "..." : r.content,
        product: r.product.name,
      };
    });

    const res = NextResponse.json({ success: true, reviews: masked });
    res.headers.set("Cache-Control", "public, s-maxage=600, stale-while-revalidate=1800");
    return res;
  } catch {
    return NextResponse.json({ success: true, reviews: [] });
  }
}
