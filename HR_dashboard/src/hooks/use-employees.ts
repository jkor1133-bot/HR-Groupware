"use client";

import { useCallback, useEffect, useState } from "react";
import {
  EMPLOYEE_SALARY_IMPORT_FLAG,
  applySalaryByName,
} from "@/data/employee-salary-by-name";
import { seedEmployeeRoster } from "@/data/employee-roster-seed";
import {
  EMPLOYEES_STORAGE_KEY,
  EMPLOYEES_UPDATED_EVENT,
  notifyEmployeesUpdated,
} from "@/lib/employee-roster";
import type { EmployeeRosterRecord } from "@/lib/types";

function parseStoredTitleYears(raw: Record<string, unknown>): number {
  const candidates = [raw.titleYears, raw["직위년차"], raw["년차"]];
  for (const c of candidates) {
    if (c == null || c === "") continue;
    const n = typeof c === "number" ? c : Number(String(c).replace(/,/g, ""));
    if (Number.isFinite(n) && n >= 0 && n <= 60) return Math.floor(n);
  }
  return 1;
}

function parseStoredSalary(raw: Record<string, unknown>): number {
  const candidates = [raw.salary, raw["연봉"], raw["연봉(원)"]];
  for (const c of candidates) {
    if (c == null || c === "") continue;
    const n =
      typeof c === "number" ? c : Number(String(c).replace(/[,₩원\s]/g, ""));
    if (Number.isFinite(n) && n >= 0) return Math.floor(n);
  }
  return 0;
}

function sanitizeEmployee(
  raw: EmployeeRosterRecord & { birthDate?: string },
): EmployeeRosterRecord {
  const { birthDate: _omit, ...rest } = raw;
  void _omit;
  const asRec = raw as unknown as Record<string, unknown>;
  return {
    id: rest.id,
    division: rest.division ?? "",
    department: rest.department ?? "",
    part: String(asRec.part ?? asRec["파트"] ?? rest.part ?? ""),
    empNo: rest.empNo ?? "",
    name: rest.name ?? "",
    title: rest.title ?? "",
    jobRole: rest.jobRole ?? "",
    jobTrack: rest.jobTrack ?? "",
    gender: rest.gender ?? "",
    titleYears: parseStoredTitleYears(asRec),
    salary: parseStoredSalary(asRec),
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
    let cleaned = parsed.map(sanitizeEmployee);
    const needsRewrite = parsed.some((e) => {
      if (!e || typeof e !== "object") return true;
      const rec = e as EmployeeRosterRecord & { birthDate?: string };
      return (
        "birthDate" in rec ||
        typeof rec.part !== "string" ||
        typeof rec.titleYears !== "number" ||
        !Number.isFinite(rec.titleYears) ||
        typeof rec.salary !== "number" ||
        !Number.isFinite(rec.salary)
      );
    });

    const shouldImportSalary =
      window.localStorage.getItem(EMPLOYEE_SALARY_IMPORT_FLAG) !== "1";
    if (shouldImportSalary) {
      const applied = applySalaryByName(cleaned);
      cleaned = applied.items;
      window.localStorage.setItem(EMPLOYEE_SALARY_IMPORT_FLAG, "1");
      window.localStorage.setItem(
        EMPLOYEES_STORAGE_KEY,
        JSON.stringify(cleaned),
      );
      notifyEmployeesUpdated();
      return cleaned;
    }

    if (needsRewrite) {
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
