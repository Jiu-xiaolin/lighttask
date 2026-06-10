import { create } from "zustand";

interface UIState {
  view: string;
  projectId: string;
  theme: string;
  compact: boolean;
  personalize: boolean;
  toast: string;
  refreshStamp: number;
  projectFilter: string;
  projectGroup: string;
  setView: (v: string) => void;
  setProjectId: (id: string) => void;
  setTheme: (t: string) => void;
  setCompact: (v: boolean) => void;
  setPersonalize: (v: boolean) => void;
  setToast: (msg: string) => void;
  refresh: () => void;
  setProjectFilter: (f: string) => void;
  setProjectGroup: (g: string) => void;
}

export const useUiStore = create<UIState>((set) => ({
  view: localStorage.getItem("lt_view") || "dashboard",
  projectId: localStorage.getItem("lt_projectId") || "",
  theme: localStorage.getItem("lt_theme") || (JSON.parse(localStorage.getItem("lt_user") || "null") || {}).theme || "letter",
  compact: false,
  personalize: false,
  toast: "",
  refreshStamp: 0,
  projectFilter: "",
  projectGroup: "",

  setView: (v) => { localStorage.setItem("lt_view", v); set({ view: v }); },
  setProjectId: (id) => { localStorage.setItem("lt_projectId", id); set({ projectId: id }); },
  setTheme: (t) => { localStorage.setItem("lt_theme", t); set({ theme: t }); },
  setCompact: (v) => set({ compact: v }),
  setPersonalize: (v) => set({ personalize: v }),
  setToast: (msg) => set({ toast: msg }),
  refresh: () => set((s) => ({ refreshStamp: s.refreshStamp + 1 })),
  setProjectFilter: (f) => set({ projectFilter: f }),
  setProjectGroup: (g) => set({ projectGroup: g }),
}));
