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
import {
  HOME_LAYOUT_VERSION,
  defaultHomeLayout,
} from "@/data/home-layout";
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

  let opsWidgets = merge(prefs.opsWidgets, seed.opsWidgets);

  // v4: 연차 위젯 제거 → 이번주 업무 진행 · KPI 진척 추가
  if ((prefs.version ?? 1) < 4) {
    const byId = new Map(opsWidgets.map((w) => [w.id, w]));
    const leave = byId.get("leave" as HomeWidgetId);
    const orderIds = seed.opsWidgets.map((w) => w.id);
    opsWidgets = orderIds.map((id, order) => {
      const prev = byId.get(id);
      const visible =
        prev?.visible ??
        (id === "weekly_progress"
          ? leave?.visible !== false
          : id === "kpi_progress"
            ? false
            : seed.opsWidgets.find((w) => w.id === id)?.visible ?? true);
      const size =
        prev?.size ??
        seed.opsWidgets.find((w) => w.id === id)?.size ??
        "half";
      return { id, order, visible, size };
    });
  }

  // v5: KPI 단독 위젯 숨기고 업무 진행 패널에 포함
  if ((prefs.version ?? 1) < 5) {
    opsWidgets = opsWidgets.map((w) =>
      w.id === "kpi_progress" ? { ...w, visible: false } : w,
    );
  }

  // v6: 계약·인허가 알림 단독 위젯 숨김 (Calendar에 표시)
  if ((prefs.version ?? 1) < 6) {
    opsWidgets = opsWidgets.map((w) =>
      w.id === "contracts_alerts" ? { ...w, visible: false } : w,
    );
  }

  // v7: KPI를 Calendar·이번주 업무진행 아래 전체 너비로
  if ((prefs.version ?? 1) < 7) {
    const byId = new Map(opsWidgets.map((w) => [w.id, w]));
    const orderIds = [
      "weekly_plans",
      "calendar",
      "weekly_progress",
      "kpi_progress",
      "contracts_alerts",
      "labor_cost",
      "work_hours",
    ] as const;
    opsWidgets = orderIds.map((id, order) => {
      const prev = byId.get(id);
      const def = seed.opsWidgets.find((w) => w.id === id);
      return {
        id,
        order,
        visible:
          id === "kpi_progress"
            ? true
            : (prev?.visible ?? def?.visible ?? false),
        size:
          id === "kpi_progress" || id === "weekly_plans"
            ? ("full" as const)
            : (prev?.size ?? def?.size ?? "half"),
      };
    });
  }

  return {
    version: HOME_LAYOUT_VERSION,
    defaultView: prefs.defaultView === "hr" ? "hr" : "ops",
    opsWidgets,
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
