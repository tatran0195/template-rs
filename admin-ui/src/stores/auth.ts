import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/lib/api/types";

export enum Role {
  Admin = "admin",
  Author = "author",
  User = "user",
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  login: (user: User, accessToken: string, refreshToken: string) => void;
  setUser: (user: User | null) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  logout: () => void;
  isLoggedIn: () => boolean;
  isAdmin: () => boolean;
  isAuthor: () => boolean;
}

/** Mirrors the recovered `auth-storage` zustand store (persisted to localStorage). */
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      login: (user, accessToken, refreshToken) => set({ user, accessToken, refreshToken }),
      setUser: (user) => set({ user }),
      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
      logout: () => set({ user: null, accessToken: null, refreshToken: null }),
      isLoggedIn: () => get().accessToken !== null,
      isAdmin: () => get().user?.role === Role.Admin,
      isAuthor: () => {
        const r = get().user?.role;
        return r === Role.Admin || r === Role.Author;
      },
    }),
    { name: "auth-storage" },
  ),
);
