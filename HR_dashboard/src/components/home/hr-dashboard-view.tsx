"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Download, Filter, RotateCcw, Users } from "lucide-react";
import { HrAttritionDonutPanel } from "@/components/home/hr-attrition-donut";
import { HrCompanyMetricCard } from "@/components/home/hr-company-metric-card";
import { HrOpsTrendChart } from "@/components/home/hr-ops-trend-chart";
import { HrPeriodCompareBlock } from "@/components/home/hr-period-compare";
import { TeamPeriodMetricsEditor } from "@/components/home/team-period-metrics-editor";
import { Button } from "@/components/ui/button";
import { TEAMS_BY_DIVISION, WORK_HOURS_TEAMS } from "@/data/org";
import {
  seedTeamHoursMetrics,
  seedTeamLaborMetrics,
} from "@/data/hr-ops-seed";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useEmployees } from "@/hooks/use-employees";
import { useLocalList } from "@/hooks/use-local-list";
import { useHomeLayout } from "@/hooks/use-home-layout";
import { useStaffMovements } from "@/hooks/use-staff-movements";
import { downloadRowsAsExcel } from "@/lib/excel";
import {
  computeHrMetrics,
  emptyHrFilter,
  formatManwon,
  formatYears,
  type HrFilter,
} from "@/lib/hr-metrics";
import { currentYearMonth } from "@/lib/period";
import {
  HR_FILTER_TEAM_ORDER,
  rosterFilterOptions,
  rosterToHrEmployees,
  sortByPreferredOrder,
} from "@/lib/roster-to-hr";
import { leaveMovementsToHrEmployees } from "@/lib/staff-movements";
import {
  asOfFromYearMonth,
  buildCompanySlices,
  copyPlanToMonths,
  propagatePlanAcrossRestOfYear,
} from "@/lib/team-period-metrics";
import type {
  HomeWidgetConfig,
  HomeWidgetId,
  OrgDivision,
  OrgTeam,
} from "@/lib/types";
import { cn } from "@/lib/utils";

function widgetClass(size: HomeWidgetConfig["size"]) {
  return size === "full" ? "@lg/app:col-span-2" : "";
}

function KpiCard({
  label,
  value,
  hint,
  note,
}: {
  label: string;
  value: string;
  hint?: string;
  /** 지표 하단 작은 주석 */
  note?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-heading text-2xl font-semibold tabular-nums text-dh-deep dark:text-dh-light">
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>
      ) : null}
      {note ? (
        <p className="mt-1 text-[10px] leading-snug text-muted-foreground/80">
          {note}
        </p>
      ) : null}
    </div>
  );
}

