"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  WORK_HOURS_TEAMS,
  WORK_HOUR_DETAIL_KEYS,
  WORK_HOUR_DETAIL_LABELS,
  buildMonthlyHourDetailTrend,
  buildMonthlyTrend,
  buildYearlyHourDetailTrend,
  buildYearlyTrend,
  formatHours,
  formatMillion,
  toMillion,
  type HourDetailTrendPoint,
  type TrendPoint,
} from "@/lib/team-period-metrics";
import type { TeamPeriodMetric, WorkHourDetailKey } from "@/lib/types";
import { cn } from "@/lib/utils";

type Topic = "labor" | "hours";
type Mode = "month" | "year";
/** 세부: 전체 구성(실적 누적) | 단일 항목 계획·실적 */
type DetailFocus = "all" | WorkHourDetailKey;

const PLAN_COLOR = "#3b87bb";
const ACTUAL_COLOR = "#1f4889";

const DETAIL_COLORS: Record<WorkHourDetailKey, string> = {
  overtime: "#002753",
  night: "#1f4889",
  holiday: "#3b87bb",
  holidayOt: "#5bb6d5",
};

function chartRows(points: TrendPoint[], topic: Topic) {
  if (topic === "labor") {
    return points.map((p) => ({
      label: p.label,
      plan: toMillion(p.plan),
      actual: toMillion(p.actual),
      planRaw: p.plan,
      actualRaw: p.actual,
    }));
  }
  return points.map((p) => ({
    label: p.label,
    plan: p.plan,
    actual: p.actual,
    planRaw: p.plan,
    actualRaw: p.actual,
  }));
}

function detailHasData(points: HourDetailTrendPoint[]) {
  return points.some(
    (p) =>
      p.overtimePlan +
        p.nightPlan +
        p.holidayPlan +
        p.holidayOtPlan +
        p.overtimeActual +
        p.nightActual +
        p.holidayActual +
        p.holidayOtActual >
      0,
  );
}

function singleCategoryRows(
  points: HourDetailTrendPoint[],
  key: WorkHourDetailKey,
) {
  return points.map((p) => ({
    label: p.label,
    plan: p[`${key}Plan`],
    actual: p[`${key}Actual`],
  }));
}

