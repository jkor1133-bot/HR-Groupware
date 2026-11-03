"use client";

import { useCallback, useEffect, useState } from "react";
import { seedStaffMovements } from "@/data/staff-movements-seed";
import { EMPLOYEES_UPDATED_EVENT } from "@/lib/employee-roster";
import {
  STAFF_MOVEMENTS_EVENT,
  STAFF_MOVEMENTS_STORAGE_KEY,
  loadRosterFromStorage,
  mergeRosterHiresIntoMovements,
  notifyStaffMovementsUpdated,
} from "@/lib/staff-movements";
import type { StaffMovementRecord } from "@/lib/types";

function loadRaw(): StaffMovementRecord[] {
  if (typeof window === "undefined") return seedStaffMovements();
  try {
    const raw = window.localStorage.getItem(STAFF_MOVEMENTS_STORAGE_KEY);
    if (!raw) return seedStaffMovements();
    const parsed = JSON.parse(raw) as StaffMovementRecord[];
    return Array.isArray(parsed) ? parsed : seedStaffMovements();
  } catch {
    return seedStaffMovements();
  }
}

function persist(next: StaffMovementRecord[], emitEvent = true) {
  window.localStorage.setItem(STAFF_MOVEMENTS_STORAGE_KEY, JSON.stringify(next));
  if (emitEvent) notifyStaffMovementsUpdated();
}

/** 사원명부(2026-01-01~) 입사자 → 입퇴사자 현황 동기화 */
function loadAndSyncFromRoster(): StaffMovementRecord[] {
  const base = loadRaw();
  if (typeof window === "undefined") return base;
  const roster = loadRosterFromStorage();
  const { items, added } = mergeRosterHiresIntoMovements(base, roster);
  if (added > 0) {
    persist(items, true);
  }
  return items;
}

export function useStaffMovements() {
  const [items, setItems] = useState<StaffMovementRecord[]>([]);
  const [hydrated, setHydrated] = useState(false);

  const reload = useCallback(() => {
    setItems(loadAndSyncFromRoster());
    setHydrated(true);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    const onUpdate = () => reload();
    const onVis = () => {
      if (document.visibilityState === "visible") reload();
    };
    window.addEventListener(STAFF_MOVEMENTS_EVENT, onUpdate);
    window.addEventListener(EMPLOYEES_UPDATED_EVENT, onUpdate);
    window.addEventListener("storage", onUpdate);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener(STAFF_MOVEMENTS_EVENT, onUpdate);
      window.removeEventListener(EMPLOYEES_UPDATED_EVENT, onUpdate);
      window.removeEventListener("storage", onUpdate);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [reload]);

  const upsert = useCallback((item: StaffMovementRecord) => {
    setItems((prev) => {
      const exists = prev.some((x) => x.id === item.id);
      const next = exists
        ? prev.map((x) => (x.id === item.id ? item : x))
        : [...prev, item];
      persist(next);
      return next;
    });
  }, []);

  const remove = useCallback((id: string) => {
    setItems((prev) => {
      const next = prev.filter((x) => x.id !== id);
      persist(next);
      return next;
    });
  }, []);

  const replaceAll = useCallback((next: StaffMovementRecord[]) => {
    setItems(next);
    persist(next);
  }, []);

  return { hydrated, items, upsert, remove, replaceAll, reload };
}
