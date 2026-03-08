import type { Metadata } from "next";
import FavoritesPageContent from "./favorites-content";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "我的收藏 - 个人中心",
};

export default function FavoritesPage() {
  return <FavoritesPageContent />;
}
