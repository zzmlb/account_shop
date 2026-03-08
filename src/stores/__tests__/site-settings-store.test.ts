import { describe, it, expect, beforeEach, vi } from "vitest";
import { useSiteSettingsStore } from "../site-settings-store";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

describe("site-settings-store", () => {
  beforeEach(() => {
    useSiteSettingsStore.setState({
      siteName: "PJ37 Digital",
      siteDescription: "",
      logoUrl: "",
      announcement: "",
      loaded: false,
    });
    fetchMock.mockReset();
  });

  it("initializes with default values", () => {
    const state = useSiteSettingsStore.getState();
    expect(state.loaded).toBe(false);
    expect(typeof state.siteName).toBe("string");
    expect(state.logoUrl).toBe("");
    expect(state.announcement).toBe("");
  });

  it("load fetches and sets site settings", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        settings: {
          site_name: "My Shop",
          site_description: "Best digital goods",
          logo_url: "https://example.com/logo.png",
          announcement: "Sale now!",
        },
      }),
    });

    await useSiteSettingsStore.getState().load();
    const state = useSiteSettingsStore.getState();
    expect(state.siteName).toBe("My Shop");
    expect(state.siteDescription).toBe("Best digital goods");
    expect(state.logoUrl).toBe("https://example.com/logo.png");
    expect(state.announcement).toBe("Sale now!");
    expect(state.loaded).toBe(true);
  });

  it("load skips if already loaded", async () => {
    useSiteSettingsStore.setState({ loaded: true });

    await useSiteSettingsStore.getState().load();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("load uses defaults on API failure", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({}),
    });

    await useSiteSettingsStore.getState().load();
    expect(useSiteSettingsStore.getState().loaded).toBe(false);
    expect(useSiteSettingsStore.getState().siteName).toBe("PJ37 Digital");
  });

  it("load uses defaults on network error", async () => {
    fetchMock.mockRejectedValue(new Error("Network error"));

    await useSiteSettingsStore.getState().load();
    expect(useSiteSettingsStore.getState().loaded).toBe(false);
  });

  it("load uses defaults when settings are empty", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        settings: {
          site_name: "",
          site_description: "",
          logo_url: "",
          announcement: "",
        },
      }),
    });

    await useSiteSettingsStore.getState().load();
    const state = useSiteSettingsStore.getState();
    // Falls back to SITE_NAME constant when empty string
    expect(state.siteName).toBe("PJ37 Digital");
    expect(state.loaded).toBe(true);
  });

  it("load handles success:false response", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ success: false }),
    });

    await useSiteSettingsStore.getState().load();
    expect(useSiteSettingsStore.getState().loaded).toBe(false);
  });
});