export function HrDashboardView() {
  const roster = useEmployees();
  const staffMovements = useStaffMovements();
  const { isAdmin } = useCurrentUser();
  const canViewSalary = isAdmin;
  const labor = useLocalList(
    "hr-dashboard-team-labor-v3",
    seedTeamLaborMetrics,
  );
  const workHours = useLocalList(
    "hr-dashboard-team-hours-v4",
    seedTeamHoursMetrics,
  );
  const { hydrated: layoutHydrated, sortedHr } = useHomeLayout();
  const [filter, setFilter] = useState<HrFilter>(emptyHrFilter());
  const [metricMonth, setMetricMonth] = useState(() => currentYearMonth());
  const [showMetricEditors, setShowMetricEditors] = useState(false);

  /** 근무시간 월 복제 마이그레이션 (순차 1회) */
  useEffect(() => {
    if (!workHours.hydrated) return;
    let items = workHours.items;
    let dirty = false;

    const flag2027 = "hr-dashboard-hours-propagate-2027-01-full-v3";
    const flag2026Nov = "hr-dashboard-hours-copy-2026-11-to-09-10-v1";
    const flag2026Jan = "hr-dashboard-hours-copy-2026-01-to-02-08-v1";

    try {
      if (
        window.localStorage.getItem(flag2027) !== "1" &&
        items.some((r) => r.yearMonth === "2027-01")
      ) {
        window.localStorage.removeItem(
          "hr-dashboard-hours-propagate-2027-01-plan-v1",
        );
        window.localStorage.removeItem(
          "hr-dashboard-hours-propagate-2027-01-plan-v2",
        );
        const res = propagatePlanAcrossRestOfYear(items, "2027-01");
        items = res.items;
        if (res.changed > 0) dirty = true;
        window.localStorage.setItem(flag2027, "1");
      }

      if (
        window.localStorage.getItem(flag2026Nov) !== "1" &&
        items.some((r) => r.yearMonth === "2026-11")
      ) {
        const res = copyPlanToMonths(items, "2026-11", [
          "2026-09",
          "2026-10",
        ]);
        items = res.items;
        if (res.changed > 0) dirty = true;
        window.localStorage.setItem(flag2026Nov, "1");
      }

      if (
        window.localStorage.getItem(flag2026Jan) !== "1" &&
        items.some((r) => r.yearMonth === "2026-01")
      ) {
        const res = copyPlanToMonths(items, "2026-01", [
          "2026-02",
          "2026-03",
          "2026-04",
          "2026-05",
          "2026-06",
          "2026-07",
          "2026-08",
        ]);
        items = res.items;
        if (res.changed > 0) dirty = true;
        window.localStorage.setItem(flag2026Jan, "1");
      }
    } catch {
      /* ignore */
    }

    if (dirty) {
      workHours.replaceAll(items);
    }
  }, [workHours]);

  const metricAsOf = useMemo(
    () => asOfFromYearMonth(metricMonth),
    [metricMonth],
  );

  const hrEmployees = useMemo(() => {
    const active = rosterToHrEmployees(roster.items);
    const leavers = leaveMovementsToHrEmployees(staffMovements.items);
    return [...active, ...leavers];
  }, [roster.items, staffMovements.items]);

  const hiresThisYear = useMemo(() => {
    const year = String(new Date().getFullYear());
    return staffMovements.items.filter((m) => {
      if (m.kind !== "hire" || !m.eventDate.startsWith(year)) return false;
      if (filter.jobTrack !== "전체" && m.jobTrack !== filter.jobTrack) {
        return false;
      }
      if (filter.division !== "전체" && m.division !== filter.division) {
        return false;
      }
      if (filter.team !== "전체" && m.department !== filter.team) {
        return false;
      }
      return true;
    }).length;
  }, [staffMovements.items, filter]);

  const filterOpts = useMemo(
    () => rosterFilterOptions(roster.items),
    [roster.items],
  );

  const metrics = useMemo(
    () => computeHrMetrics(hrEmployees, filter),
    [hrEmployees, filter],
  );

  const laborCompany = useMemo(
    () => buildCompanySlices(labor.items, metricAsOf),
    [labor.items, metricAsOf],
  );
  const hoursCompany = useMemo(
    () => buildCompanySlices(workHours.items, metricAsOf, WORK_HOURS_TEAMS),
    [workHours.items, metricAsOf],
  );

  const teamOptions = useMemo(() => {
    if (filter.division === "전체") return filterOpts.teams;
    const byDiv = TEAMS_BY_DIVISION[filter.division as OrgDivision] as
      | OrgTeam[]
      | undefined;
    if (byDiv?.length) {
      const set = new Set<string>(byDiv);
      for (const t of filterOpts.teams) {
        if (
          roster.items.some(
            (r) => r.department === t && r.division === filter.division,
          )
        ) {
          set.add(t);
        }
      }
      return sortByPreferredOrder(set, HR_FILTER_TEAM_ORDER);
    }
    return sortByPreferredOrder(
      filterOpts.teams.filter((t) =>
        roster.items.some(
          (r) => r.department === t && r.division === filter.division,
        ),
      ),
      HR_FILTER_TEAM_ORDER,
    );
  }, [filter.division, filterOpts.teams, roster.items]);

  function exportRosterSnapshot() {
    downloadRowsAsExcel(
      roster.items.map((e) => {
        const row: Record<string, string | number> = {
          상위부서: e.division,
          부서: e.department,
          파트: e.part,
          사번: e.empNo,
          성명: e.name,
          직위: e.title,
          직책: e.jobRole,
          직군: e.jobTrack,
          성별: e.gender,
          직위년차: e.titleYears,
          그룹입사일자: e.groupHireDate,
          입사일자: e.hireDate,
        };
        if (canViewSalary) {
          row["연봉(전년)"] = e.salary || "";
          row["계약연봉(당년)"] = e.contractSalary || "";
        }
        return row;
      }),
      "사원명부_대시보드반영.xlsx",
      "사원명부",
    );
  }

  function renderWidget(id: HomeWidgetId) {
    switch (id) {
      case "hr_kpi":
        return (
          <div className="grid grid-cols-2 gap-3 @sm/app:grid-cols-3 @xl/app:grid-cols-4">
            <KpiCard
              label="재직 인원"
              value={`${metrics.headcount}`}
              hint="사원명부 · 현재 필터"
            />
            <KpiCard
              label="당해년도 입사자수"
              value={`${hiresThisYear}`}
              hint={`${new Date().getFullYear()}년 · 입퇴사자 현황`}
            />
            <KpiCard
              label="당해년도 퇴사자수"
              value={`${metrics.leaversYtd}`}
              hint={`${new Date().getFullYear()}년 · 입퇴사자 현황`}
            />
            <KpiCard
              label="퇴사율"
              value={`${metrics.turnoverRate}%`}
              hint="퇴사 ÷ (재직+퇴사)"
            />
            <KpiCard
              label="평균 근속년수"
              value={
                metrics.hasTenureData
                  ? formatYears(metrics.avgTenure).replace("년", "")
                  : "—"
              }
              hint={
                metrics.hasTenureData
                  ? "년 · 입사일 기준"
                  : "입사일 있는 인원만"
              }
            />
            <KpiCard
              label="평균 연령"
              value={
                metrics.hasAgeData ? `${Math.round(metrics.avgAge)}` : "—"
              }
              hint={
                metrics.hasAgeData
                  ? "세"
                  : "사원명부에 생년월일 없음"
              }
            />
            {canViewSalary ? (
              <KpiCard
                label="평균 연봉"
                value={
                  metrics.hasSalaryData
                    ? formatManwon(metrics.avgSalary)
                    : "—"
                }
                hint={
                  metrics.hasSalaryData
                    ? `중앙값 ${formatManwon(metrics.medianSalary)}`
                    : "사원명부에 연봉 없음"
                }
                note="※ 학자보조금, 장기근속포상 등 일부 비용 제외 · 관리자 전용"
              />
            ) : (
              <KpiCard
                label="평균 연봉"
                value="—"
                hint="관리자만 열람·입력 가능"
              />
            )}
            <KpiCard
              label="성별 구성"
              value={`${metrics.gender.malePct}:${metrics.gender.femalePct}`}
              hint={`남 ${metrics.gender.male} · 여 ${metrics.gender.female}`}
            />
          </div>
        );
      case "hr_demographics":
        return (
          <HrAttritionDonutPanel employees={hrEmployees} filter={filter} />
        );
      case "hr_compensation":
        return (
          <div className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <p className="text-sm text-muted-foreground">
                인건비·근무시간 기준월:{" "}
                <span className="font-medium text-foreground">
                  {metricMonth.replace("-", "년 ")}월
                </span>
                {" · "}당월/누계는 이 연월 기준
              </p>
              <label className="grid gap-1 text-sm">
                <span className="text-muted-foreground">기준 연월</span>
                <input
                  type="month"
                  className="h-9 rounded-md border border-border bg-background px-2 text-sm"
                  value={metricMonth}
                  onChange={(e) => setMetricMonth(e.target.value)}
                />
              </label>
            </div>
            <div className="grid gap-3 @md/app:grid-cols-2">
              <HrCompanyMetricCard
                title="전사 인건비"
                unit="million"
                unitLabel="단위: 백만원"
                month={laborCompany.month}
                ytd={laborCompany.ytd}
                tone="blue"
              />
              <HrCompanyMetricCard
                title="전사 근무시간"
                unit="hours"
                unitLabel="단위: 시간"
                month={hoursCompany.month}
                ytd={hoursCompany.ytd}
                tone="violet"
              />
            </div>
            <HrOpsTrendChart
              laborRows={labor.items}
              hoursRows={workHours.items}
              yearMonth={metricMonth}
            />
          </div>
        );
      case "hr_org":
        return (
          <div className="space-y-6">
            <HrPeriodCompareBlock
              topic="인건비"
              unit="million"
              unitLabel="금액: 백만원 · 팀 클릭 시 파트"
              rows={labor.items}
              asOf={metricAsOf}
            />
            <HrPeriodCompareBlock
              topic="근무시간"
              unit="hours"
              unitLabel="단위: 시간 · 곡물·기술 · 파트·연장/야간/휴일 펼침"
              rows={workHours.items}
              asOf={metricAsOf}
              teams={WORK_HOURS_TEAMS}
            />
            <div className="rounded-xl border border-dashed border-border bg-muted/20 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-dh-deep dark:text-dh-light">
                    인건비 · 근무시간 데이터 관리
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    인건비는 팀·파트 금액, 근무시간은 연장·야간·휴일·휴일연장으로
                    입력합니다. (곡물·기술팀) 붙여넣기 가능.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowMetricEditors((v) => !v)}
                >
                  {showMetricEditors ? "접기" : "데이터 입력 · 수정"}
                </Button>
              </div>
              {showMetricEditors ? (
                <div className="mt-3 space-y-4">
                  <TeamPeriodMetricsEditor
                    title="팀·파트 인건비 (계획·실적)"
                    list={labor}
                    excelFileName="팀파트인건비.xlsx"
                    valueKind="won"
                    focusMonth={metricMonth}
                  />
                  <TeamPeriodMetricsEditor
                    title="팀·파트 근무시간 (연장·야간·휴일·휴일연장)"
                    description="곡물사업팀·기술팀만 입력합니다. 파트별로 연장/야간/휴일/휴일연장 계획·실적을 넣으면 합계가 자동 계산됩니다."
                    list={workHours}
                    excelFileName="팀파트근무시간.xlsx"
                    valueKind="hours"
                    focusMonth={metricMonth}
                    allowedTeams={WORK_HOURS_TEAMS}
                  />
                </div>
              ) : null}
            </div>
          </div>
        );
      default:
        return null;
    }
  }

  if (
    !roster.hydrated ||
    !staffMovements.hydrated ||
    !layoutHydrated ||
    !labor.hydrated ||
    !workHours.hydrated
  ) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-sm text-muted-foreground">
        인사자료를 불러오는 중…
      </div>
    );
  }

  const HR_VIEW_ORDER: HomeWidgetId[] = [
    "hr_kpi",
    "hr_demographics",
    "hr_compensation",
    "hr_org",
  ];
  const visibility = new Map(sortedHr.map((w) => [w.id, w.visible]));
  const visible = HR_VIEW_ORDER.filter((id) => visibility.get(id) !== false);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2 text-dh-deep dark:text-dh-sky">
            <Users className="size-4" />
            <span className="text-xs font-semibold tracking-wide">
              HR DATA
            </span>
          </div>
          <h2 className="font-heading text-lg font-semibold text-dh-deep dark:text-dh-light sm:text-xl">
            인사자료 대시보드
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            재직·성별·근속은{" "}
            <Link
              href="/employees"
              className="font-medium text-dh-real underline-offset-2 hover:underline"
            >
              사원명부
            </Link>
            , 입·퇴사는{" "}
            <Link
              href="/hr-records?main=hr&sub=staff-movements"
              className="font-medium text-dh-real underline-offset-2 hover:underline"
            >
              입퇴사자 현황
            </Link>
            을 반영합니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/employees"
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-sm font-medium hover:bg-muted"
          >
            사원명부 열기
          </Link>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={exportRosterSnapshot}
          >
            <Download className="size-3.5" />
            명부 내보내기
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              if (
                window.confirm(
                  "인건비·근무시간 샘플만 초기화할까요? (사원명부는 그대로입니다)",
                )
              ) {
                labor.reset();
                workHours.reset();
              }
            }}
          >
            <RotateCcw className="size-3.5" />
            샘플
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-2 rounded-xl border border-border bg-card p-3 shadow-sm">
        <div className="mr-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Filter className="size-3.5" />
          필터
        </div>
        <label className="grid gap-1 text-xs">
          <span className="text-muted-foreground">직군</span>
          <select
            className="h-9 min-w-[7rem] rounded-md border border-border bg-background px-2 text-sm"
            value={filter.jobTrack}
            onChange={(e) =>
              setFilter((f) => ({
                ...f,
                jobTrack: e.target.value as HrFilter["jobTrack"],
              }))
            }
          >
            <option value="전체">전체</option>
            {filterOpts.jobTracks.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs">
          <span className="text-muted-foreground">본부</span>
          <select
            className="h-9 min-w-[10rem] rounded-md border border-border bg-background px-2 text-sm"
            value={filter.division}
            onChange={(e) => {
              const division = e.target.value as HrFilter["division"];
              const teamsForDiv =
                TEAMS_BY_DIVISION[division as OrgDivision] ?? [];
              setFilter((f) => ({
                ...f,
                division,
                team:
                  division !== "전체" &&
                  f.team !== "전체" &&
                  teamsForDiv.length > 0 &&
                  !teamsForDiv.includes(f.team as OrgTeam) &&
                  !roster.items.some(
                    (r) =>
                      r.department === f.team && r.division === division,
                  )
                    ? "전체"
                    : f.team,
              }));
            }}
          >
            <option value="전체">전사</option>
            {filterOpts.divisions.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs">
          <span className="text-muted-foreground">팀</span>
          <select
            className="h-9 min-w-[8rem] rounded-md border border-border bg-background px-2 text-sm"
            value={filter.team}
            onChange={(e) =>
              setFilter((f) => ({
                ...f,
                team: e.target.value as HrFilter["team"],
              }))
            }
          >
            <option value="전체">전체</option>
            {teamOptions.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-9"
          onClick={() => setFilter(emptyHrFilter())}
        >
          초기화
        </Button>
        <p className="ml-auto text-xs text-muted-foreground">
          사원명부 {roster.items.length}명 · 표시 재직 {metrics.headcount}명
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {visible.map((id) => {
          const content = renderWidget(id);
          if (!content) return null;
          return (
            <div key={id} className={cn("min-w-0", widgetClass("full"))}>
              {content}
            </div>
          );
        })}
      </div>

      {!visible.length ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          표시할 HR 위젯이 없습니다. 설정 → 홈화면 편집에서 켜주세요.
        </div>
      ) : null}
    </div>
  );
}
