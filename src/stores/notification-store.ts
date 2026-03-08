import { create } from "zustand";
import { apiFetch } from "@/lib/api-fetch";

interface NotificationState {
  unreadCount: number;
  lastFetched: number;
}

interface NotificationActions {
  fetchCount: () => void;
  decrement: () => void;
  reset: () => void;
}

type NotificationStore = NotificationState & NotificationActions;

const FETCH_INTERVAL = 60_000; // 60 seconds minimum between fetches

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  unreadCount: 0,
  lastFetched: 0,

  fetchCount: () => {
    const now = Date.now();
    // Debounce: skip if fetched within the last interval
    if (now - get().lastFetched < FETCH_INTERVAL) return;

    set({ lastFetched: now });

    apiFetch<{ count: number }>("/api/notifications/unread-count")
      .then((d) => {
        set({ unreadCount: d.count ?? 0 });
      })
      .catch(() => {});
  },

  decrement: () => {
    set((s) => ({ unreadCount: Math.max(0, s.unreadCount - 1) }));
  },

  reset: () => {
    set({ unreadCount: 0 });
  },
}));
