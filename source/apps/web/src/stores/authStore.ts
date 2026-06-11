import { create } from "zustand";
import type { User } from "../lib/types";

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem("lt_token") || null,
  user: JSON.parse(localStorage.getItem("lt_user") || "null"),
  isAuthenticated: !!localStorage.getItem("lt_token"),

  login: (token: string, user: User) => {
    localStorage.setItem("lt_token", token);
    localStorage.setItem("lt_user", JSON.stringify(user));
    set({ token, user, isAuthenticated: true });
    document.body.dataset.theme = user.theme || "letter";
  },

  logout: () => {
    localStorage.clear();
    set({ token: null, user: null, isAuthenticated: false });
  },

  setUser: (user: User) => {
    localStorage.setItem("lt_user", JSON.stringify(user));
    set({ user });
  },
}));
