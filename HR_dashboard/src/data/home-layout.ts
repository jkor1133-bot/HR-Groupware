import type { HomeLayoutPrefs, HomeWidgetConfig, HomeWidgetId } from "@/lib/types";

export const OPS_WIDGET_META: Record<
  Extract<
    HomeWidgetId,
    | "weekly_plans"
    | "calendar"
    | "leave"
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
  leave: {
    label: "연차 신청 현황",
    description: "오늘·이번 주 연차",
  },
  contracts_alerts: {
    label: "계약·인허가 알림",
    description: "1개월 내 만료 알림",
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
    description: "당월/누계 실적 KPI 2칸",
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
    visible: !["labor_cost", "work_hours"].includes(id),
    size:
      id === "weekly_plans" || id === "contracts_alerts" ? "full" : "half",
  }));
}

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
    version: 3,
    defaultView: "ops",
    opsWidgets: opsDefaults(),
    hrWidgets: hrDefaults(),
  };
}
