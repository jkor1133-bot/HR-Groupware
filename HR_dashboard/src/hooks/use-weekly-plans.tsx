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
import { buildSeedTasks } from "@/data/seed";
import { useMembers } from "@/hooks/use-members";
import type { WeeklyPlanBundle, WeeklyTask } from "@/lib/types";
import { taskOverlapsWeek, weekIdFromTaskDates } from "@/lib/week";

const STORAGE_KEY = "hr-dashboard-weekly-plans-v3";
export const WEEKLY_PLANS_EVENT = "hr-weekly-plans-updated";

function createSeedTasks(): WeeklyTask[] {
  return buildSeedTasks();
}

function normalizeTaskWeekId(task: WeeklyTask): WeeklyTask {
  const weekId = weekIdFromTaskDates(task);
  return weekId === task.weekId ? task : { ...task, weekId };
}

function loadTasks(): WeeklyTask[] {
  if (typeof window === "undefined") return createSeedTasks();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createSeedTasks();
    const parsed = JSON.parse(raw) as WeeklyPlanBundle;
    if (!parsed?.tasks || !Array.isArray(parsed.tasks)) return createSeedTasks();
    const normalized = parsed.tasks.map(normalizeTaskWeekId);
    const changed = normalized.some((t, i) => t.weekId !== parsed.tasks[i]?.weekId);
    if (changed) {
      saveTasks(normalized, new Date().toISOString());
    }
    return normalized;
  } catch {
    return createSeedTasks();
  }
}

function saveTasks(tasks: WeeklyTask[], updatedAt: string) {
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      version: 1,
      updatedAt,
      tasks,
      members: [],
    } satisfies WeeklyPlanBundle),
  );
  window.dispatchEvent(new CustomEvent(WEEKLY_PLANS_EVENT));
}

type WeeklyPlansContextValue = {
  hydrated: boolean;
  members: ReturnType<typeof useMembers>["members"];
  tasks: WeeklyTask[];
  tasksByWeek: (weekId: string) => WeeklyTask[];
  upsertTask: (task: WeeklyTask) => void;
  deleteTask: (taskId: string) => void;
  resetToSeed: () => void;
  exportJson: () => void;
  importJson: (file: File) => Promise<void>;
  stats: { total: number; members: number; updatedAt: string | null };
  reload: () => void;
};

const WeeklyPlansContext = createContext<WeeklyPlansContextValue | null>(null);

export function WeeklyPlansProvider({ children }: { children: ReactNode }) {
  const { members, hydrated: membersHydrated } = useMembers();
  const [tasks, setTasks] = useState<WeeklyTask[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const reload = useCallback(() => {
    const loaded = loadTasks();
    setTasks(loaded);
    setUpdatedAt(new Date().toISOString());
    setHydrated(true);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  // 다른 화면에서 저장했을 때·탭 복귀 시 동기화
  useEffect(() => {
    const onUpdate = () => reload();
    const onVis = () => {
      if (document.visibilityState === "visible") reload();
    };
    window.addEventListener(WEEKLY_PLANS_EVENT, onUpdate);
    window.addEventListener("storage", onUpdate);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener(WEEKLY_PLANS_EVENT, onUpdate);
      window.removeEventListener("storage", onUpdate);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [reload]);

  const persist = useCallback((nextTasks: WeeklyTask[]) => {
    const stamp = new Date().toISOString();
    setTasks(nextTasks);
    setUpdatedAt(stamp);
    saveTasks(nextTasks, stamp);
  }, []);

  const tasksByWeek = useCallback(
    (weekId: string) => tasks.filter((t) => taskOverlapsWeek(t, weekId)),
    [tasks],
  );

  const upsertTask = useCallback((task: WeeklyTask) => {
    const normalized: WeeklyTask = {
      ...task,
      weekId: weekIdFromTaskDates(task),
    };
    setTasks((prev) => {
      const exists = prev.some((t) => t.id === normalized.id);
      const next = exists
        ? prev.map((t) => (t.id === normalized.id ? normalized : t))
        : [...prev, normalized];
      const stamp = new Date().toISOString();
      setUpdatedAt(stamp);
      saveTasks(next, stamp);
      return next;
    });
  }, []);

  const deleteTask = useCallback((taskId: string) => {
    setTasks((prev) => {
      const next = prev.filter((t) => t.id !== taskId);
      const stamp = new Date().toISOString();
      setUpdatedAt(stamp);
      saveTasks(next, stamp);
      return next;
    });
  }, []);

  const resetToSeed = useCallback(() => {
    persist(createSeedTasks());
  }, [persist]);

  const exportJson = useCallback(() => {
    const bundle: WeeklyPlanBundle = {
      version: 1,
      updatedAt: updatedAt ?? new Date().toISOString(),
      members,
      tasks,
    };
    const blob = new Blob([JSON.stringify(bundle, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hr-weekly-plans-${bundle.updatedAt.slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [members, tasks, updatedAt]);

  const importJson = useCallback(async (file: File) => {
    const text = await file.text();
    const parsed = JSON.parse(text) as WeeklyPlanBundle;
    if (!parsed?.tasks || !Array.isArray(parsed.tasks)) {
      throw new Error("올바른 주간업무계획 파일이 아닙니다.");
    }
    persist(parsed.tasks);
  }, [persist]);

  const stats = useMemo(
    () => ({
      total: tasks.length,
      members: members.length,
      updatedAt,
    }),
    [members.length, tasks.length, updatedAt],
  );

  const value = useMemo<WeeklyPlansContextValue>(
    () => ({
      hydrated: hydrated && membersHydrated,
      members,
      tasks,
      tasksByWeek,
      upsertTask,
      deleteTask,
      resetToSeed,
      exportJson,
      importJson,
      stats,
      reload,
    }),
    [
      hydrated,
      membersHydrated,
      members,
      tasks,
      tasksByWeek,
      upsertTask,
      deleteTask,
      resetToSeed,
      exportJson,
      importJson,
      stats,
      reload,
    ],
  );

  return (
    <WeeklyPlansContext.Provider value={value}>
      {children}
    </WeeklyPlansContext.Provider>
  );
}

export function useWeeklyPlans() {
  const ctx = useContext(WeeklyPlansContext);
  if (!ctx) {
    throw new Error("useWeeklyPlans must be used within WeeklyPlansProvider");
  }
  return ctx;
}
