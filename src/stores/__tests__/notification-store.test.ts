import { describe, it, expect, beforeEach, vi } from "vitest";
import { useNotificationStore } from "../notification-store";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

describe("notification-store", () => {
  beforeEach(() => {
    useNotificationStore.setState({
      unreadCount: 0,
      lastFetched: 0,
    });
    fetchMock.mockReset();
  });

  describe("initial state", () => {
    it("starts with zero unread count", () => {
      const state = useNotificationStore.getState();
      expect(state.unreadCount).toBe(0);
      expect(state.lastFetched).toBe(0);
    });
  });

  describe("fetchCount", () => {
    it("fetches unread count from API", async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ count: 5 }),
      });

      useNotificationStore.getState().fetchCount();
      // Wait for async fetch to complete
      await vi.waitFor(() => {
        expect(useNotificationStore.getState().unreadCount).toBe(5);
      });
    });

    it("debounces calls within the interval", () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ count: 3 }),
      });

      useNotificationStore.getState().fetchCount();
      useNotificationStore.getState().fetchCount(); // Should be debounced
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("defaults to 0 when API returns no count", async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      useNotificationStore.getState().fetchCount();
      await vi.waitFor(() => {
        expect(useNotificationStore.getState().unreadCount).toBe(0);
      });
    });

    it("handles network error gracefully", async () => {
      useNotificationStore.setState({ unreadCount: 5 });
      fetchMock.mockRejectedValue(new Error("Network error"));

      useNotificationStore.getState().fetchCount();
      // Wait a tick to ensure the catch runs
      await new Promise((r) => setTimeout(r, 50));
      // Count should remain as-is after error (catch is a no-op)
      expect(useNotificationStore.getState().unreadCount).toBe(5);
    });
  });

  describe("decrement", () => {
    it("decreases unread count by 1", () => {
      useNotificationStore.setState({ unreadCount: 5 });
      useNotificationStore.getState().decrement();
      expect(useNotificationStore.getState().unreadCount).toBe(4);
    });

    it("does not go below 0", () => {
      useNotificationStore.setState({ unreadCount: 0 });
      useNotificationStore.getState().decrement();
      expect(useNotificationStore.getState().unreadCount).toBe(0);
    });

    it("clamps at 0 from 1", () => {
      useNotificationStore.setState({ unreadCount: 1 });
      useNotificationStore.getState().decrement();
      expect(useNotificationStore.getState().unreadCount).toBe(0);
    });
  });

  describe("reset", () => {
    it("sets unread count to 0", () => {
      useNotificationStore.setState({ unreadCount: 10 });
      useNotificationStore.getState().reset();
      expect(useNotificationStore.getState().unreadCount).toBe(0);
    });
  });
});
