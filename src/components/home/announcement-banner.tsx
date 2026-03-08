"use client";

import { useState, useEffect } from "react";
import { Megaphone, X } from "lucide-react";
import { useSiteSettingsStore } from "@/stores/site-settings-store";

export default function AnnouncementBanner() {
  const { announcement, loaded, load } = useSiteSettingsStore();
  const [dismissed, setDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = sessionStorage.getItem("announcement-dismissed");
    if (stored) {
      setDismissed(true);
      return;
    }
    load();
  }, [load]);

  if (!mounted || dismissed || !loaded || !announcement) return null;

  return (
    <div className="relative bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] px-4 py-2.5 text-center text-sm text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-2">
        <Megaphone className="h-4 w-4 shrink-0" />
        <span>{announcement}</span>
      </div>
      <button
        onClick={() => {
          setDismissed(true);
          sessionStorage.setItem("announcement-dismissed", "1");
        }}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        aria-label="关闭公告"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
