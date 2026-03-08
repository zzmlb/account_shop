import { describe, it, expect, beforeEach } from "vitest";
import { useRecentlyViewedStore } from "../recently-viewed-store";

const mockProduct = (slug: string) => ({
  slug,
  name: `Product ${slug}`,
  price: 9.99,
  categoryName: "Category",
});

describe("recently-viewed-store", () => {
  beforeEach(() => {
    useRecentlyViewedStore.setState({ items: [] });
  });

  describe("addItem", () => {
    it("adds a product to the list", () => {
      useRecentlyViewedStore.getState().addItem(mockProduct("a"));
      const items = useRecentlyViewedStore.getState().items;
      expect(items).toHaveLength(1);
      expect(items[0].slug).toBe("a");
      expect(items[0].viewedAt).toBeGreaterThan(0);
    });

    it("places new item at the beginning", () => {
      useRecentlyViewedStore.getState().addItem(mockProduct("a"));
      useRecentlyViewedStore.getState().addItem(mockProduct("b"));
      const items = useRecentlyViewedStore.getState().items;
      expect(items[0].slug).toBe("b");
      expect(items[1].slug).toBe("a");
    });

    it("moves re-viewed product to the top", () => {
      useRecentlyViewedStore.getState().addItem(mockProduct("a"));
      useRecentlyViewedStore.getState().addItem(mockProduct("b"));
      useRecentlyViewedStore.getState().addItem(mockProduct("a"));
      const items = useRecentlyViewedStore.getState().items;
      expect(items).toHaveLength(2);
      expect(items[0].slug).toBe("a");
      expect(items[1].slug).toBe("b");
    });

    it("limits to 12 items", () => {
      for (let i = 0; i < 15; i++) {
        useRecentlyViewedStore.getState().addItem(mockProduct(`p${i}`));
      }
      const items = useRecentlyViewedStore.getState().items;
      expect(items).toHaveLength(12);
      expect(items[0].slug).toBe("p14"); // most recent
    });
  });

  describe("clearAll", () => {
    it("removes all items", () => {
      useRecentlyViewedStore.getState().addItem(mockProduct("a"));
      useRecentlyViewedStore.getState().addItem(mockProduct("b"));
      useRecentlyViewedStore.getState().clearAll();
      expect(useRecentlyViewedStore.getState().items).toHaveLength(0);
    });
  });

  describe("getItems", () => {
    it("returns current items", () => {
      useRecentlyViewedStore.getState().addItem(mockProduct("x"));
      const items = useRecentlyViewedStore.getState().getItems();
      expect(items).toHaveLength(1);
      expect(items[0].slug).toBe("x");
    });

    it("returns empty array when no items", () => {
      expect(useRecentlyViewedStore.getState().getItems()).toHaveLength(0);
    });
  });
});
