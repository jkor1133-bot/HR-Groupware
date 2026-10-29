import { ORG_TEAMS } from "@/data/org";
import { currentYearMonth, shiftYearMonth } from "@/lib/period";
import type { OrgTeam, TeamPeriodMetric } from "@/lib/types";

export type PeriodMode = "month" | "ytd";

/** YYYY-MM → 해당 월 1일 Date (집계 기준일) */
export function asOfFromYearMonth(ym: string): Date {
  const [y, m] = ym.split("-").map(Number);
  if (!y || !m) return new Date();
  return new Date(y, m - 1, 1);
}

export type PlanDiffRow = {
  team: OrgTeam;
  plan: number;
  actual: number;
  diff: number;
  rate: number | null; // 달성률 %
};

export type YoYRow = {
  team: OrgTeam;
  prev: number;
  curr: number;
  diff: number;
  rate: number | null; // 증감률 %
};

function monthsThrough(ym: string): string[] {
  const [y, m] = ym.split("-").map(Number);
  const list: string[] = [];
  for (let i = 1; i <= m; i++) {
    list.push(`${y}-${String(i).padStart(2, "0")}`);
  }
  return list;
}

function sumTeam(
  rows: TeamPeriodMetric[],
  team: OrgTeam,
  months: string[],
  key: "plan" | "actual",
) {
  return rows
    .filter((r) => r.team === team && months.includes(r.yearMonth))
    .reduce((a, r) => a + r[key], 0);
}

function ratePct(numer: number, denom: number): number | null {
  if (!denom) return null;
  return Math.round((numer / denom) * 1000) / 10;
}

export function buildPlanDiffRows(
  rows: TeamPeriodMetric[],
  mode: PeriodMode,
  asOf = new Date(),
): PlanDiffRow[] {
  const cur = currentYearMonth(asOf);
  const months = mode === "month" ? [cur] : monthsThrough(cur);
  return ORG_TEAMS.map((team) => {
    const plan = sumTeam(rows, team, months, "plan");
    const actual = sumTeam(rows, team, months, "actual");
    return {
      team,
      plan,
      actual,
      diff: actual - plan,
      rate: ratePct(actual, plan),
    };
  });
}

export function buildYoYRows(
  rows: TeamPeriodMetric[],
  mode: PeriodMode,
  asOf = new Date(),
): YoYRow[] {
  const cur = currentYearMonth(asOf);
  const prevYm = shiftYearMonth(cur, -12);
  const currMonths = mode === "month" ? [cur] : monthsThrough(cur);
  const prevMonths =
    mode === "month" ? [prevYm] : monthsThrough(prevYm);
  return ORG_TEAMS.map((team) => {
    const prev = sumTeam(rows, team, prevMonths, "actual");
    const curr = sumTeam(rows, team, currMonths, "actual");
    return {
      team,
      prev,
      curr,
      diff: curr - prev,
      rate: ratePct(curr - prev, prev),
    };
  });
}

/** 백만원 표시 (원 → 백만원, 소수 1자리) */
export function toMillion(won: number) {
  return Math.round((won / 1_000_000) * 10) / 10;
}

export function formatMillion(won: number) {
  return toMillion(won).toLocaleString("ko-KR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  });
}

export function formatHours(n: number) {
  return Math.round(n).toLocaleString("ko-KR");
}

export function formatRate(rate: number | null) {
  if (rate === null) return "—";
  return `${rate.toFixed(1)}%`;
}

export function periodLabel(mode: PeriodMode, asOf = new Date()) {
  const y = asOf.getFullYear();
  const m = asOf.getMonth() + 1;
  if (mode === "month") return `당월(${y}년 ${m}월)`;
  return `누계(${y}년 1~${m}월)`;
}

export type PeriodSlice = {
  plan: number;
  actual: number;
  diff: number;
  rate: number | null;
};

/** 전사 합계 — 당월 · 누계 */
export function buildCompanySlices(
  rows: TeamPeriodMetric[],
  asOf = new Date(),
): { month: PeriodSlice; ytd: PeriodSlice } {
  const sumMode = (mode: PeriodMode): PeriodSlice => {
    const list = buildPlanDiffRows(rows, mode, asOf);
    const plan = list.reduce((a, r) => a + r.plan, 0);
    const actual = list.reduce((a, r) => a + r.actual, 0);
    return {
      plan,
      actual,
      diff: actual - plan,
      rate: ratePct(actual, plan),
    };
  };
  return { month: sumMode("month"), ytd: sumMode("ytd") };
}
