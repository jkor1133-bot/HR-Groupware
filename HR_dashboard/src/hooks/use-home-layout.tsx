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
import { defaultHomeLayout } from "@/data/home-layout";
import type {
  HomeLayoutPrefs,
  HomeViewId,
  HomeWidgetConfig,
  HomeWidgetId,
  HomeWidgetSize,
} from "@/lib/types";

const STORAGE_KEY = "hr-dashboard-home-layout-v1";

function normalize(prefs: HomeLayoutPrefs): HomeLayoutPrefs {
  const seed = defaultHomeLayout();
  const merge = (
    saved: HomeWidgetConfig[] | undefined,
    defaults: HomeWidgetConfig[],
  ) => {
    const byId = new Map((saved ?? []).map((w) => [w.id, w]));
    const merged = defaults.map((d) => {
      const s = byId.get(d.id);
      return s
        ? {
            id: d.id,
            visible: s.visible,
            size: s.size === "full" ? ("full" as const) : ("half" as const),
            order: typeof s.order === "number" ? s.order : d.order,
          }
        : d;
    });
    return merged
      .sort((a, b) => a.order - b.order)
      .map((w, i) => ({ ...w, order: i }));
  };

  let hrWidgets = merge(prefs.hrWidgets, seed.hrWidgets).map((w) =>
    (prefs.version ?? 1) < 2 ? { ...w, size: "full" as const } : w,
  );

  // v3: KPI7 → 도넛 → 전사KPI2 → 비교표 고정 순서
  if ((prefs.version ?? 1) < 3) {
    const orderIds = [
      "hr_kpi",
      "hr_demographics",
      "hr_compensation",
      "hr_org",
    ] as const;
    const byId = new Map(hrWidgets.map((w) => [w.id, w]));
    hrWidgets = orderIds.map((id, order) => {
      const prev = byId.get(id);
      return {
        id,
        order,
        visible: prev?.visible ?? true,
        size: "full" as const,
      };
    });
  }

  return {
    version: 3,
    defaultView: prefs.defaultView === "hr" ? "hr" : "ops",
    opsWidgets: merge(prefs.opsWidgets, seed.opsWidgets),
    hrWidgets,
  };
}

type HomeLayoutContextValue = {
  hydrated: boolean;
  prefs: HomeLayoutPrefs;
  sortedOps: HomeWidgetConfig[];
  sortedHr: HomeWidgetConfig[];
  setDefaultView: (view: HomeViewId) => void;
  updateWidget: (
    view: HomeViewId,
    id: HomeWidgetId,
    patch: Partial<Pick<HomeWidgetConfig, "visible" | "size">>,
  ) => void;
  moveWidget: (view: HomeViewId, id: HomeWidgetId, dir: -1 | 1) => void;
  setWidgetSize: (
    view: HomeViewId,
    id: HomeWidgetId,
    size: HomeWidgetSize,
  ) => void;
  reset: () => void;
};

const HomeLayoutContext = createContext<HomeLayoutContextValue | null>(null);

export function HomeLayoutProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<HomeLayoutPrefs>(defaultHomeLayout);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setPrefs(normalize(JSON.parse(raw) as HomeLayoutPrefs));
      } else {
        setPrefs(defaultHomeLayout());
      }
    } catch {
      setPrefs(defaultHomeLayout());
    }
    setHydrated(true);
  }, []);

  const persist = useCallback((next: HomeLayoutPrefs) => {
    const normalized = normalize(next);
    setPrefs(normalized);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  }, []);

  const setDefaultView = useCallback(
    (defaultView: HomeViewId) => persist({ ...prefs, defaultView }),
    [persist, prefs],
  );

  const updateWidget = useCallback(
    (
      view: HomeViewId,
      id: HomeWidgetId,
      patch: Partial<Pick<HomeWidgetConfig, "visible" | "size">>,
    ) => {
      const key = view === "ops" ? "opsWidgets" : "hrWidgets";
      persist({
        ...prefs,
        [key]: prefs[key].map((w) => (w.id === id ? { ...w, ...patch } : w)),
      });
    },
    [persist, prefs],
  );

  const moveWidget = useCallback(
    (view: HomeViewId, id: HomeWidgetId, dir: -1 | 1) => {
      const key = view === "ops" ? "opsWidgets" : "hrWidgets";
      const list = [...prefs[key]].sort((a, b) => a.order - b.order);
      const idx = list.findIndex((w) => w.id === id);
      const target = idx + dir;
      if (idx < 0 || target < 0 || target >= list.length) return;
      const next = [...list];
      const tmp = next[idx];
      next[idx] = next[target];
      next[target] = tmp;
      persist({
        ...prefs,
        [key]: next.map((w, order) => ({ ...w, order })),
      });
    },
    [persist, prefs],
  );

  const setWidgetSize = useCallback(
    (view: HomeViewId, id: HomeWidgetId, size: HomeWidgetSize) => {
      updateWidget(view, id, { size });
    },
    [updateWidget],
  );

  const reset = useCallback(() => persist(defaultHomeLayout()), [persist]);

  const sortedOps = useMemo(
    () => [...prefs.opsWidgets].sort((a, b) => a.order - b.order),
    [prefs.opsWidgets],
  );
  const sortedHr = useMemo(
    () => [...prefs.hrWidgets].sort((a, b) => a.order - b.order),
    [prefs.hrWidgets],
  );

  const value = useMemo(
    () => ({
      hydrated,
      prefs,
      sortedOps,
      sortedHr,
      setDefaultView,
      updateWidget,
      moveWidget,
      setWidgetSize,
      reset,
    }),
    [
      hydrated,
      prefs,
      sortedOps,
      sortedHr,
      setDefaultView,
      updateWidget,
      moveWidget,
      setWidgetSize,
      reset,
    ],
  );

  return (
    <HomeLayoutContext.Provider value={value}>
      {children}
    </HomeLayoutContext.Provider>
  );
}

export function useHomeLayout() {
  const ctx = useContext(HomeLayoutContext);
  if (!ctx) {
    throw new Error("useHomeLayout must be used within HomeLayoutProvider");
  }
  return ctx;
}
