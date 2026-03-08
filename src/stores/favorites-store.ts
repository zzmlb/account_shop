import { create } from "zustand";
import { apiFetch, apiMutate } from "@/lib/api-fetch";

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
      const data = await apiFetch<{ favorites: { product: { id: string } }[] }>("/api/favorites");
      const ids = new Set<string>(data.favorites.map((f) => f.product.id));
      set({ ids, loaded: true, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  add: async (productId: string) => {
    const prev = new Set(get().ids);
    set({ ids: new Set([...prev, productId]) });
    try {
      await apiMutate("/api/favorites", "POST", { productId });
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
      await apiFetch(`/api/favorites?productId=${encodeURIComponent(productId)}`, { method: "DELETE" });
      return true;
    } catch {
      set({ ids: prev });
      return false;
    }
  },

  has: (productId: string) => get().ids.has(productId),

  reset: () => set({ ids: new Set(), loaded: false, loading: false }),
}));
