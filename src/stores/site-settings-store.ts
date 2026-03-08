"use client";

import { create } from "zustand";
import { SITE_NAME, SITE_DESCRIPTION } from "@/lib/constants";

interface SiteSettings {
  siteName: string;
  siteDescription: string;
  logoUrl: string;
  announcement: string;
  loaded: boolean;
}

interface SiteSettingsStore extends SiteSettings {
  load: () => Promise<void>;
}

export const useSiteSettingsStore = create<SiteSettingsStore>((set, get) => ({
  siteName: SITE_NAME,
  siteDescription: SITE_DESCRIPTION,
  logoUrl: "",
  announcement: "",
  loaded: false,

  load: async () => {
    if (get().loaded) return;
    try {
      const res = await fetch("/api/settings");
      if (!res.ok) return;
      const data = await res.json();
      if (data.success && data.settings) {
        set({
          siteName: data.settings.site_name || SITE_NAME,
          siteDescription: data.settings.site_description || SITE_DESCRIPTION,
          logoUrl: data.settings.logo_url || "",
          announcement: data.settings.announcement || "",
          loaded: true,
        });
      }
    } catch {
      // Silently fail, use defaults
    }
  },
}));
