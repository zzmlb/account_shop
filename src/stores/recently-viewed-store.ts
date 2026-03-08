import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface RecentProduct {
  slug: string;
  name: string;
  price: number;
  originalPrice?: number;
  image?: string;
  categoryName: string;
  productId?: string;
  viewedAt: number;
}

interface RecentlyViewedState {
  items: RecentProduct[];
  addItem: (product: Omit<RecentProduct, "viewedAt">) => void;
  getItems: () => RecentProduct[];
}

const MAX_ITEMS = 12;

export const useRecentlyViewedStore = create<RecentlyViewedState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product) => {
        const items = get().items.filter((i) => i.slug !== product.slug);
        items.unshift({ ...product, viewedAt: Date.now() });
        set({ items: items.slice(0, MAX_ITEMS) });
      },

      getItems: () => get().items,
    }),
    {
      name: "pj37-recently-viewed",
    }
  )
);
