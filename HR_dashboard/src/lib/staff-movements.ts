import type {
  EmployeeRosterRecord,
  Gender,
  HrEmployee,
  JobTrack,
  LeaveReason,
  OrgDivision,
  OrgTeam,
  StaffMovementRecord,
} from "@/lib/types";
import { JOB_TRACKS, LEAVE_REASONS } from "@/data/org";
import { EMPLOYEES_STORAGE_KEY } from "@/lib/employee-roster";

export const STAFF_MOVEMENTS_STORAGE_KEY = "hr-dashboard-staff-movements-v1";
export const STAFF_MOVEMENTS_EVENT = "hr-staff-movements-updated";

/** 사원명부 → 입사자 자동 등록 기준일 (이상) */
export const ROSTER_HIRE_SYNC_FROM = "2026-01-01";

export function notifyStaffMovementsUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(STAFF_MOVEMENTS_EVENT));
}

function normalizeDate(raw: string | undefined): string {
  const s = (raw ?? "").trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : "";
}

function hireKey(m: {
  rosterId?: string;
  empNo?: string;
  name?: string;
  eventDate?: string;
}): string {
  if (m.rosterId) return `id:${m.rosterId}`;
  const empNo = (m.empNo ?? "").trim();
  if (empNo) return `emp:${empNo}`;
  return `name:${(m.name ?? "").trim()}|${normalizeDate(m.eventDate)}`;
}

export function rosterEmployeeToHireMovement(
  emp: EmployeeRosterRecord,
): StaffMovementRecord | null {
  const eventDate =
    normalizeDate(emp.hireDate) || normalizeDate(emp.groupHireDate);
  if (!eventDate || eventDate < ROSTER_HIRE_SYNC_FROM) return null;
  if (!emp.name?.trim()) return null;

  return {
    id: `sm-roster-${emp.id}`,
    kind: "hire",
    name: emp.name.trim(),
    empNo: (emp.empNo ?? "").trim(),
    division: emp.division || "경영지원본부",
    department: emp.department || "인사총무팀",
    jobTrack: emp.jobTrack || "일반직",
    title: emp.title || "사원",
    gender: emp.gender || "남자",
    eventDate,
    hireDate: eventDate,
    note: "사원명부 동기화",
    rosterId: emp.id,
  };
}

/**
 * 사원명부에서 입사일(또는 그룹입사일)이 기준일 이상인 인원을
 * 입퇴사자 현황(입사)에 없는 경우만 추가.
 */
export function mergeRosterHiresIntoMovements(
  movements: StaffMovementRecord[],
  roster: EmployeeRosterRecord[],
): { items: StaffMovementRecord[]; added: number } {
  const existingHireKeys = new Set(
    movements
      .filter((m) => m.kind === "hire")
      .map((m) => hireKey(m)),
  );

  const toAdd: StaffMovementRecord[] = [];
  for (const emp of roster) {
    const hire = rosterEmployeeToHireMovement(emp);
    if (!hire) continue;
    const key = hireKey(hire);
    if (existingHireKeys.has(key)) continue;
    existingHireKeys.add(key);
    toAdd.push(hire);
  }

  if (toAdd.length === 0) {
    return { items: movements, added: 0 };
  }
  return { items: [...movements, ...toAdd], added: toAdd.length };
}

export function loadRosterFromStorage(): EmployeeRosterRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(EMPLOYEES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as EmployeeRosterRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function mapGender(raw: string): Gender {
  const g = raw.trim();
  if (g === "여" || g === "여자") return "여";
  return "남";
}

function mapJobTrack(raw: string): JobTrack {
  const t = raw.trim();
  if ((JOB_TRACKS as readonly string[]).includes(t)) return t as JobTrack;
  return (t || "일반직") as JobTrack;
}

function mapLeaveReason(raw: string | undefined): LeaveReason | undefined {
  if (!raw) return undefined;
  if ((LEAVE_REASONS as readonly string[]).includes(raw)) {
    return raw as LeaveReason;
  }
  return "기타";
}

/** 퇴사 기록 → 대시보드 HrEmployee */
export function leaveMovementsToHrEmployees(
  movements: StaffMovementRecord[],
): HrEmployee[] {
  return movements
    .filter((m) => m.kind === "leave" && m.name && m.eventDate)
    .map((m) => ({
      id: `leave-${m.id}`,
      name: m.name,
      gender: mapGender(m.gender),
      birthDate: "",
      hireDate: m.hireDate || "",
      leaveDate: m.eventDate,
      leaveReason: mapLeaveReason(
        typeof m.leaveReason === "string" ? m.leaveReason : undefined,
      ),
      status: "퇴사" as const,
      jobTrack: mapJobTrack(m.jobTrack),
      division: (m.division || "경영지원본부") as OrgDivision,
      team: (m.department || "인사총무팀") as OrgTeam,
      title: m.title || "사원",
      salary: 0,
    }));
}
