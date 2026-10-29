"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { CHART_PALETTE } from "@/components/home/hr-charts";
import {
  ALL_TITLE_KEYS,
  JOB_TRACKS,
  LEAVE_REASONS,
  ORG_TEAMS,
} from "@/data/org";
import { type HrFilter, matchOrgForMetrics } from "@/lib/hr-metrics";
import { currentYearMonth } from "@/lib/period";
import type { HrEmployee, LeaveReason } from "@/lib/types";
import { cn } from "@/lib/utils";

export type AttritionPeriod = "month" | "ytd";
export type AttritionDim = "jobTrack" | "title" | "team" | "gender";

const PERIOD_OPTS: { id: AttritionPeriod; label: string }[] = [
  { id: "month", label: "특정월" },
  { id: "ytd", label: "누계" },
];

const DIM_OPTS: { id: AttritionDim; label: string }[] = [
  { id: "jobTrack", label: "직군별" },
  { id: "title", label: "직위별" },
  { id: "team", label: "팀별" },
  { id: "gender", label: "성별" },
];

function leaversInScope(
  all: HrEmployee[],
  filter: HrFilter,
  period: AttritionPeriod,
  yearMonth: string,
) {
  const year = yearMonth.slice(0, 4);
  return all.filter((e) => {
    if (e.status !== "퇴사" || !e.leaveDate) return false;
    if (!matchOrgForMetrics(e, filter)) return false;
    if (period === "month") return e.leaveDate.startsWith(yearMonth);
    // 누계: 선택 연도의 1월 ~ 선택월
    return (
      e.leaveDate.startsWith(year) && e.leaveDate.slice(0, 7) <= yearMonth
    );
  });
}

function dimLabel(e: HrEmployee, dim: AttritionDim) {
  if (dim === "jobTrack") return e.jobTrack;
  if (dim === "title") return `${e.jobTrack}·${e.title}`;
  if (dim === "team") return e.team;
  return e.gender;
}

function orderedKeys(dim: AttritionDim, counted: string[]) {
  if (dim === "jobTrack") return [...JOB_TRACKS];
  if (dim === "gender") return ["남", "여"];
  if (dim === "team") {
    const set = new Set(counted);
    return ORG_TEAMS.filter((t) => set.has(t));
  }
  const defined = ALL_TITLE_KEYS.map((k) => k.label);
  const set = new Set(counted);
  const known = defined.filter((l) => set.has(l));
  const extra = counted.filter((l) => !defined.includes(l));
  return [...known, ...extra];
}

function buildHeadcountBreakdown(
  leavers: HrEmployee[],
  dim: AttritionDim,
): { label: string; value: number }[] {
  const map: Record<string, number> = {};
  for (const e of leavers) {
    const key = dimLabel(e, dim);
    map[key] = (map[key] ?? 0) + 1;
  }
  const keys = orderedKeys(dim, Object.keys(map));
  if (dim === "jobTrack" || dim === "gender") {
    return keys.map((label) => ({ label, value: map[label] ?? 0 }));
  }
  return keys
    .map((label) => ({ label, value: map[label] ?? 0 }))
    .filter((d) => d.value > 0);
}

function buildReasonBreakdown(
  leavers: HrEmployee[],
): { label: string; value: number }[] {
  const map: Record<string, number> = Object.fromEntries(
    LEAVE_REASONS.map((r) => [r, 0]),
  );
  for (const e of leavers) {
    const reason = (e.leaveReason ?? "기타") as LeaveReason;
    map[reason] = (map[reason] ?? 0) + 1;
  }
  return LEAVE_REASONS.map((label) => ({
    label,
    value: map[label] ?? 0,
  }));
}

function periodHint(period: AttritionPeriod, yearMonth: string) {
  const [y, m] = yearMonth.split("-").map(Number);
  if (period === "month") return `특정월(${y}년 ${m}월)`;
  return `누계(${y}년 1~${m}월)`;
}

