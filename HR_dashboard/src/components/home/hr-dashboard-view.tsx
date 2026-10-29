"use client";

import { useMemo, useRef, useState } from "react";
import {
  Download,
  Filter,
  RotateCcw,
  Upload,
  Users,
} from "lucide-react";
import { HrAttritionDonutPanel } from "@/components/home/hr-attrition-donut";
import { HrCompanyMetricCard } from "@/components/home/hr-company-metric-card";
import { HrPeriodCompareBlock } from "@/components/home/hr-period-compare";
import { TeamPeriodMetricsEditor } from "@/components/home/team-period-metrics-editor";
import { Button } from "@/components/ui/button";
import {
  JOB_TRACKS,
  LEAVE_REASONS,
  ORG_DIVISIONS,
  ORG_TEAMS,
  TEAMS_BY_DIVISION,
} from "@/data/org";
import { seedHrEmployees } from "@/data/hr-master-seed";
import {
  seedTeamHoursMetrics,
  seedTeamLaborMetrics,
} from "@/data/hr-ops-seed";
import { useLocalList } from "@/hooks/use-local-list";
import { useHomeLayout } from "@/hooks/use-home-layout";
import {
  cellDate,
  cellNum,
  cellStr,
  downloadRowsAsExcel,
  readExcelFile,
} from "@/lib/excel";
import {
  computeHrMetrics,
  emptyHrFilter,
  formatManwon,
  formatYears,
  type HrFilter,
} from "@/lib/hr-metrics";
import { currentYearMonth } from "@/lib/period";
import {
  asOfFromYearMonth,
  buildCompanySlices,
} from "@/lib/team-period-metrics";
import type {
  Gender,
  HomeWidgetConfig,
  HomeWidgetId,
  HrEmployee,
  JobTrack,
  LeaveReason,
  OrgDivision,
  OrgTeam,
} from "@/lib/types";
import { TEAM_DIVISION } from "@/data/org";
import { cn } from "@/lib/utils";

function widgetClass(size: HomeWidgetConfig["size"]) {
  return size === "full" ? "@lg/app:col-span-2" : "";
}

function KpiCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
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
    </div>
  );
}

