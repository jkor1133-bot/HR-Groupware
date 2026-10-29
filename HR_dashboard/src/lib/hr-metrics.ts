import { ALL_TITLE_KEYS, JOB_TRACKS, ORG_TEAMS } from "@/data/org";
import type {
  HrEmployee,
  JobTrack,
  OrgDivision,
  OrgTeam,
} from "@/lib/types";

export type HrFilter = {
  jobTrack: JobTrack | "전체";
  division: OrgDivision | "전체";
  team: OrgTeam | "전체";
};

export function emptyHrFilter(): HrFilter {
  return {
    jobTrack: "전체",
    division: "전체",
    team: "전체",
  };
}

export function matchOrgForMetrics(e: HrEmployee, f: HrFilter) {
  if (f.jobTrack !== "전체" && e.jobTrack !== f.jobTrack) return false;
  if (f.division !== "전체" && e.division !== f.division) return false;
  if (f.team !== "전체" && e.team !== f.team) return false;
  return true;
}

function matchOrg(e: HrEmployee, f: HrFilter) {
  return matchOrgForMetrics(e, f);
}

export function filterActiveEmployees(list: HrEmployee[], f: HrFilter) {
  return list.filter((e) => e.status === "재직" && matchOrg(e, f));
}

function ageYears(birthDate: string, asOf = new Date()) {
  const b = new Date(`${birthDate}T00:00:00`);
  let age = asOf.getFullYear() - b.getFullYear();
  const m = asOf.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && asOf.getDate() < b.getDate())) age -= 1;
  return Math.max(0, age);
}

function tenureYears(hireDate: string, end = new Date()) {
  const h = new Date(`${hireDate}T00:00:00`);
  return Math.max(0, (end.getTime() - h.getTime()) / (365.25 * 24 * 3600 * 1000));
}

