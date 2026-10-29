import { seedContracts, seedPermits } from "@/data/hr-ops-seed";
import type { ContractRecord, PermitRecord } from "@/lib/types";

export const CONTRACTS_STORAGE_KEY = "hr-dashboard-contracts-v2";
export const PERMITS_STORAGE_KEY = "hr-dashboard-permits-v2";

const CONTRACTS_LEGACY_KEY = "hr-dashboard-contracts-v1";
const PERMITS_LEGACY_KEY = "hr-dashboard-permits-v1";

export function normalizeContract(
  c: Partial<ContractRecord> & { id: string },
): ContractRecord {
  const startDate = c.startDate ?? "";
  return {
    id: c.id,
    employeeName: c.employeeName ?? "",
    jobTrack: c.jobTrack ?? "일반직",
    contractType: c.contractType ?? "기간제",
    initialDate: c.initialDate || startDate,
    startDate,
    endDate: c.endDate ?? "",
    note: c.note ?? "",
  };
}

export function normalizePermit(
  p: Partial<PermitRecord> & { id: string },
): PermitRecord {
  const startDate = p.startDate ?? "";
  return {
    id: p.id,
    name: p.name ?? "",
    authority: p.authority ?? "",
    initialDate: p.initialDate || startDate,
    startDate,
    endDate: p.endDate ?? "",
    note: p.note ?? "",
  };
}

function readJsonArray(key: string): unknown[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function loadContracts(): ContractRecord[] {
  const v2 = readJsonArray(CONTRACTS_STORAGE_KEY);
  if (v2) {
    return v2
      .filter(
        (r): r is Partial<ContractRecord> & { id: string } =>
          !!r && typeof r === "object" && "id" in r && !!(r as { id: string }).id,
      )
      .map(normalizeContract);
  }
  const v1 = readJsonArray(CONTRACTS_LEGACY_KEY);
  if (v1) {
    const migrated = v1
      .filter(
        (r): r is Partial<ContractRecord> & { id: string } =>
          !!r && typeof r === "object" && "id" in r && !!(r as { id: string }).id,
      )
      .map(normalizeContract);
    window.localStorage.setItem(CONTRACTS_STORAGE_KEY, JSON.stringify(migrated));
    return migrated;
  }
  return seedContracts();
}

export function loadPermits(): PermitRecord[] {
  const v2 = readJsonArray(PERMITS_STORAGE_KEY);
  if (v2) {
    return v2
      .filter(
        (r): r is Partial<PermitRecord> & { id: string } =>
          !!r && typeof r === "object" && "id" in r && !!(r as { id: string }).id,
      )
      .map(normalizePermit);
  }
  const v1 = readJsonArray(PERMITS_LEGACY_KEY);
  if (v1) {
    const migrated = v1
      .filter(
        (r): r is Partial<PermitRecord> & { id: string } =>
          !!r && typeof r === "object" && "id" in r && !!(r as { id: string }).id,
      )
      .map(normalizePermit);
    window.localStorage.setItem(PERMITS_STORAGE_KEY, JSON.stringify(migrated));
    return migrated;
  }
  return seedPermits();
}
