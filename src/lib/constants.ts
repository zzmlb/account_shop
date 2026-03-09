export const SITE_NAME = "PJ37 Digital";
export const SITE_DESCRIPTION = "高端数字商品交易平台 — 安全、快速、可靠";
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const ORDER_EXPIRE_MINUTES = 15;
export const AFTER_SALE_HOURS = 48;

export const ITEMS_PER_PAGE = 12;

/* ---------- Timing constants ---------- */

/** Debounce delay for search inputs (ms) */
export const SEARCH_DEBOUNCE_MS = 300;

/** Duration to show "copied" feedback after clipboard write (ms) */
export const COPY_FEEDBACK_MS = 2000;

/** Interval for polling notification count (ms) */
export const NOTIFICATION_POLL_INTERVAL_MS = 60_000;

/** Rotation interval for live activity feed (ms) */
export const ACTIVITY_ROTATION_MS = 4000;

/** Share popup window dimensions */
export const SHARE_POPUP_WIDTH = 600;
export const SHARE_POPUP_HEIGHT = 400;

/** Tiny shimmer SVG for Next.js Image placeholder="blur" */
export const BLUR_DATA_URL =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSIzMCI+PHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjMwIiBmaWxsPSIjZTJlMmUyIi8+PC9zdmc+";

export const NAV_LINKS = [
  { label: "首页", href: "/" },
  { label: "全部商品", href: "/products" },
  { label: "商品分类", href: "/categories" },
  { label: "帮助中心", href: "/articles" },
] as const;

export const TRUST_FEATURES = [
  {
    title: "即时交付",
    description: "支付成功后自动发货，秒级到账",
    icon: "Zap",
  },
  {
    title: "安全保障",
    description: "AES-256加密存储，交易全程保护",
    icon: "Shield",
  },
  {
    title: "7×24 支持",
    description: "全天候客服支持，随时解决问题",
    icon: "Headphones",
  },
  {
    title: "品质保证",
    description: "严格质检，保障每一件商品品质",
    icon: "Award",
  },
] as const;
