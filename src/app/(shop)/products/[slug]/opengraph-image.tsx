import { ImageResponse } from "next/og";
import { db } from "@/server/db";

export const runtime = "nodejs";
export const alt = "Product Image";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const product = await db.product.findUnique({
    where: { slug },
    select: {
      name: true,
      price: true,
      originalPrice: true,
      image: true,
      category: { select: { name: true } },
    },
  });

  const name = product?.name || "商品详情";
  const price = product?.price ? Number(product.price) : 0;
  const originalPrice = product?.originalPrice
    ? Number(product.originalPrice)
    : 0;
  const category = product?.category?.name || "";
  const hasDiscount = originalPrice > 0 && originalPrice > price;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background:
            "linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)",
          fontFamily: "system-ui, sans-serif",
          padding: "60px",
        }}
      >
        {/* Decorative gradient */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background:
              "radial-gradient(circle at 80% 20%, rgba(139, 92, 246, 0.2) 0%, transparent 50%)",
            display: "flex",
          }}
        />

        {/* Top: Brand + Category */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "40px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #8b5cf6, #6366f1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "22px",
                fontWeight: 800,
                color: "white",
              }}
            >
              P
            </div>
            <span
              style={{
                fontSize: "24px",
                fontWeight: 700,
                color: "rgba(255,255,255,0.8)",
              }}
            >
              PJ37 Digital
            </span>
          </div>

          {category && (
            <div
              style={{
                padding: "8px 20px",
                borderRadius: "999px",
                background: "rgba(139, 92, 246, 0.15)",
                border: "1px solid rgba(139, 92, 246, 0.3)",
                color: "#a78bfa",
                fontSize: "16px",
                fontWeight: 600,
              }}
            >
              {category}
            </div>
          )}
        </div>

        {/* Product Name */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <h1
            style={{
              fontSize: name.length > 20 ? "48px" : "56px",
              fontWeight: 800,
              color: "white",
              lineHeight: 1.2,
              margin: 0,
              letterSpacing: "-1px",
            }}
          >
            {name.length > 40 ? name.slice(0, 40) + "..." : name}
          </h1>
        </div>

        {/* Bottom: Price + Features */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", gap: "16px" }}>
            <span
              style={{
                fontSize: "52px",
                fontWeight: 800,
                color: "#a78bfa",
              }}
            >
              ¥{price.toFixed(2)}
            </span>
            {hasDiscount && (
              <span
                style={{
                  fontSize: "28px",
                  color: "rgba(255,255,255,0.4)",
                  textDecoration: "line-through",
                }}
              >
                ¥{originalPrice.toFixed(2)}
              </span>
            )}
          </div>

          <div style={{ display: "flex", gap: "16px" }}>
            {["即时交付", "安全支付", "售后保障"].map((f) => (
              <div
                key={f}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 16px",
                  borderRadius: "999px",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <span style={{ color: "#a78bfa", fontSize: "14px" }}>✓</span>
                <span
                  style={{
                    color: "rgba(255,255,255,0.7)",
                    fontSize: "14px",
                  }}
                >
                  {f}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
