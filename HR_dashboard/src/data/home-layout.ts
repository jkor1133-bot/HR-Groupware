import type { HomeLayoutPrefs, HomeWidgetConfig, HomeWidgetId } from "@/lib/types";

export const OPS_WIDGET_META: Record<
  Extract<
    HomeWidgetId,
    | "weekly_plans"
    | "calendar"
    | "weekly_progress"
    | "kpi_progress"
    | "contracts_alerts"
    | "labor_cost"
    | "work_hours"
  >,
  { label: string; description: string }
> = {
  weekly_plans: {
    label: "주간업무계획",
    description: "이번 주 할 일 요약·엑셀 연동",
  },
  calendar: {
    label: "Calendar",
    description: "일정 / 오늘 할 일",
  },
  weekly_progress: {
    label: "이번 주 업무 진행",
    description: "예정·진행·완료·지연 요약",
  },
  kpi_progress: {
    label: "KPI 진척사항",
    description: "전략과제 당월·누계 · Calendar 아래",
  },
  contracts_alerts: {
    label: "계약·인허가 알림 (단독)",
    description: "Calendar에 표시 · 기본 숨김",
  },
  labor_cost: {
    label: "인건비 현황",
    description: "직군별 인건비 (선택 위젯)",
  },
  work_hours: {
    label: "근무시간 현황",
    description: "현장·별정 근무시간 (선택 위젯)",
  },
};

export const HR_WIDGET_META: Record<
  Extract<
    HomeWidgetId,
    "hr_kpi" | "hr_org" | "hr_demographics" | "hr_compensation"
  >,
  { label: string; description: string }
> = {
  hr_kpi: {
    label: "핵심 인사 KPI (7)",
    description: "재직·퇴사·퇴사율·연령·근속·연봉·성비",
  },
  hr_demographics: {
    label: "퇴사 도넛 차트",
    description: "인원·사유 · 특정월/누계",
  },
  hr_compensation: {
    label: "전사 인건비·근무시간",
    description: "당월/누계 KPI · 월별·연도별 추이",
  },
  hr_org: {
    label: "인건비·근무시간 비교",
    description: "당월/누계 탭 · 계획대비 · 전년비교 (팀)",
  },
};

function opsDefaults(): HomeWidgetConfig[] {
  const ids = Object.keys(OPS_WIDGET_META) as (keyof typeof OPS_WIDGET_META)[];
  return ids.map((id, order) => ({
    id,
    order,
    visible: !["labor_cost", "work_hours", "contracts_alerts"].includes(id),
    size:
      id === "weekly_plans" || id === "kpi_progress" ? "full" : "half",
  }));
}

/** v7: KPI는 Calendar·업무진행 아래 전체 너비 */
export const HOME_LAYOUT_VERSION = 7;

/** 화면 고정 순서: KPI7 → 도넛 → KPI2 → 비교표 */
const HR_ORDER: (keyof typeof HR_WIDGET_META)[] = [
  "hr_kpi",
  "hr_demographics",
  "hr_compensation",
  "hr_org",
];

function hrDefaults(): HomeWidgetConfig[] {
  return HR_ORDER.map((id, order) => ({
    id,
    order,
    visible: true,
    size: "full" as const,
  }));
}

export function defaultHomeLayout(): HomeLayoutPrefs {
  return {
    version: HOME_LAYOUT_VERSION,
    defaultView: "ops",
    opsWidgets: opsDefaults(),
    hrWidgets: hrDefaults(),
  };
}
