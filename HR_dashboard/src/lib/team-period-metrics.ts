import {
  ORG_TEAMS,
  WORK_HOUR_DETAIL_KEYS,
  WORK_HOUR_DETAIL_LABELS,
  WORK_HOURS_TEAMS,
  partsForTeam,
} from "@/data/org";
import { currentYearMonth, shiftYearMonth } from "@/lib/period";
import type {
  OrgTeam,
  TeamPeriodMetric,
  WorkHourDetailKey,
  WorkHourDetails,
} from "@/lib/types";

export type PeriodMode = "month" | "ytd";

/** YYYY-MM → 해당 월 1일 Date (집계 기준일) */
export function asOfFromYearMonth(ym: string): Date {
  const [y, m] = ym.split("-").map(Number);
  if (!y || !m) return new Date();
  return new Date(y, m - 1, 1);
}

export type HourDetailRow = {
  key: WorkHourDetailKey;
  label: string;
  plan: number;
  actual: number;
  diff: number;
  rate: number | null;
};

export type PlanDiffPartRow = {
  part: string;
  plan: number;
  actual: number;
  diff: number;
  rate: number | null;
  details: HourDetailRow[];
};

export type PlanDiffRow = {
  team: OrgTeam;
  plan: number;
  actual: number;
  diff: number;
  rate: number | null;
  parts: PlanDiffPartRow[];
  /** 파트 없을 때 팀 직속 세부 */
  details: HourDetailRow[];
};

export type YoYHourDetailRow = {
  key: WorkHourDetailKey;
  label: string;
  prev: number;
  curr: number;
  diff: number;
  rate: number | null;
};

export type YoYPartRow = {
  part: string;
  prev: number;
  curr: number;
  diff: number;
  rate: number | null;
  details: YoYHourDetailRow[];
};

export type YoYRow = {
  team: OrgTeam;
  prev: number;
  curr: number;
  diff: number;
  rate: number | null;
  parts: YoYPartRow[];
  details: YoYHourDetailRow[];
};

function monthsThrough(ym: string): string[] {
  const [y, m] = ym.split("-").map(Number);
  const list: string[] = [];
  for (let i = 1; i <= m; i++) {
    list.push(`${y}-${String(i).padStart(2, "0")}`);
  }
  return list;
}

function normalizePart(part: string | undefined) {
  return (part ?? "").trim();
}

export function emptyWorkHourDetails(): WorkHourDetails {
  return {
    overtime: { plan: 0, actual: 0 },
    night: { plan: 0, actual: 0 },
    holiday: { plan: 0, actual: 0 },
    holidayOt: { plan: 0, actual: 0 },
  };
}

export function sumWorkHourDetails(d?: WorkHourDetails | null): {
  plan: number;
  actual: number;
} {
  const base = d ?? emptyWorkHourDetails();
  let plan = 0;
  let actual = 0;
  for (const key of WORK_HOUR_DETAIL_KEYS) {
    plan += Number(base[key]?.plan) || 0;
    actual += Number(base[key]?.actual) || 0;
  }
  return { plan, actual };
}

/** plan/actual을 세부 합계로 맞춤 */
export function withHourTotals(row: TeamPeriodMetric): TeamPeriodMetric {
  if (!row.hourDetails) return row;
  const { plan, actual } = sumWorkHourDetails(row.hourDetails);
  return { ...row, plan, actual };
}

function rowKey(r: {
  yearMonth: string;
  team: string;
  part?: string;
}) {
  return `${r.yearMonth}|${r.team}|${(r.part ?? "").trim()}`;
}

function cloneHourDetails(src?: WorkHourDetails | null): WorkHourDetails {
  const d = emptyWorkHourDetails();
  if (!src) return d;
  for (const key of WORK_HOUR_DETAIL_KEYS) {
    d[key] = {
      plan: Number(src[key]?.plan) || 0,
      actual: Number(src[key]?.actual) || 0,
    };
  }
  return d;
}