export function HrOpsTrendChart({
  laborRows,
  hoursRows,
  yearMonth,
}: {
  laborRows: TeamPeriodMetric[];
  hoursRows: TeamPeriodMetric[];
  yearMonth: string;
}) {
  const [topic, setTopic] = useState<Topic>("hours");
  const [mode, setMode] = useState<Mode>("month");
  const [detailFocus, setDetailFocus] = useState<DetailFocus>("all");
  const year = Number(yearMonth.slice(0, 4)) || new Date().getFullYear();

  const points = useMemo(() => {
    if (topic === "labor") {
      return mode === "month"
        ? buildMonthlyTrend(laborRows, year)
        : buildYearlyTrend(laborRows, undefined, year);
    }
    return mode === "month"
      ? buildMonthlyTrend(hoursRows, year, WORK_HOURS_TEAMS)
      : buildYearlyTrend(hoursRows, WORK_HOURS_TEAMS, year);
  }, [topic, mode, laborRows, hoursRows, year]);

  const detailPoints = useMemo(() => {
    if (topic !== "hours") return [];
    return mode === "month"
      ? buildMonthlyHourDetailTrend(hoursRows, year, WORK_HOURS_TEAMS)
      : buildYearlyHourDetailTrend(hoursRows, WORK_HOURS_TEAMS, year);
  }, [topic, mode, hoursRows, year]);

  const rows = useMemo(() => chartRows(points, topic), [points, topic]);
  const singleRows = useMemo(() => {
    if (detailFocus === "all") return [];
    return singleCategoryRows(detailPoints, detailFocus);
  }, [detailPoints, detailFocus]);

  const unitLabel = topic === "labor" ? "백만원" : "시간";
  const hasData = points.some((p) => p.plan > 0 || p.actual > 0);
  const hasDetail = detailHasData(detailPoints);

  return (
    <section className="rounded-xl border border-border bg-card shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border px-4 py-3">
        <div>
          <p className="text-[11px] text-muted-foreground">추이</p>
          <h3 className="font-heading text-base font-semibold text-dh-deep dark:text-dh-light">
            인건비 · 근무시간 추이
          </h3>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {mode === "month"
              ? `${year}년 월별 계획·실적`
              : "연도별 합계 계획·실적"}{" "}
            · 단위 {unitLabel}
            {topic === "hours" ? " · 근무시간: 곡물·기술팀" : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5">
            {(
              [
                ["labor", "인건비"],
                ["hours", "근무시간"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTopic(id)}
                className={cn(
                  "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                  topic === id
                    ? "bg-dh-sky/30 text-dh-deep shadow-sm dark:bg-dh-real dark:text-dh-light"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5">
            {(
              [
                ["month", "월별"],
                ["year", "연도별"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setMode(id)}
                className={cn(
                  "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                  mode === id
                    ? "bg-dh-sky/30 text-dh-deep shadow-sm dark:bg-dh-real dark:text-dh-light"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4 p-3">
        {!hasData ? (
          <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
            표시할 데이터가 없습니다. 아래에서 계획·실적을 입력하세요.
          </div>
        ) : (
          <>
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                총량 · 계획 vs 실적
              </p>
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={rows}
                    margin={{ top: 8, right: 12, left: 4, bottom: 4 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-border"
                    />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      width={48}
                      tickFormatter={(v) =>
                        topic === "labor"
                          ? String(v)
                          : Number(v).toLocaleString("ko-KR")
                      }
                    />
                    <Tooltip
                      formatter={(_value, name, item) => {
                        const payload = item?.payload as
                          | { planRaw?: number; actualRaw?: number }
                          | undefined;
                        const raw =
                          name === "계획"
                            ? Number(payload?.planRaw ?? 0)
                            : Number(payload?.actualRaw ?? 0);
                        return [
                          topic === "labor"
                            ? `${formatMillion(raw)} 백만원`
                            : `${formatHours(raw)} 시간`,
                          String(name),
                        ];
                      }}
                      labelFormatter={(label) => String(label)}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
                    <Line
                      type="monotone"
                      dataKey="plan"
                      name="계획"
                      stroke={PLAN_COLOR}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="actual"
                      name="실적"
                      stroke={ACTUAL_COLOR}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {topic === "hours" ? (
              <div className="border-t border-border pt-3">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      {detailFocus === "all"
                        ? "구성 · 실적 누적"
                        : `${WORK_HOUR_DETAIL_LABELS[detailFocus]} · 계획 vs 실적`}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      전체는 실적 구성만, 항목을 고르면 그 항목의 계획·실적만
                      비교합니다.
                    </p>
                  </div>
                  <div className="inline-flex flex-wrap rounded-lg border border-border bg-muted/40 p-0.5">
                    <button
                      type="button"
                      onClick={() => setDetailFocus("all")}
                      className={cn(
                        "rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors",
                        detailFocus === "all"
                          ? "bg-dh-sky/30 text-dh-deep shadow-sm dark:bg-dh-real dark:text-dh-light"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      전체 구성
                    </button>
                    {WORK_HOUR_DETAIL_KEYS.map((key) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setDetailFocus(key)}
                        className={cn(
                          "rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors",
                          detailFocus === key
                            ? "bg-dh-sky/30 text-dh-deep shadow-sm dark:bg-dh-real dark:text-dh-light"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {WORK_HOUR_DETAIL_LABELS[key].replace("시간", "")}
                      </button>
                    ))}
                  </div>
                </div>

                {!hasDetail ? (
                  <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
                    세부 시간 데이터가 없습니다.
                  </div>
                ) : detailFocus === "all" ? (
                  <div className="h-[240px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={detailPoints}
                        margin={{ top: 8, right: 12, left: 4, bottom: 4 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          className="stroke-border"
                        />
                        <XAxis
                          dataKey="label"
                          tick={{ fontSize: 11 }}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 11 }}
                          tickLine={false}
                          width={48}
                          tickFormatter={(v) =>
                            Number(v).toLocaleString("ko-KR")
                          }
                        />
                        <Tooltip
                          formatter={(value, name) => [
                            `${formatHours(Number(value ?? 0))} 시간`,
                            String(name),
                          ]}
                          labelFormatter={(label) => String(label)}
                        />
                        <Legend
                          wrapperStyle={{ fontSize: 11 }}
                          iconType="square"
                        />
                        {WORK_HOUR_DETAIL_KEYS.map((key) => (
                          <Bar
                            key={key}
                            dataKey={`${key}Actual`}
                            name={WORK_HOUR_DETAIL_LABELS[key]}
                            stackId="actual"
                            fill={DETAIL_COLORS[key]}
                            maxBarSize={32}
                          />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[240px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={singleRows}
                        margin={{ top: 8, right: 12, left: 4, bottom: 4 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          className="stroke-border"
                        />
                        <XAxis
                          dataKey="label"
                          tick={{ fontSize: 11 }}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 11 }}
                          tickLine={false}
                          width={48}
                          tickFormatter={(v) =>
                            Number(v).toLocaleString("ko-KR")
                          }
                        />
                        <Tooltip
                          formatter={(value, name) => [
                            `${formatHours(Number(value ?? 0))} 시간`,
                            String(name),
                          ]}
                          labelFormatter={(label) => String(label)}
                        />
                        <Legend
                          wrapperStyle={{ fontSize: 12 }}
                          iconType="square"
                        />
                        <Bar
                          dataKey="plan"
                          name="계획"
                          fill={PLAN_COLOR}
                          fillOpacity={0.55}
                          maxBarSize={22}
                        />
                        <Bar
                          dataKey="actual"
                          name="실적"
                          fill={ACTUAL_COLOR}
                          maxBarSize={22}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}
