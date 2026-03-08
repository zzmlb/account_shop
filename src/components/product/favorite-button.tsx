"use client";

import { useEffect, useCallback, memo } from "react";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { useFavoritesStore } from "@/stores/favorites-store";

interface FavoriteButtonProps {
  productId: string;
  className?: string;
  size?: "sm" | "md";
}

export default memo(function FavoriteButton({
  productId,
  className,
  size = "sm",
}: FavoriteButtonProps) {
  const user = useAuthStore((s) => s.user);
  const { loaded, load, add, remove } = useFavoritesStore();
  const isFavorited = useFavoritesStore((s) => s.ids.has(productId));

  useEffect(() => {
    if (user && !loaded) {
      load();
    }
  }, [user, loaded, load]);

  const toggle = useCallback(async () => {
    if (!user) {
      toast.info("请先登录后再收藏商品");
      return;
    }

    if (isFavorited) {
      const ok = await remove(productId);
      if (ok) toast.success("已取消收藏");
      else toast.error("操作失败");
    } else {
      const ok = await add(productId);
      if (ok) toast.success("已加入收藏");
      else toast.error("操作失败");
    }
  }, [user, isFavorited, productId, add, remove]);

  const iconSize = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  const btnSize = size === "sm" ? "h-8 w-8" : "h-9 w-9";

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle();
      }}
      className={cn(
        "inline-flex items-center justify-center rounded-full transition-all",
        btnSize,
        isFavorited
          ? "text-red-500 hover:text-red-600"
          : "text-[var(--muted-foreground)] hover:text-red-500",
        className
      )}
      aria-label={isFavorited ? "取消收藏" : "加入收藏"}
    >
      <Heart className={cn(iconSize, isFavorited && "fill-current")} />
    </button>
  );
})
