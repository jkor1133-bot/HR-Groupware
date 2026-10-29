"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { FontScale, ThemeMode, ViewMode } from "@/lib/types";

const STORAGE_KEY = "hr-dashboard-view-prefs-v1";

type ViewPrefs = {
  theme: ThemeMode;
  viewMode: ViewMode;
  fontScale: FontScale;
};

type ViewPrefsContextValue = ViewPrefs & {
  hydrated: boolean;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  setViewMode: (mode: ViewMode) => void;
  setFontScale: (scale: FontScale) => void;
  bumpFont: (delta: -10 | 10) => void;
};

const DEFAULT: ViewPrefs = {
  theme: "light",
  viewMode: "pc",
  fontScale: 100,
};

const ViewPrefsContext = createContext<ViewPrefsContextValue | null>(null);

function clampFont(n: number): FontScale {
  if (n <= 90) return 90;
  if (n <= 100) return 100;
  if (n <= 110) return 110;
  return 120;
}

function applyDomPrefs(prefs: ViewPrefs) {
  const root = document.documentElement;
  root.classList.toggle("dark", prefs.theme === "dark");
  root.dataset.viewMode = prefs.viewMode;
  root.style.setProperty("--app-font-scale", String(prefs.fontScale / 100));
  root.style.fontSize = `${(prefs.fontScale / 100) * 16}px`;
}

export function ViewPrefsProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<ViewPrefs>(DEFAULT);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<ViewPrefs>;
        const next: ViewPrefs = {
          theme: parsed.theme === "dark" ? "dark" : "light",
          viewMode: parsed.viewMode === "mobile" ? "mobile" : "pc",
          fontScale: clampFont(Number(parsed.fontScale ?? 100)),
        };
        setPrefs(next);
        applyDomPrefs(next);
      } else {
        applyDomPrefs(DEFAULT);
      }
    } catch {
      applyDomPrefs(DEFAULT);
    }
    setHydrated(true);
  }, []);

  const persist = useCallback((next: ViewPrefs) => {
    setPrefs(next);
    applyDomPrefs(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const value = useMemo<ViewPrefsContextValue>(
    () => ({
      ...prefs,
      hydrated,
      setTheme: (theme) => persist({ ...prefs, theme }),
      toggleTheme: () =>
        persist({
          ...prefs,
          theme: prefs.theme === "dark" ? "light" : "dark",
        }),
      setViewMode: (viewMode) => persist({ ...prefs, viewMode }),
      setFontScale: (fontScale) => persist({ ...prefs, fontScale }),
      bumpFont: (delta) =>
        persist({ ...prefs, fontScale: clampFont(prefs.fontScale + delta) }),
    }),
    [hydrated, persist, prefs],
  );

  return (
    <ViewPrefsContext.Provider value={value}>
      {children}
    </ViewPrefsContext.Provider>
  );
}

export function useViewPrefs() {
  const ctx = useContext(ViewPrefsContext);
  if (!ctx) {
    throw new Error("useViewPrefs must be used within ViewPrefsProvider");
  }
  return ctx;
}
