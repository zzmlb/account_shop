import { create } from "zustand";
import { persist } from "zustand/middleware";
import { apiFetch, apiMutate, ApiError } from "@/lib/api-fetch";
import { useFavoritesStore } from "@/stores/favorites-store";
import { useCartStore } from "@/stores/cart-store";

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  role: "user" | "admin" | "super_admin";
  balance: number;
  avatar?: string | null;
}

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
}

interface AuthActions {
  login: (user: AuthUser) => void;
  register: (data: { username: string; email: string; password: string }) => Promise<boolean>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  /** Call when an API returns 401 to clear stale auth state */
  handleUnauthorized: () => void;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      isLoading: false,

      login: (user: AuthUser) => {
        set({ user, isLoading: false });
      },

      register: async (data) => {
        set({ isLoading: true });
        try {
          await apiMutate("/api/auth/register", "POST", data);
          set({ isLoading: false });
          return true;
        } catch {
          set({ isLoading: false });
          return false;
        }
      },

      logout: () => {
        set({ user: null });
        // Reset client stores on logout
        useFavoritesStore.getState().reset();
        useCartStore.getState().clearCart();
        // Clear the session cookie
        fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
      },

      checkAuth: async () => {
        set({ isLoading: true });
        try {
          const data = await apiFetch<{ user: AuthUser }>("/api/auth/me");
          if (data.user) {
            set({ user: data.user, isLoading: false });
            return;
          }
          // Session invalid - clear stale persisted user data
          set({ user: null, isLoading: false });
        } catch (err) {
          if (err instanceof ApiError) {
            // Server responded with error (401, etc.) - session invalid
            set({ user: null, isLoading: false });
          } else {
            // Network error - keep existing user data to avoid logout on transient failures
            set({ isLoading: false });
          }
        }
      },

      handleUnauthorized: () => {
        const currentUser = useAuthStore.getState().user;
        if (currentUser) {
          set({ user: null });
          useFavoritesStore.getState().reset();
          // Redirect to login with current path
          if (typeof window !== "undefined") {
            const from = window.location.pathname;
            window.location.href = `/login?from=${encodeURIComponent(from)}&expired=1`;
          }
        }
      },
    }),
    {
      name: "pj37-auth",
      partialize: (state) => ({ user: state.user }),
    }
  )
);
