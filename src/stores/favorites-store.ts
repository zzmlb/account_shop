import { create } from "zustand";

interface FavoritesState {
  /** Set of product IDs the user has favorited */
  ids: Set<string>;
  loaded: boolean;
  loading: boolean;
  /** Fetch all favorite IDs from server */
  load: () => Promise<void>;
  /** Add a product to favorites (optimistic + API call) */
  add: (productId: string) => Promise<boolean>;
  /** Remove a product from favorites (optimistic + API call) */
  remove: (productId: string) => Promise<boolean>;
  /** Check if a product is favorited */
  has: (productId: string) => boolean;
  /** Reset state (on logout) */
  reset: () => void;
}

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  ids: new Set<string>(),
  loaded: false,
  loading: false,

  load: async () => {
    if (get().loading || get().loaded) return;
    set({ loading: true });
    try {
      const res = await fetch("/api/favorites");
      const data = await res.json();
      if (data.success && Array.isArray(data.favorites)) {
        const ids = new Set<string>(
          data.favorites.map((f: { product: { id: string } }) => f.product.id)
        );
        set({ ids, loaded: true, loading: false });
      } else {
        set({ loading: false });
      }
    } catch {
      set({ loading: false });
    }
  },

  add: async (productId: string) => {
    const prev = new Set(get().ids);
    set({ ids: new Set([...prev, productId]) });
    try {
      const res = await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      const data = await res.json();
      if (!data.success) {
        set({ ids: prev });
        return false;
      }
      return true;
    } catch {
      set({ ids: prev });
      return false;
    }
  },

  remove: async (productId: string) => {
    const prev = new Set(get().ids);
    const next = new Set(prev);
    next.delete(productId);
    set({ ids: next });
    try {
      const res = await fetch(
        `/api/favorites?productId=${encodeURIComponent(productId)}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!data.success) {
        set({ ids: prev });
        return false;
      }
      return true;
    } catch {
      set({ ids: prev });
      return false;
    }
  },

  has: (productId: string) => get().ids.has(productId),

  reset: () => set({ ids: new Set(), loaded: false, loading: false }),
}));
