"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { buildSeedTasks } from "@/data/seed";
import { useMembers } from "@/hooks/use-members";
import type { WeeklyPlanBundle, WeeklyTask } from "@/lib/types";

const STORAGE_KEY = "hr-dashboard-weekly-plans-v3";

function createSeedTasks(): WeeklyTask[] {
  return buildSeedTasks();
}

function loadTasks(): WeeklyTask[] {
  if (typeof window === "undefined") return createSeedTasks();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createSeedTasks();
    const parsed = JSON.parse(raw) as WeeklyPlanBundle;
    if (!parsed?.tasks || !Array.isArray(parsed.tasks)) return createSeedTasks();
    return parsed.tasks;
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
      // members는 담당자 메뉴(hr-dashboard-members-v1)에서 관리
      members: [],
    } satisfies WeeklyPlanBundle),
  );
}

export function useWeeklyPlans() {
  const { members, hydrated: membersHydrated } = useMembers();
  const [tasks, setTasks] = useState<WeeklyTask[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const loaded = loadTasks();
    setTasks(loaded);
    setUpdatedAt(new Date().toISOString());
    setHydrated(true);
  }, []);

  const persist = useCallback((nextTasks: WeeklyTask[]) => {
    const stamp = new Date().toISOString();
    setTasks(nextTasks);
    setUpdatedAt(stamp);
    saveTasks(nextTasks, stamp);
  }, []);

  const tasksByWeek = useCallback(
    (weekId: string) => tasks.filter((t) => t.weekId === weekId),
    [tasks],
  );

  const upsertTask = useCallback(
    (task: WeeklyTask) => {
      const exists = tasks.some((t) => t.id === task.id);
      persist(
        exists
          ? tasks.map((t) => (t.id === task.id ? task : t))
          : [...tasks, task],
      );
    },
    [tasks, persist],
  );

  const deleteTask = useCallback(
    (taskId: string) => {
      persist(tasks.filter((t) => t.id !== taskId));
    },
    [tasks, persist],
  );

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

  const importJson = useCallback(
    async (file: File) => {
      const text = await file.text();
      const parsed = JSON.parse(text) as WeeklyPlanBundle;
      if (!parsed?.tasks || !Array.isArray(parsed.tasks)) {
        throw new Error("올바른 주간업무계획 파일이 아닙니다.");
      }
      persist(parsed.tasks);
    },
    [persist],
  );

  const stats = useMemo(
    () => ({
      total: tasks.length,
      members: members.length,
      updatedAt,
    }),
    [members.length, tasks.length, updatedAt],
  );

  return {
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
  };
}
