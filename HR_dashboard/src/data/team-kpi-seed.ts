import type { TeamAnnualKpi } from "@/lib/types";

function emptyMonths() {
  return Array.from({ length: 12 }, () => 0);
}
function emptyNotes() {
  return Array.from({ length: 12 }, () => "");
}
function emptyTraffic() {
  return Array.from({ length: 12 }, () => "" as const);
}

function blankShell(
  year: number,
  index: number,
  scope: TeamAnnualKpi["scope"],
): TeamAnnualKpi {
  return {
    id: `kpi-${year}-${index}`,
    year,
    scope,
    parentKpi: "",
    title: "",
    evaluationNote: "",
    annualGoal: "",
    weight: 0,
    indicatorType: "정성",
    monthValues: emptyMonths(),
    monthWorkNotes: emptyNotes(),
    ytdProgressNotes: emptyNotes(),
    monthTraffic: [...emptyTraffic()],
  };
}

/**
 * 전략과제 KPI 빈 양식 (재무지표·내용 없음).
 * 구분 행만 두고 KPI·목표·당월·누계는 비움.
 */
export function seedTeamAnnualKpis(year = 2027): TeamAnnualKpi[] {
  return [
    blankShell(year, 1, "전사KPI"),
    blankShell(year, 2, "본부KPI"),
    blankShell(year, 3, "팀KPI"),
    blankShell(year, 4, "개인KPI"),
  ];
}
