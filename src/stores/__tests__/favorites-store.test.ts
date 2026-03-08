import { describe, it, expect, beforeEach, vi } from "vitest";
import { useFavoritesStore } from "../favorites-store";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

describe("favorites-store", () => {
  beforeEach(() => {
    useFavoritesStore.getState().reset();
    fetchMock.mockReset();
  });

  it("initializes with empty state", () => {
    const state = useFavoritesStore.getState();
    expect(state.ids.size).toBe(0);
    expect(state.loaded).toBe(false);
    expect(state.loading).toBe(false);
  });

  it("has() returns false for unknown product", () => {
    expect(useFavoritesStore.getState().has("prod-1")).toBe(false);
  });

  it("reset clears all state", () => {
    useFavoritesStore.setState({
      ids: new Set(["a", "b"]),
      loaded: true,
      loading: false,
    });
    useFavoritesStore.getState().reset();
    expect(useFavoritesStore.getState().ids.size).toBe(0);
    expect(useFavoritesStore.getState().loaded).toBe(false);
  });

  it("load fetches favorites from API", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        favorites: [
          { product: { id: "p1" } },
          { product: { id: "p2" } },
        ],
      }),
    });

    await useFavoritesStore.getState().load();
    expect(useFavoritesStore.getState().ids.size).toBe(2);
    expect(useFavoritesStore.getState().has("p1")).toBe(true);
    expect(useFavoritesStore.getState().has("p2")).toBe(true);
    expect(useFavoritesStore.getState().loaded).toBe(true);
    expect(useFavoritesStore.getState().loading).toBe(false);
  });

  it("load skips if already loaded", async () => {
    useFavoritesStore.setState({ loaded: true });

    await useFavoritesStore.getState().load();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("load skips if already loading", async () => {
    useFavoritesStore.setState({ loading: true });

    await useFavoritesStore.getState().load();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("load handles API failure gracefully", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ success: false }),
    });

    await useFavoritesStore.getState().load();
    expect(useFavoritesStore.getState().ids.size).toBe(0);
    expect(useFavoritesStore.getState().loaded).toBe(false);
    expect(useFavoritesStore.getState().loading).toBe(false);
  });

  it("load handles network error gracefully", async () => {
    fetchMock.mockRejectedValue(new Error("Network error"));

    await useFavoritesStore.getState().load();
    expect(useFavoritesStore.getState().loading).toBe(false);
    expect(useFavoritesStore.getState().loaded).toBe(false);
  });

  it("add optimistically adds then confirms", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    const result = await useFavoritesStore.getState().add("p1");
    expect(result).toBe(true);
    expect(useFavoritesStore.getState().has("p1")).toBe(true);
  });

  it("add rolls back on API failure", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ success: false }),
    });

    const result = await useFavoritesStore.getState().add("p1");
    expect(result).toBe(false);
    expect(useFavoritesStore.getState().has("p1")).toBe(false);
  });

  it("add rolls back on network error", async () => {
    fetchMock.mockRejectedValue(new Error("Network error"));

    const result = await useFavoritesStore.getState().add("p1");
    expect(result).toBe(false);
    expect(useFavoritesStore.getState().has("p1")).toBe(false);
  });

  it("remove optimistically removes then confirms", async () => {
    useFavoritesStore.setState({ ids: new Set(["p1", "p2"]) });
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    const result = await useFavoritesStore.getState().remove("p1");
    expect(result).toBe(true);
    expect(useFavoritesStore.getState().has("p1")).toBe(false);
    expect(useFavoritesStore.getState().has("p2")).toBe(true);
  });

  it("remove rolls back on API failure", async () => {
    useFavoritesStore.setState({ ids: new Set(["p1"]) });
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ success: false }),
    });

    const result = await useFavoritesStore.getState().remove("p1");
    expect(result).toBe(false);
    expect(useFavoritesStore.getState().has("p1")).toBe(true);
  });

  it("remove rolls back on network error", async () => {
    useFavoritesStore.setState({ ids: new Set(["p1"]) });
    fetchMock.mockRejectedValue(new Error("Network error"));

    const result = await useFavoritesStore.getState().remove("p1");
    expect(result).toBe(false);
    expect(useFavoritesStore.getState().has("p1")).toBe(true);
  });
});