function InteractiveDonutCard({
  title,
  subtitle,
  fullRows,
  dimControls,
}: {
  title: string;
  subtitle: string;
  fullRows: { label: string; value: number }[];
  dimControls?: React.ReactNode;
}) {
  const [selected, setSelected] = useState<Set<string> | null>(null);

  useEffect(() => {
    setSelected(null);
  }, [fullRows]);

  const activeLabels = useMemo(() => {
    if (!selected || selected.size === 0) {
      return new Set(fullRows.map((r) => r.label));
    }
    return selected;
  }, [selected, fullRows]);

  const chartRows = useMemo(() => {
    const filtered = fullRows.filter(
      (r) => activeLabels.has(r.label) && r.value > 0,
    );
    const total = filtered.reduce((a, b) => a + b.value, 0) || 1;
    return filtered.map((d) => ({
      ...d,
      pct: Math.round((d.value / total) * 1000) / 10,
    }));
  }, [fullRows, activeLabels]);

  const selectedTotal = fullRows
    .filter((r) => activeLabels.has(r.label))
    .reduce((a, b) => a + b.value, 0);
  const allTotal = fullRows.reduce((a, b) => a + b.value, 0);

  function toggleLabel(label: string) {
    setSelected((prev) => {
      const base =
        prev === null
          ? new Set(fullRows.map((r) => r.label))
          : new Set(prev);
      if (base.has(label)) base.delete(label);
      else base.add(label);
      if (base.size === 0) return null;
      if (base.size === fullRows.length) return null;
      return base;
    });
  }

  function selectOnly(label: string) {
    setSelected(new Set([label]));
  }

  function selectAll() {
    setSelected(null);
  }

  const colorOf = (label: string) => {
    const i = fullRows.findIndex((r) => r.label === label);
    return CHART_PALETTE[(i >= 0 ? i : 0) % CHART_PALETTE.length];
  };

  return (
    <section className="flex min-h-0 flex-col rounded-xl border border-border bg-card shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border px-4 py-3">
        <div>
          <h3 className="font-heading text-sm font-semibold text-dh-deep dark:text-dh-light">
            {title}
          </h3>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{subtitle}</p>
        </div>
        {dimControls}
      </div>

      <div className="grid flex-1 gap-3 p-3 @md/app:grid-cols-[minmax(0,1fr)_160px]">
        <div className="relative h-[240px] w-full min-w-0">
          {selectedTotal === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              해당 조건 퇴사 없음
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartRows}
                  dataKey="value"
                  nameKey="label"
                  cx="45%"
                  cy="50%"
                  innerRadius="46%"
                  outerRadius="70%"
                  paddingAngle={2}
                  onClick={(data) => {
                    const payload = data as {
                      name?: string;
                      label?: string;
                      payload?: { label?: string };
                    };
                    const label =
                      payload?.payload?.label ??
                      payload?.label ??
                      payload?.name;
                    if (label) toggleLabel(String(label));
                  }}
                  style={{ cursor: "pointer" }}
                >
                  {chartRows.map((row) => (
                    <Cell key={row.label} fill={colorOf(row.label)} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, _n, item) => {
                    const v = Number(value ?? 0);
                    const pct =
                      (item?.payload as { pct?: number } | undefined)?.pct ??
                      0;
                    return [`${v}명 (${pct}%)`, "퇴사"];
                  }}
                />
                <Legend
                  layout="vertical"
                  align="right"
                  verticalAlign="middle"
                  iconType="circle"
                  wrapperStyle={{ fontSize: 11, cursor: "pointer" }}
                  onClick={(e) => {
                    const label = String(e.value ?? "");
                    if (label) toggleLabel(label);
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="pr-14 text-center">
              <p className="text-[10px] text-muted-foreground">선택</p>
              <p className="font-heading text-xl font-semibold tabular-nums text-dh-deep dark:text-dh-light">
                {selectedTotal}
              </p>
              <p className="text-[10px] text-muted-foreground">/ {allTotal}명</p>
            </div>
          </div>
        </div>

        <div className="flex min-h-0 flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium text-muted-foreground">선택</p>
            <button
              type="button"
              onClick={selectAll}
              className="text-[11px] text-dh-real hover:underline"
            >
              전체
            </button>
          </div>
          <ul className="max-h-[220px] space-y-1 overflow-auto pr-0.5">
            {fullRows.map((row) => {
              const on = activeLabels.has(row.label);
              return (
                <li key={row.label}>
                  <button
                    type="button"
                    onClick={() => toggleLabel(row.label)}
                    onDoubleClick={() => selectOnly(row.label)}
                    title="클릭: 켜기/끄기 · 더블클릭: 이것만"
                    className={cn(
                      "flex w-full items-center gap-1.5 rounded-md border px-1.5 py-1 text-left text-[11px] transition-colors",
                      on
                        ? "border-dh-sea/40 bg-dh-sky/10"
                        : "border-transparent bg-muted/40 opacity-45",
                    )}
                  >
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ background: colorOf(row.label) }}
                    />
                    <span className="min-w-0 flex-1 truncate">{row.label}</span>
                    <span className="shrink-0 tabular-nums font-medium">
                      {row.value}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}

export function HrAttritionDonutPanel({
  employees,
  filter,
}: {
  employees: HrEmployee[];
  filter: HrFilter;
}) {
  const [period, setPeriod] = useState<AttritionPeriod>("ytd");
  const [yearMonth, setYearMonth] = useState(() => currentYearMonth());
  const [dim, setDim] = useState<AttritionDim>("jobTrack");

  const leavers = useMemo(
    () => leaversInScope(employees, filter, period, yearMonth),
    [employees, filter, period, yearMonth],
  );

  const headcountRows = useMemo(
    () => buildHeadcountBreakdown(leavers, dim),
    [leavers, dim],
  );
  const reasonRows = useMemo(() => buildReasonBreakdown(leavers), [leavers]);

  const hint = periodHint(period, yearMonth);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
        <div>
          <p className="text-[11px] text-muted-foreground">퇴사 분석</p>
          <h3 className="font-heading text-base font-semibold text-dh-deep dark:text-dh-light">
            퇴사인원 · 퇴사사유
          </h3>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {hint} · 범례·목록 클릭으로 항목 필터
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5">
            {PERIOD_OPTS.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => setPeriod(o.id)}
                className={cn(
                  "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                  period === o.id
                    ? "bg-dh-sky/30 text-dh-deep shadow-sm dark:bg-dh-real dark:text-dh-light"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
          <label className="grid gap-0.5 text-[11px] text-muted-foreground">
            <span>기준 월</span>
            <input
              type="month"
              value={yearMonth}
              onChange={(e) => {
                if (e.target.value) setYearMonth(e.target.value);
              }}
              className="h-8 rounded-md border border-border bg-background px-2 text-sm text-foreground"
            />
          </label>
        </div>
      </div>

      <div className="grid gap-3 @lg/app:grid-cols-2">
        <InteractiveDonutCard
          title="퇴사인원 분석"
          subtitle={`${hint} · ${DIM_OPTS.find((d) => d.id === dim)?.label}`}
          fullRows={headcountRows}
          dimControls={
            <div className="inline-flex flex-wrap rounded-lg border border-border bg-muted/40 p-0.5">
              {DIM_OPTS.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setDim(o.id)}
                  className={cn(
                    "rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
                    dim === o.id
                      ? "bg-dh-sky/30 text-dh-deep shadow-sm dark:bg-dh-real dark:text-dh-light"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
          }
        />
        <InteractiveDonutCard
          title="퇴사사유 분석"
          subtitle={`${hint} · 사유별`}
          fullRows={reasonRows}
        />
      </div>
    </div>
  );
}