/** 같은 연월·팀·파트 중복 행 합산 (전파 전 정리) */
function consolidateMonthRows(
  items: TeamPeriodMetric[],
  yearMonth: string,
): TeamPeriodMetric[] {
  const others = items.filter((r) => r.yearMonth !== yearMonth);
  const monthRows = items.filter((r) => r.yearMonth === yearMonth);
  const map = new Map<string, TeamPeriodMetric>();
  for (const r of monthRows) {
    const key = `${r.team}|${(r.part ?? "").trim()}`;
    const prev = map.get(key);
    if (!prev) {
      map.set(key, withHourTotals({ ...r }));
      continue;
    }
    if (r.hourDetails || prev.hourDetails) {
      const hourDetails = emptyWorkHourDetails();
      const a = prev.hourDetails ?? emptyWorkHourDetails();
      const b = r.hourDetails ?? emptyWorkHourDetails();
      for (const k of WORK_HOUR_DETAIL_KEYS) {
        hourDetails[k] = {
          plan: (Number(a[k]?.plan) || 0) + (Number(b[k]?.plan) || 0),
          actual: (Number(a[k]?.actual) || 0) + (Number(b[k]?.actual) || 0),
        };
      }
      map.set(
        key,
        withHourTotals({
          ...prev,
          hourDetails,
        }),
      );
    } else {
      map.set(key, {
        ...prev,
        plan: (Number(prev.plan) || 0) + (Number(r.plan) || 0),
        actual: (Number(prev.actual) || 0) + (Number(r.actual) || 0),
      });
    }
  }
  return [...others, ...map.values()];
}

/**
 * 소스 월의 계획을 지정한 월들에 복사. 대상 월 실적은 유지(없으면 0).
 * 소스 월 중복 행은 합산 후 반영합니다.
 */
export function copyPlanToMonths(
  items: TeamPeriodMetric[],
  sourceYearMonth: string,
  targetYearMonths: string[],
): { items: TeamPeriodMetric[]; changed: number } {
  const targets = [
    ...new Set(
      targetYearMonths.filter(
        (ym) => /^\d{4}-\d{2}$/.test(ym) && ym !== sourceYearMonth,
      ),
    ),
  ];
  if (!targets.length) return { items, changed: 0 };

  const consolidated = consolidateMonthRows(items, sourceYearMonth);
  const sources = consolidated.filter((r) => r.yearMonth === sourceYearMonth);
  if (!sources.length) return { items, changed: 0 };

  // 대상 월 기존 행 제거 후 재생성
  const next = consolidated.filter((r) => !targets.includes(r.yearMonth));
  let changed = 0;

  for (const ym of targets) {
    for (const src of sources) {
      const hourDetails = src.hourDetails
        ? (() => {
            const d = emptyWorkHourDetails();
            const s = src.hourDetails!;
            for (const key of WORK_HOUR_DETAIL_KEYS) {
              d[key] = {
                plan: Number(s[key]?.plan) || 0,
                actual: 0,
              };
            }
            return d;
          })()
        : undefined;
      next.push(
        withHourTotals({
          id: `tpm-copy-${ym}-${src.team}-${src.part || "all"}`,
          yearMonth: ym,
          team: src.team,
          part: src.part,
          plan: src.hourDetails
            ? sumWorkHourDetails(hourDetails).plan
            : src.plan,
          actual: 0,
          hourDetails,
        }),
      );
      changed += 1;
    }
  }

  // 소스 월도 합산본으로 정리
  const withoutSource = next.filter((r) => r.yearMonth !== sourceYearMonth);
  return {
    items: [...withoutSource, ...sources.map((s) => withHourTotals({ ...s }))],
    changed: changed + 1,
  };
}

/**
 * 특정 월(예: 2027-01) 근무시간을 같은 해 나머지 월(2~12)에 동일 값으로 복제.
 * 소스 월 중복 행은 먼저 합산한 뒤 전파합니다.
 */
export function propagatePlanAcrossRestOfYear(
  items: TeamPeriodMetric[],
  sourceYearMonth: string,
): { items: TeamPeriodMetric[]; changed: number } {
  const match = /^(\d{4})-(\d{2})$/.exec(sourceYearMonth);
  if (!match) return { items, changed: 0 };
  const year = match[1];
  const sourceMonth = Number(match[2]);
  if (!year || sourceMonth < 1 || sourceMonth > 12) {
    return { items, changed: 0 };
  }

  const consolidated = consolidateMonthRows(items, sourceYearMonth);
  const sources = consolidated.filter((r) => r.yearMonth === sourceYearMonth);
  if (!sources.length) return { items, changed: 0 };

  // 소스 월 외 해당 연도 행 제거 후 재생성(항상 1월과 동일하게)
  const next = consolidated.filter((r) => {
    if (!r.yearMonth.startsWith(`${year}-`)) return true;
    return r.yearMonth === sourceYearMonth;
  });
  const indexByKey = new Map(next.map((r, i) => [rowKey(r), i]));
  let changed = sources.length > 0 ? 1 : 0;

  // 소스 월 합산본으로 교체
  for (const src of sources) {
    const key = rowKey(src);
    const idx = indexByKey.get(key);
    if (idx != null) {
      next[idx] = withHourTotals({ ...src });
    } else {
      indexByKey.set(key, next.length);
      next.push(withHourTotals({ ...src }));
    }
  }

  for (let m = 1; m <= 12; m++) {
    if (m === sourceMonth) continue;
    const ym = `${year}-${String(m).padStart(2, "0")}`;
    for (const src of sources) {
      const created = withHourTotals({
        id: `tpm-fill-${ym}-${src.team}-${src.part || "all"}`,
        yearMonth: ym,
        team: src.team,
        part: src.part,
        plan: src.plan,
        actual: src.actual,
        hourDetails: src.hourDetails
          ? cloneHourDetails(src.hourDetails)
          : undefined,
      });
      next.push(created);
      changed += 1;
    }
  }

  return { items: next, changed };
}