export function HrDashboardView() {
  const employees = useLocalList("hr-dashboard-hr-master-v5", seedHrEmployees);
  const labor = useLocalList(
    "hr-dashboard-team-labor-v1",
    seedTeamLaborMetrics,
  );
  const workHours = useLocalList(
    "hr-dashboard-team-hours-v1",
    seedTeamHoursMetrics,
  );
  const { hydrated: layoutHydrated, sortedHr } = useHomeLayout();
  const [filter, setFilter] = useState<HrFilter>(emptyHrFilter);
  const [metricMonth, setMetricMonth] = useState(() => currentYearMonth());
  const [showMetricEditors, setShowMetricEditors] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const metricAsOf = useMemo(
    () => asOfFromYearMonth(metricMonth),
    [metricMonth],
  );

  const metrics = useMemo(
    () => computeHrMetrics(employees.items, filter),
    [employees.items, filter],
  );

  const laborCompany = useMemo(
    () => buildCompanySlices(labor.items, metricAsOf),
    [labor.items, metricAsOf],
  );
  const hoursCompany = useMemo(
    () => buildCompanySlices(workHours.items, metricAsOf),
    [workHours.items, metricAsOf],
  );

  const teamOptions = useMemo(() => {
    if (filter.division === "전체") return ORG_TEAMS;
    return TEAMS_BY_DIVISION[filter.division] ?? ORG_TEAMS;
  }, [filter.division]);

  async function onUpload(file?: File) {
    if (!file) return;
    const rows = await readExcelFile(file);
    const next: HrEmployee[] = rows
      .map((row, i) => {
        const team = (cellStr(row, "팀", "team") || "인사총무팀") as OrgTeam;
        const division = (cellStr(row, "본부", "division") ||
          TEAM_DIVISION[team] ||
          "경영지원본부") as OrgDivision;
        const statusRaw = cellStr(row, "상태", "status");
        const leaveDate = cellDate(row, "퇴사일", "leaveDate") || undefined;
        const status =
          statusRaw === "퇴사" || leaveDate ? "퇴사" : "재직";
        const reasonRaw = cellStr(row, "퇴사사유", "leaveReason", "사유");
        const leaveReason = (
          LEAVE_REASONS.includes(reasonRaw as LeaveReason)
            ? reasonRaw
            : leaveDate
              ? "기타"
              : undefined
        ) as LeaveReason | undefined;
        return {
          id: `emp-up-${Date.now()}-${i}`,
          name: cellStr(row, "성명", "이름", "name"),
          gender: (cellStr(row, "성별", "gender") === "여"
            ? "여"
            : "남") as Gender,
          birthDate: cellDate(row, "생년월일", "birthDate") || "1990-01-01",
          hireDate: cellDate(row, "입사일", "hireDate") || "2020-01-01",
          leaveDate,
          leaveReason,
          status: status as HrEmployee["status"],
          jobTrack: (cellStr(row, "직군", "jobTrack") || "일반직") as JobTrack,
          division,
          team: ORG_TEAMS.includes(team) ? team : "인사총무팀",
          title: cellStr(row, "직위", "직급", "title") || "사원",
          salary: cellNum(row, "연봉", "급여", "salary"),
        };
      })
      .filter((e) => e.name);
    if (next.length) employees.replaceAll(next);
  }

  function exportTemplate() {
    downloadRowsAsExcel(
      employees.items.map((e) => ({
        성명: e.name,
        성별: e.gender,
        생년월일: e.birthDate,
        입사일: e.hireDate,
        퇴사일: e.leaveDate ?? "",
        퇴사사유: e.leaveReason ?? "",
        상태: e.status,
        직군: e.jobTrack,
        본부: e.division,
        팀: e.team,
        직위: e.title,
        연봉: e.salary,
      })),
      "hr-master.xlsx",
      "인사마스터",
    );
  }

  function renderWidget(id: HomeWidgetId) {
    switch (id) {
      case "hr_kpi":
        return (
          <div className="grid grid-cols-2 gap-3 @sm/app:grid-cols-3 @xl/app:grid-cols-7">
            <KpiCard
              label="재직 인원"
              value={`${metrics.headcount}`}
              hint="현재 필터 기준"
            />
            <KpiCard
              label="당해년도 퇴사자수"
              value={`${metrics.leaversYtd}`}
              hint={`${new Date().getFullYear()}년`}
            />
            <KpiCard
              label="퇴사율"
              value={`${metrics.turnoverRate}%`}
              hint="퇴사 ÷ (재직+퇴사)"
            />
            <KpiCard
              label="평균 연령"
              value={`${Math.round(metrics.avgAge)}`}
              hint="세"
            />
            <KpiCard
              label="평균 근속년수"
              value={formatYears(metrics.avgTenure).replace("년", "")}
              hint="년"
            />
            <KpiCard
              label="평균 연봉"
              value={formatManwon(metrics.avgSalary)}
              hint={`중앙값 ${formatManwon(metrics.medianSalary)}`}
            />
            <KpiCard
              label="성별 구성"
              value={`${metrics.gender.malePct}:${metrics.gender.femalePct}`}
              hint={`남 ${metrics.gender.male} · 여 ${metrics.gender.female}`}
            />
          </div>
        );
      case "hr_demographics":
        return (
          <HrAttritionDonutPanel
            employees={employees.items}
            filter={filter}
          />
        );
      case "hr_compensation":
        return (
          <div className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                인건비·근무시간 기준월:{" "}
                <span className="font-medium text-foreground">
                  {metricMonth.replace("-", "년 ")}월
                </span>
                {" · "}당월/누계는 이 연월 기준
              </p>
              <label className="grid gap-1 text-xs">
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
          </div>
        );
      case "hr_org":
        return (
          <div className="space-y-6">
            <HrPeriodCompareBlock
              topic="인건비"
              unit="million"
              unitLabel="금액: 백만원"
              rows={labor.items}
              asOf={metricAsOf}
            />
            <HrPeriodCompareBlock
              topic="근무시간"
              unit="hours"
              unitLabel="단위: 시간"
              rows={workHours.items}
              asOf={metricAsOf}
            />
            <div className="rounded-xl border border-dashed border-border bg-muted/20 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-dh-deep dark:text-dh-light">
                    인건비 · 근무시간 데이터 관리
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    연월(YYYY-MM)·팀·계획·실적을 엑셀로 올리거나 수정·저장하면,
                    위 기준 연월을 바꿀 때마다 해당 달 숫자가 바뀝니다.
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
                    title="팀별 인건비 (계획·실적)"
                    list={labor}
                    excelFileName="팀인건비.xlsx"
                    valueKind="won"
                    focusMonth={metricMonth}
                  />
                  <TeamPeriodMetricsEditor
                    title="팀별 근무시간 (계획·실적)"
                    list={workHours}
                    excelFileName="팀근무시간.xlsx"
                    valueKind="hours"
                    focusMonth={metricMonth}
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
    !employees.hydrated ||
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

  // 화면 고정 순서 (설정 표시 on/off만 반영)
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
            KPI는 인사마스터 엑셀, 인건비·근무시간은 아래 데이터 관리에서
            연월별로 저장합니다. (현재 브라우저 저장 · 추후 DB 연동 가능)
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => {
              void onUpload(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="size-3.5" />
            엑셀 업로드
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={exportTemplate}>
            <Download className="size-3.5" />
            내보내기
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              if (window.confirm("샘플 인사마스터로 초기화할까요?")) {
                employees.reset();
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
            {JOB_TRACKS.map((t) => (
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
              setFilter((f) => ({
                ...f,
                division,
                team:
                  division !== "전체" &&
                  f.team !== "전체" &&
                  !TEAMS_BY_DIVISION[division].includes(f.team as OrgTeam)
                    ? "전체"
                    : f.team,
              }));
            }}
          >
            <option value="전체">전사</option>
            {ORG_DIVISIONS.map((d) => (
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
          마스터 {employees.items.length}명 · 표시 재직 {metrics.headcount}명
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
