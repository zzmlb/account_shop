import { describe, it, expect, beforeEach } from "vitest";
import { useCartStore } from "../cart-store";

const mockItem = (overrides = {}) => ({
  id: "test-slug",
  productId: "prod-1",
  name: "Test Product",
  slug: "test-slug",
  price: 9.99,
  quantity: 1,
  maxStock: 10,
  ...overrides,
});

describe("cart-store", () => {
  beforeEach(() => {
    // Reset store state between tests
    useCartStore.setState({ items: [], isOpen: false, updatedAt: Date.now() });
  });

  describe("addItem", () => {
    it("adds a new item to cart", () => {
      useCartStore.getState().addItem(mockItem());
      const items = useCartStore.getState().items;
      expect(items).toHaveLength(1);
      expect(items[0].productId).toBe("prod-1");
      expect(items[0].quantity).toBe(1);
    });

    it("increments quantity for existing item", () => {
      useCartStore.getState().addItem(mockItem());
      useCartStore.getState().addItem(mockItem({ quantity: 2 }));
      const items = useCartStore.getState().items;
      expect(items).toHaveLength(1);
      expect(items[0].quantity).toBe(3);
    });

    it("caps quantity at maxStock", () => {
      useCartStore.getState().addItem(mockItem({ quantity: 8, maxStock: 10 }));
      useCartStore.getState().addItem(mockItem({ quantity: 5, maxStock: 10 }));
      const items = useCartStore.getState().items;
      expect(items[0].quantity).toBe(10); // capped at maxStock
    });

    it("caps initial quantity at maxStock", () => {
      useCartStore.getState().addItem(mockItem({ quantity: 15, maxStock: 5 }));
      const items = useCartStore.getState().items;
      expect(items[0].quantity).toBe(5);
    });

    it("adds different products separately", () => {
      useCartStore.getState().addItem(mockItem({ productId: "prod-1" }));
      useCartStore.getState().addItem(mockItem({ productId: "prod-2", id: "slug-2", slug: "slug-2" }));
      expect(useCartStore.getState().items).toHaveLength(2);
    });
  });

  describe("removeItem", () => {
    it("removes an item by productId", () => {
      useCartStore.getState().addItem(mockItem());
      useCartStore.getState().removeItem("prod-1");
      expect(useCartStore.getState().items).toHaveLength(0);
    });

    it("does nothing for non-existent productId", () => {
      useCartStore.getState().addItem(mockItem());
      useCartStore.getState().removeItem("non-existent");
      expect(useCartStore.getState().items).toHaveLength(1);
    });
  });

  describe("updateQuantity", () => {
    it("updates quantity of existing item", () => {
      useCartStore.getState().addItem(mockItem());
      useCartStore.getState().updateQuantity("prod-1", 5);
      expect(useCartStore.getState().items[0].quantity).toBe(5);
    });

    it("enforces minimum quantity of 1", () => {
      useCartStore.getState().addItem(mockItem());
      useCartStore.getState().updateQuantity("prod-1", 0);
      expect(useCartStore.getState().items[0].quantity).toBe(1);
    });

    it("enforces negative quantity to minimum 1", () => {
      useCartStore.getState().addItem(mockItem());
      useCartStore.getState().updateQuantity("prod-1", -5);
      expect(useCartStore.getState().items[0].quantity).toBe(1);
    });

    it("caps quantity at maxStock", () => {
      useCartStore.getState().addItem(mockItem({ maxStock: 3 }));
      useCartStore.getState().updateQuantity("prod-1", 10);
      expect(useCartStore.getState().items[0].quantity).toBe(3);
    });
  });

  describe("clearCart", () => {
    it("removes all items", () => {
      useCartStore.getState().addItem(mockItem({ productId: "prod-1" }));
      useCartStore.getState().addItem(mockItem({ productId: "prod-2", id: "s2", slug: "s2" }));
      useCartStore.getState().clearCart();
      expect(useCartStore.getState().items).toHaveLength(0);
    });

    it("updates the updatedAt timestamp", () => {
      const before = Date.now();
      useCartStore.getState().clearCart();
      expect(useCartStore.getState().updatedAt).toBeGreaterThanOrEqual(before);
    });
  });

  describe("toggleCart", () => {
    it("toggles isOpen state", () => {
      expect(useCartStore.getState().isOpen).toBe(false);
      useCartStore.getState().toggleCart();
      expect(useCartStore.getState().isOpen).toBe(true);
      useCartStore.getState().toggleCart();
      expect(useCartStore.getState().isOpen).toBe(false);
    });
  });

  describe("getTotal", () => {
    it("returns 0 for empty cart", () => {
      expect(useCartStore.getState().getTotal()).toBe(0);
    });

    it("calculates total price correctly", () => {
      useCartStore.getState().addItem(mockItem({ productId: "p1", price: 10, quantity: 2 }));
      useCartStore.getState().addItem(mockItem({ productId: "p2", id: "s2", slug: "s2", price: 5, quantity: 3 }));
      expect(useCartStore.getState().getTotal()).toBe(35); // 10*2 + 5*3
    });
  });

  describe("getItemCount", () => {
    it("returns 0 for empty cart", () => {
      expect(useCartStore.getState().getItemCount()).toBe(0);
    });

    it("returns total quantity across all items", () => {
      useCartStore.getState().addItem(mockItem({ productId: "p1", quantity: 2 }));
      useCartStore.getState().addItem(mockItem({ productId: "p2", id: "s2", slug: "s2", quantity: 3 }));
      expect(useCartStore.getState().getItemCount()).toBe(5);
    });
  });
});