function metricValue(
  r: TeamPeriodMetric,
  key: "plan" | "actual",
  detail?: WorkHourDetailKey,
) {
  if (detail) {
    return Number(r.hourDetails?.[detail]?.[key]) || 0;
  }
  if (r.hourDetails) {
    return sumWorkHourDetails(r.hourDetails)[key];
  }
  return Number(r[key]) || 0;
}

function sumFiltered(
  rows: TeamPeriodMetric[],
  months: string[],
  key: "plan" | "actual",
  team: OrgTeam,
  part?: string,
  detail?: WorkHourDetailKey,
) {
  return rows
    .filter((r) => {
      if (r.team !== team || !months.includes(r.yearMonth)) return false;
      if (part === undefined) return true;
      return normalizePart(r.part) === part;
    })
    .reduce((a, r) => a + metricValue(r, key, detail), 0);
}

function ratePct(numer: number, denom: number): number | null {
  if (!denom) return null;
  return Math.round((numer / denom) * 1000) / 10;
}

function teamsForScope(teams?: readonly OrgTeam[]): OrgTeam[] {
  return teams?.length ? [...teams] : [...ORG_TEAMS];
}

function partKeysForTeam(team: OrgTeam, rows: TeamPeriodMetric[]): string[] {
  const defined = partsForTeam(team);
  if (defined.length) return defined;
  const extras = [
    ...new Set(
      rows
        .filter((r) => r.team === team)
        .map((r) => normalizePart(r.part))
        .filter(Boolean),
    ),
  ];
  return extras;
}

function buildHourDetails(
  rows: TeamPeriodMetric[],
  months: string[],
  team: OrgTeam,
  part: string | undefined,
  includeDetails: boolean,
): HourDetailRow[] {
  if (!includeDetails) return [];
  return WORK_HOUR_DETAIL_KEYS.map((key) => {
    const plan = sumFiltered(rows, months, "plan", team, part, key);
    const actual = sumFiltered(rows, months, "actual", team, part, key);
    return {
      key,
      label: WORK_HOUR_DETAIL_LABELS[key],
      plan,
      actual,
      diff: actual - plan,
      rate: ratePct(actual, plan),
    };
  });
}

function buildYoYHourDetails(
  rows: TeamPeriodMetric[],
  prevMonths: string[],
  currMonths: string[],
  team: OrgTeam,
  part: string | undefined,
  includeDetails: boolean,
): YoYHourDetailRow[] {
  if (!includeDetails) return [];
  return WORK_HOUR_DETAIL_KEYS.map((key) => {
    const prev = sumFiltered(rows, prevMonths, "actual", team, part, key);
    const curr = sumFiltered(rows, currMonths, "actual", team, part, key);
    return {
      key,
      label: WORK_HOUR_DETAIL_LABELS[key],
      prev,
      curr,
      diff: curr - prev,
      rate: ratePct(curr - prev, prev),
    };
  });
}

export function buildPlanDiffRows(
  rows: TeamPeriodMetric[],
  mode: PeriodMode,
  asOf = new Date(),
  teams?: readonly OrgTeam[],
  opts?: { hourDetails?: boolean },
): PlanDiffRow[] {
  const includeDetails = Boolean(opts?.hourDetails);
  const cur = currentYearMonth(asOf);
  const months = mode === "month" ? [cur] : monthsThrough(cur);
  return teamsForScope(teams).map((team) => {
    const plan = sumFiltered(rows, months, "plan", team);
    const actual = sumFiltered(rows, months, "actual", team);
    const partKeys = partKeysForTeam(team, rows);
    const parts: PlanDiffPartRow[] = partKeys.map((part) => {
      const p = sumFiltered(rows, months, "plan", team, part);
      const a = sumFiltered(rows, months, "actual", team, part);
      return {
        part,
        plan: p,
        actual: a,
        diff: a - p,
        rate: ratePct(a, p),
        details: buildHourDetails(rows, months, team, part, includeDetails),
      };
    });
    return {
      team,
      plan,
      actual,
      diff: actual - plan,
      rate: ratePct(actual, plan),
      parts,
      details:
        partKeys.length === 0
          ? buildHourDetails(rows, months, team, undefined, includeDetails)
          : [],
    };
  });
}

