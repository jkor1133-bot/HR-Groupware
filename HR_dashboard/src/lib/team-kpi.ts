import { seedTeamAnnualKpis } from "@/data/team-kpi-seed";
import type {
  TeamAnnualKpi,
  TeamKpiScope,
  TeamKpiTraffic,
} from "@/lib/types";
import { TEAM_KPI_SCOPES } from "@/lib/types";

export const TEAM_KPI_STORAGE_KEY = "hr-dashboard-team-annual-kpi-v3";

function emptyStrings() {
  return Array.from({ length: 12 }, () => "");
}

function emptyTraffic(): TeamKpiTraffic[] {
  return Array.from({ length: 12 }, () => "" as TeamKpiTraffic);
}

export function normalizeKpiMonths(values: number[] | undefined) {
  return Array.from({ length: 12 }, (_, i) => {
    const n = Number(values?.[i] ?? 0);
    return Number.isFinite(n) ? Math.max(0, n) : 0;
  });
}

function normalizeScope(raw: string | undefined): TeamKpiScope {
  if (raw && (TEAM_KPI_SCOPES as readonly string[]).includes(raw)) {
    return raw as TeamKpiScope;
  }
  return "팀KPI";
}

/** 1~기준월 당월 진행을 모아 누계 텍스트 생성 */
export function buildYtdProgressFromMonths(
  monthWorkNotes: string[] | undefined,
  monthIndex: number,
) {
  const parts: string[] = [];
  for (let i = 0; i <= monthIndex; i++) {
    const note = String(monthWorkNotes?.[i] ?? "").trim();
    if (!note) continue;
    parts.push(`${i + 1}월: ${note}`);
  }
  return parts.join("\n");
}

export function sanitizeTeamKpi(raw: TeamAnnualKpi): TeamAnnualKpi {
  const monthWorkNotes = Array.from({ length: 12 }, (_, i) => {
    const fromNew = raw.monthWorkNotes?.[i];
    if (fromNew != null && String(fromNew).length) return String(fromNew);
    return String(raw.monthNotes?.[i] ?? "");
  });
  return {
    ...raw,
    year: Number(raw.year) || new Date().getFullYear(),
    scope: normalizeScope(raw.scope),
    weight: Number(raw.weight) || 0,
    parentKpi: raw.parentKpi ?? "",
    title: raw.title ?? "",
    evaluationNote: raw.evaluationNote ?? "",
    annualGoal: raw.annualGoal ?? "",
    indicatorType: raw.indicatorType === "정량" ? "정량" : "정성",
    monthValues: normalizeKpiMonths(raw.monthValues),
    monthWorkNotes,
    ytdProgressNotes: Array.from(
      { length: 12 },
      (_, i) => String(raw.ytdProgressNotes?.[i] ?? ""),
    ),
    monthTraffic: Array.from({ length: 12 }, (_, i) => {
      const t = raw.monthTraffic?.[i];
      return t === "G" || t === "Y" || t === "R" ? t : "";
    }),
  };
}

export function blankKpiRow(year: number, index = 1): TeamAnnualKpi {
  return sanitizeTeamKpi({
    id: `kpi-${year}-new-${Date.now()}-${index}`,
    year,
    scope: "팀KPI",
    parentKpi: "",
    title: "",
    evaluationNote: "",
    annualGoal: "",
    weight: 0,
    indicatorType: "정성",
    monthValues: Array.from({ length: 12 }, () => 0),
    monthWorkNotes: emptyStrings(),
    ytdProgressNotes: emptyStrings(),
    monthTraffic: emptyTraffic(),
  });
}

export function copyKpisToYear(
  source: TeamAnnualKpi[],
  fromYear: number,
  toYear: number,
): TeamAnnualKpi[] {
  const src = source.filter((k) => k.year === fromYear);
  const base = src.length ? src : seedTeamAnnualKpis(fromYear);
  return base.map((k, i) =>
    sanitizeTeamKpi({
      ...k,
      id: `kpi-${toYear}-${i + 1}-${Date.now().toString(36)}`,
      year: toYear,
      monthValues: Array.from({ length: 12 }, () => 0),
      monthWorkNotes: emptyStrings(),
      ytdProgressNotes: emptyStrings(),
      monthTraffic: emptyTraffic(),
    }),
  );
}

export function yearsFromKpis(items: TeamAnnualKpi[]) {
  const now = new Date().getFullYear();
  const years = new Set(items.map((k) => k.year));
  years.add(now);
  years.add(now + 1);
  years.add(now - 1);
  return [...years].sort((a, b) => b - a);
}

export function scopeSortIndex(scope: string) {
  const i = TEAM_KPI_SCOPES.indexOf(scope as TeamKpiScope);
  return i >= 0 ? i : TEAM_KPI_SCOPES.length;
}

export const TRAFFIC_META: Record<
  Exclude<TeamKpiTraffic, "">,
  { label: string; className: string }
> = {
  G: {
    label: "G · 계획 대비 100% 이상",
    className: "bg-emerald-500 text-white",
  },
  Y: {
    label: "Y · 계획 대비 90% 이상",
    className: "bg-amber-400 text-dh-deep",
  },
  R: {
    label: "R · 계획 대비 90% 미만",
    className: "bg-dh-red text-white",
  },
};
