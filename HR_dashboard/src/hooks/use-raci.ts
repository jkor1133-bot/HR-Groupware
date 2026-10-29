"use client";

import { useCallback, useEffect, useState } from "react";
import { buildRaciSeed } from "@/data/raci-seed";
import { useMembers } from "@/hooks/use-members";
import type { RaciActivity, RaciBundle } from "@/lib/types";

const STORAGE_KEY = "hr-dashboard-raci-v5";

function loadActivities(): RaciActivity[] {
  if (typeof window === "undefined") return buildRaciSeed().activities;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return buildRaciSeed().activities;
    const parsed = JSON.parse(raw) as RaciBundle;
    if (!parsed?.activities || !Array.isArray(parsed.activities)) {
      return buildRaciSeed().activities;
    }
    return parsed.activities;
  } catch {
    return buildRaciSeed().activities;
  }
}

export function useRaci() {
  const { members, hydrated: membersHydrated } = useMembers();
  const [activities, setActivities] = useState<RaciActivity[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setActivities(loadActivities());
    setUpdatedAt(new Date().toISOString());
    setHydrated(true);
  }, []);

  const persist = useCallback((next: RaciActivity[]) => {
    const stamp = new Date().toISOString();
    setActivities(next);
    setUpdatedAt(stamp);
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        updatedAt: stamp,
        activities: next,
        members: [],
      } satisfies RaciBundle),
    );
  }, []);

  const replaceAll = useCallback(
    (next: RaciActivity[]) => {
      persist(next);
    },
    [persist],
  );

  /** 모든 비중을 0으로 */
  const clearWeights = useCallback(() => {
    const memberIds = members.map((m) => m.id);
    persist(
      activities.map((a) => {
        const weights: Record<string, number> = { ...a.weights };
        for (const id of memberIds) weights[id] = 0;
        for (const key of Object.keys(weights)) weights[key] = 0;
        return { ...a, weights };
      }),
    );
  }, [activities, members, persist]);

  const upsertActivity = useCallback(
    (activity: RaciActivity) => {
      const exists = activities.some((a) => a.id === activity.id);
      persist(
        exists
          ? activities.map((a) => (a.id === activity.id ? activity : a))
          : [...activities, activity],
      );
    },
    [activities, persist],
  );

  const removeActivity = useCallback(
    (id: string) => {
      persist(activities.filter((a) => a.id !== id));
    },
    [activities, persist],
  );

  return {
    hydrated: hydrated && membersHydrated,
    members,
    activities,
    replaceAll,
    clearWeights,
    upsertActivity,
    removeActivity,
    updatedAt,
  };
}
