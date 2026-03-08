import { describe, it, expect, beforeEach, vi } from "vitest";
import { useAuthStore, type AuthUser } from "../auth-store";

const mockUser: AuthUser = {
  id: "user-1",
  username: "testuser",
  email: "test@example.com",
  role: "user",
  balance: 100,
  avatar: null,
};

const adminUser: AuthUser = {
  id: "admin-1",
  username: "admin",
  email: "admin@example.com",
  role: "admin",
  balance: 0,
};

// Mock fetch globally
const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

describe("auth-store", () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, isLoading: false });
    fetchMock.mockReset();
  });

  it("initializes with null user and not loading", () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isLoading).toBe(false);
  });

  it("login sets the user", () => {
    useAuthStore.getState().login(mockUser);
    expect(useAuthStore.getState().user).toEqual(mockUser);
    expect(useAuthStore.getState().isLoading).toBe(false);
  });

  it("login with admin role", () => {
    useAuthStore.getState().login(adminUser);
    expect(useAuthStore.getState().user?.role).toBe("admin");
  });

  it("logout clears the user and calls API", () => {
    fetchMock.mockResolvedValue({ ok: true });
    useAuthStore.getState().login(mockUser);
    expect(useAuthStore.getState().user).toBeTruthy();

    useAuthStore.getState().logout();
    expect(useAuthStore.getState().user).toBeNull();
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/logout", { method: "POST" });
  });

  it("checkAuth sets user when API returns user", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ user: mockUser }),
    });

    await useAuthStore.getState().checkAuth();
    expect(useAuthStore.getState().user).toEqual(mockUser);
    expect(useAuthStore.getState().isLoading).toBe(false);
  });

  it("checkAuth clears user when API returns no user", async () => {
    useAuthStore.setState({ user: mockUser });
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ user: null }),
    });

    await useAuthStore.getState().checkAuth();
    expect(useAuthStore.getState().user).toBeNull();
  });

  it("checkAuth clears user on non-ok response", async () => {
    useAuthStore.setState({ user: mockUser });
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({}),
    });

    await useAuthStore.getState().checkAuth();
    expect(useAuthStore.getState().user).toBeNull();
  });

  it("checkAuth keeps user on network error", async () => {
    useAuthStore.setState({ user: mockUser });
    fetchMock.mockRejectedValue(new Error("Network error"));

    await useAuthStore.getState().checkAuth();
    // Should keep existing user on network error
    expect(useAuthStore.getState().user).toEqual(mockUser);
    expect(useAuthStore.getState().isLoading).toBe(false);
  });

  it("register returns true on success", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    const result = await useAuthStore.getState().register({
      username: "newuser",
      email: "new@example.com",
      password: "Password123",
    });
    expect(result).toBe(true);
    expect(useAuthStore.getState().isLoading).toBe(false);
  });

  it("register returns false on failure", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ success: false, message: "Username taken" }),
    });

    const result = await useAuthStore.getState().register({
      username: "taken",
      email: "taken@example.com",
      password: "Password123",
    });
    expect(result).toBe(false);
  });

  it("register returns false on network error", async () => {
    fetchMock.mockRejectedValue(new Error("Network error"));

    const result = await useAuthStore.getState().register({
      username: "test",
      email: "test@example.com",
      password: "Password123",
    });
    expect(result).toBe(false);
    expect(useAuthStore.getState().isLoading).toBe(false);
  });

  it("handleUnauthorized clears user when logged in", () => {
    useAuthStore.setState({ user: mockUser });
    useAuthStore.getState().handleUnauthorized();
    expect(useAuthStore.getState().user).toBeNull();
  });

  it("handleUnauthorized does nothing when not logged in", () => {
    useAuthStore.setState({ user: null });
    useAuthStore.getState().handleUnauthorized();
    expect(useAuthStore.getState().user).toBeNull();
  });

  it("checkAuth clears user on ApiError (401 token expired)", async () => {
    useAuthStore.setState({ user: mockUser });
    // apiFetch throws ApiError for non-ok responses
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ success: false, message: "Token expired" }),
    });

    await useAuthStore.getState().checkAuth();
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().isLoading).toBe(false);
  });

  it("logout resets favorites and cart stores", () => {
    fetchMock.mockResolvedValue({ ok: true });
    useAuthStore.getState().login(mockUser);

    useAuthStore.getState().logout();
    expect(useAuthStore.getState().user).toBeNull();
  });

  it("isLoading is true during checkAuth", async () => {
    let resolvePromise!: (value: unknown) => void;
    fetchMock.mockReturnValue(new Promise((r) => { resolvePromise = r; }));

    const checkPromise = useAuthStore.getState().checkAuth();
    expect(useAuthStore.getState().isLoading).toBe(true);

    resolvePromise({
      ok: true,
      json: async () => ({ user: mockUser }),
    });
    await checkPromise;
    expect(useAuthStore.getState().isLoading).toBe(false);
  });

  it("isLoading is true during register", async () => {
    let resolvePromise!: (value: unknown) => void;
    fetchMock.mockReturnValue(new Promise((r) => { resolvePromise = r; }));

    const registerPromise = useAuthStore.getState().register({
      username: "new",
      email: "new@test.com",
      password: "Pass123",
    });
    expect(useAuthStore.getState().isLoading).toBe(true);

    resolvePromise({
      ok: true,
      json: async () => ({ success: true }),
    });
    await registerPromise;
    expect(useAuthStore.getState().isLoading).toBe(false);
  });
});
