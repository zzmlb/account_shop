import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PJ37 Digital — 高端数字商品交易平台",
    short_name: "PJ37",
    description: "安全、快速、可靠的数字商品交易平台",
    start_url: "/",
    display: "standalone",
    background_color: "#0A0A0F",
    theme_color: "#6C5CE7",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