export function buildYoYRows(
  rows: TeamPeriodMetric[],
  mode: PeriodMode,
  asOf = new Date(),
  teams?: readonly OrgTeam[],
  opts?: { hourDetails?: boolean },
): YoYRow[] {
  const includeDetails = Boolean(opts?.hourDetails);
  const cur = currentYearMonth(asOf);
  const prevYm = shiftYearMonth(cur, -12);
  const currMonths = mode === "month" ? [cur] : monthsThrough(cur);
  const prevMonths =
    mode === "month" ? [prevYm] : monthsThrough(prevYm);
  return teamsForScope(teams).map((team) => {
    const prev = sumFiltered(rows, prevMonths, "actual", team);
    const curr = sumFiltered(rows, currMonths, "actual", team);
    const partKeys = partKeysForTeam(team, rows);
    const parts: YoYPartRow[] = partKeys.map((part) => {
      const p = sumFiltered(rows, prevMonths, "actual", team, part);
      const c = sumFiltered(rows, currMonths, "actual", team, part);
      return {
        part,
        prev: p,
        curr: c,
        diff: c - p,
        rate: ratePct(c - p, p),
        details: buildYoYHourDetails(
          rows,
          prevMonths,
          currMonths,
          team,
          part,
          includeDetails,
        ),
      };
    });
    return {
      team,
      prev,
      curr,
      diff: curr - prev,
      rate: ratePct(curr - prev, prev),
      parts,
      details:
        partKeys.length === 0
          ? buildYoYHourDetails(
              rows,
              prevMonths,
              currMonths,
              team,
              undefined,
              includeDetails,
            )
          : [],
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
  teams?: readonly OrgTeam[],
): { month: PeriodSlice; ytd: PeriodSlice } {
  const sumMode = (mode: PeriodMode): PeriodSlice => {
    const list = buildPlanDiffRows(rows, mode, asOf, teams);
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

export type TrendPoint = {
  label: string;
  plan: number;
  actual: number;
};

function scopedRows(
  rows: TeamPeriodMetric[],
  teams?: readonly OrgTeam[],
): TeamPeriodMetric[] {
  if (!teams?.length) return rows;
  const set = new Set(teams);
  return rows.filter((r) => set.has(r.team));
}

/** 선택 연도의 월별 전사 계획·실적 */
export function buildMonthlyTrend(
  rows: TeamPeriodMetric[],
  year: number,
  teams?: readonly OrgTeam[],
): TrendPoint[] {
  const scoped = scopedRows(rows, teams);
  return Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    const ym = `${year}-${String(m).padStart(2, "0")}`;
    let plan = 0;
    let actual = 0;
    for (const r of scoped) {
      if (r.yearMonth !== ym) continue;
      plan += metricValue(r, "plan");
      actual += metricValue(r, "actual");
    }
    return { label: `${m}월`, plan, actual };
  });
}

/** 연도별 전사 계획·실적 합계 */
export function buildYearlyTrend(
  rows: TeamPeriodMetric[],
  teams?: readonly OrgTeam[],
  focusYear?: number,
): TrendPoint[] {
  const scoped = scopedRows(rows, teams);
  const years = new Set<number>();
  for (const r of scoped) {
    const y = Number(r.yearMonth.slice(0, 4));
    if (Number.isFinite(y)) years.add(y);
  }
  if (focusYear) {
    years.add(focusYear);
    years.add(focusYear - 1);
  }
  const sorted = [...years].sort((a, b) => a - b);
  if (!sorted.length && focusYear) {
    return [
      { label: `${focusYear - 1}년`, plan: 0, actual: 0 },
      { label: `${focusYear}년`, plan: 0, actual: 0 },
    ];
  }
  return sorted.map((year) => {
    let plan = 0;
    let actual = 0;
    for (const r of scoped) {
      if (!r.yearMonth.startsWith(String(year))) continue;
      plan += metricValue(r, "plan");
      actual += metricValue(r, "actual");
    }
    return { label: `${year}년`, plan, actual };
  });
}

export { WORK_HOURS_TEAMS, WORK_HOUR_DETAIL_KEYS, WORK_HOUR_DETAIL_LABELS };
