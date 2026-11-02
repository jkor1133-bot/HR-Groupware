"use client";

import { useCallback, useEffect, useState } from "react";
import { seedEmployeeRoster } from "@/data/employee-roster-seed";
import {
  EMPLOYEES_STORAGE_KEY,
  EMPLOYEES_UPDATED_EVENT,
  notifyEmployeesUpdated,
} from "@/lib/employee-roster";
import type { EmployeeRosterRecord } from "@/lib/types";

function sanitizeEmployee(
  raw: EmployeeRosterRecord & { birthDate?: string },
): EmployeeRosterRecord {
  const { birthDate: _omit, ...rest } = raw;
  void _omit;
  const years = Number(rest.titleYears);
  return {
    id: rest.id,
    division: rest.division ?? "",
    department: rest.department ?? "",
    empNo: rest.empNo ?? "",
    name: rest.name ?? "",
    title: rest.title ?? "",
    jobRole: rest.jobRole ?? "",
    jobTrack: rest.jobTrack ?? "",
    gender: rest.gender ?? "",
    titleYears: Number.isFinite(years) && years >= 0 ? years : 1,
    groupHireDate: rest.groupHireDate ?? "",
    hireDate: rest.hireDate ?? "",
  };
}

function loadEmployees(): EmployeeRosterRecord[] {
  if (typeof window === "undefined") return seedEmployeeRoster();
  try {
    const raw = window.localStorage.getItem(EMPLOYEES_STORAGE_KEY);
    if (!raw) return seedEmployeeRoster();
    const parsed = JSON.parse(raw) as EmployeeRosterRecord[];
    if (!Array.isArray(parsed)) return seedEmployeeRoster();
    const cleaned = parsed.map(sanitizeEmployee);
    const hadBirth = parsed.some(
      (e) => e && typeof e === "object" && "birthDate" in e,
    );
    if (hadBirth) {
      window.localStorage.setItem(
        EMPLOYEES_STORAGE_KEY,
        JSON.stringify(cleaned),
      );
    }
    return cleaned;
  } catch {
    return seedEmployeeRoster();
  }
}

function persist(next: EmployeeRosterRecord[]) {
  window.localStorage.setItem(
    EMPLOYEES_STORAGE_KEY,
    JSON.stringify(next.map(sanitizeEmployee)),
  );
  notifyEmployeesUpdated();
}

/** 사원명부 조회·갱신 (다른 메뉴에서도 동일 키로 연동) */
export function useEmployees() {
  const [items, setItems] = useState<EmployeeRosterRecord[]>([]);
  const [hydrated, setHydrated] = useState(false);

  const reload = useCallback(() => {
    setItems(loadEmployees());
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
    window.addEventListener(EMPLOYEES_UPDATED_EVENT, onUpdate);
    window.addEventListener("storage", onUpdate);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener(EMPLOYEES_UPDATED_EVENT, onUpdate);
      window.removeEventListener("storage", onUpdate);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [reload]);

  const upsert = useCallback((item: EmployeeRosterRecord) => {
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

  const replaceAll = useCallback((next: EmployeeRosterRecord[]) => {
    setItems(next);
    persist(next);
  }, []);

  const reset = useCallback(() => {
    const next = seedEmployeeRoster();
    setItems(next);
    persist(next);
  }, []);

  const findByName = useCallback(
    (name: string) =>
      items.find((e) => e.name.trim() === name.trim()) ?? null,
    [items],
  );

  return {
    hydrated,
    items,
    upsert,
    remove,
    replaceAll,
    reset,
    reload,
    findByName,
  };
}