function avg(nums: number[]) {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function median(nums: number[]) {
  if (!nums.length) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function countBy(items: string[]) {
  const map: Record<string, number> = {};
  for (const x of items) map[x] = (map[x] ?? 0) + 1;
  return Object.entries(map)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

export type HrMetrics = {
  headcount: number;
  leaversYtd: number;
  hiresYtd: number;
  turnoverRate: number;
  avgAge: number;
  avgTenure: number;
  avgSalary: number;
  medianSalary: number;
  gender: { male: number; female: number; malePct: number; femalePct: number };
  byTeam: { label: string; value: number }[];
  byDivision: { label: string; value: number }[];
  byJobTrack: { label: string; value: number }[];
  byAgeBand: { label: string; value: number }[];
  byTenureBand: { label: string; value: number }[];
  avgSalaryByTrack: { label: string; value: number }[];
  /** 차트용 퇴사 분석 */
  leaversByGender: { label: string; value: number }[];
  leaversByTeam: { label: string; value: number }[];
  leaversByJobTrack: { label: string; value: number }[];
  /** 직군·직위 (예: 일반직·대리) */
  leaversByTitle: { label: string; value: number }[];
  leaversByAgeBand: { label: string; value: number }[];
  leaversBySalarySlab: { label: string; value: number }[];
  leaversByTenureYear: { label: string; value: number }[];
  salarySlabActive: { label: string; value: number }[];
};

export function computeHrMetrics(
  all: HrEmployee[],
  filter: HrFilter,
  asOf = new Date(),
): HrMetrics {
  const year = asOf.getFullYear();
  const active = filterActiveEmployees(all, filter);

  const leaversYtd = all.filter(
    (e) =>
      e.status === "퇴사" &&
      Boolean(e.leaveDate?.startsWith(String(year))) &&
      matchOrg(e, filter),
  ).length;

  const hiresYtd = all.filter(
    (e) => e.hireDate.startsWith(String(year)) && matchOrg(e, filter),
  ).length;

  const denom = Math.max(1, active.length + leaversYtd);
  const turnoverRate = Math.round((leaversYtd / denom) * 1000) / 10;

  const salaries = active.map((e) => e.salary);
  const male = active.filter((e) => e.gender === "남").length;
  const female = active.filter((e) => e.gender === "여").length;
  const totalG = male + female || 1;

  const ageBands = ["~29", "30~39", "40~49", "50~"] as const;
  const tenureBands = ["~3년", "3~7년", "7~15년", "15년~"] as const;
  const ageBandOf = (age: number) => {
    if (age < 30) return "~29";
    if (age < 40) return "30~39";
    if (age < 50) return "40~49";
    return "50~";
  };
  const tenureBandOf = (t: number) => {
    if (t < 3) return "~3년";
    if (t < 7) return "3~7년";
    if (t < 15) return "7~15년";
    return "15년~";
  };

  const byAgeMap: Record<string, number> = Object.fromEntries(
    ageBands.map((b) => [b, 0]),
  );
  const byTenureMap: Record<string, number> = Object.fromEntries(
    tenureBands.map((b) => [b, 0]),
  );
  for (const e of active) {
    byAgeMap[ageBandOf(ageYears(e.birthDate, asOf))] += 1;
    byTenureMap[tenureBandOf(tenureYears(e.hireDate, asOf))] += 1;
  }

  const salaryByTrack: Record<string, number[]> = {};
  for (const e of active) {
    (salaryByTrack[e.jobTrack] ??= []).push(e.salary);
  }

  const salarySlabs = ["~4천만", "4~6천만", "6~8천만", "8천만~"] as const;
  const salarySlabOf = (salary: number) => {
    if (salary < 40_000_000) return "~4천만";
    if (salary < 60_000_000) return "4~6천만";
    if (salary < 80_000_000) return "6~8천만";
    return "8천만~";
  };

  const leavers = all.filter(
    (e) =>
      e.status === "퇴사" &&
      Boolean(e.leaveDate?.startsWith(String(year))) &&
      matchOrg(e, filter),
  );

  const leaverAgeMap: Record<string, number> = Object.fromEntries(
    ageBands.map((b) => [b, 0]),
  );
  const leaverSalaryMap: Record<string, number> = Object.fromEntries(
    salarySlabs.map((b) => [b, 0]),
  );
  const activeSalaryMap: Record<string, number> = Object.fromEntries(
    salarySlabs.map((b) => [b, 0]),
  );
  const tenureYearMap: Record<string, number> = {};
  for (let i = 0; i <= 15; i++) tenureYearMap[String(i)] = 0;

  for (const e of leavers) {
    const end = e.leaveDate
      ? new Date(`${e.leaveDate}T00:00:00`)
      : asOf;
    leaverAgeMap[ageBandOf(ageYears(e.birthDate, end))] += 1;
    leaverSalaryMap[salarySlabOf(e.salary)] += 1;
    const ty = Math.min(15, Math.floor(tenureYears(e.hireDate, end)));
    tenureYearMap[String(ty)] += 1;
  }
  for (const e of active) {
    activeSalaryMap[salarySlabOf(e.salary)] += 1;
  }

  return {
    headcount: active.length,
    leaversYtd,
    hiresYtd,
    turnoverRate,
    avgAge: avg(active.map((e) => ageYears(e.birthDate, asOf))),
    avgTenure: avg(active.map((e) => tenureYears(e.hireDate, asOf))),
    avgSalary: avg(salaries),
    medianSalary: median(salaries),
    gender: {
      male,
      female,
      malePct: Math.round((male / totalG) * 100),
      femalePct: Math.round((female / totalG) * 100),
    },
    byTeam: countBy(active.map((e) => e.team)),
    byDivision: countBy(active.map((e) => e.division)),
    byJobTrack: countBy(active.map((e) => e.jobTrack)),
    byAgeBand: ageBands.map((label) => ({
      label,
      value: byAgeMap[label] ?? 0,
    })),
    byTenureBand: tenureBands.map((label) => ({
      label,
      value: byTenureMap[label] ?? 0,
    })),
    avgSalaryByTrack: Object.entries(salaryByTrack)
      .map(([label, vals]) => ({ label, value: Math.round(avg(vals)) }))
      .sort((a, b) => b.value - a.value),
    leaversByGender: [
      {
        label: "남",
        value: leavers.filter((e) => e.gender === "남").length,
      },
      {
        label: "여",
        value: leavers.filter((e) => e.gender === "여").length,
      },
    ],
    leaversByTeam: ORG_TEAMS.map((label) => ({
      label,
      value: leavers.filter((e) => e.team === label).length,
    })).filter((d) => d.value > 0),
    leaversByJobTrack: JOB_TRACKS.map((label) => ({
      label,
      value: leavers.filter((e) => e.jobTrack === label).length,
    })),
    leaversByTitle: ALL_TITLE_KEYS.map(({ track, title, label }) => ({
      label,
      value: leavers.filter((e) => e.jobTrack === track && e.title === title)
        .length,
    })).filter((d) => d.value > 0),
    leaversByAgeBand: ageBands.map((label) => ({
      label,
      value: leaverAgeMap[label] ?? 0,
    })),
    leaversBySalarySlab: salarySlabs.map((label) => ({
      label,
      value: leaverSalaryMap[label] ?? 0,
    })),
    leaversByTenureYear: Object.keys(tenureYearMap)
      .map((label) => ({ label: `${label}년`, value: tenureYearMap[label] }))
      .filter((d) => d.value > 0 || Number(d.label.replace("년", "")) <= 10),
    salarySlabActive: salarySlabs.map((label) => ({
      label,
      value: activeSalaryMap[label] ?? 0,
    })),
  };
}

export function formatManwon(n: number) {
  if (!n) return "—";
  return `${Math.round(n / 10000).toLocaleString("ko-KR")}만원`;
}

export function formatYears(n: number) {
  return `${n.toFixed(1)}년`;
}
