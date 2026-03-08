import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  role: "user" | "admin" | "super_admin";
  balance: number;
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
          const res = await fetch("/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          });

          const result = await res.json();
          set({ isLoading: false });
          return result.success;
        } catch {
          set({ isLoading: false });
          return false;
        }
      },

      logout: () => {
        set({ user: null });
        // Clear the session cookie by calling a logout endpoint or
        // letting the cookie expire. For now, clear local state.
        fetch("/api/auth/logout", { method: "POST" }).catch(() => {
          // Ignore logout API errors — local state is already cleared
        });
      },

      checkAuth: async () => {
        set({ isLoading: true });
        try {
          const res = await fetch("/api/auth/me");
          if (res.ok) {
            const data = await res.json();
            if (data.user) {
              set({ user: data.user, isLoading: false });
              return;
            }
          }
          set({ user: null, isLoading: false });
        } catch {
          set({ user: null, isLoading: false });
        }
      },
    }),
    {
      name: "pj37-auth",
      partialize: (state) => ({ user: state.user }),
    }
  )
);
