"use client";

import { useMemo, useState } from "react";
import {
  buildPlanDiffRows,
  buildYoYRows,
  formatHours,
  formatMillion,
  formatRate,
  periodLabel,
  type PeriodMode,
} from "@/lib/team-period-metrics";
import type { TeamPeriodMetric } from "@/lib/types";
import { cn } from "@/lib/utils";

type Unit = "million" | "hours";

function fmt(n: number, unit: Unit) {
  return unit === "million" ? formatMillion(n) : formatHours(n);
}

function DiffCell({ value, unit }: { value: number; unit: Unit }) {
  const neg = value < 0;
  const pos = value > 0;
  return (
    <td
      className={cn(
        "px-2 py-1.5 text-center tabular-nums",
        neg && "text-dh-red",
        pos && "text-dh-real",
      )}
    >
      {fmt(value, unit)}
    </td>
  );
}

function RateCell({ rate }: { rate: number | null }) {
  const neg = rate !== null && rate < 0;
  return (
    <td
      className={cn(
        "px-2 py-1.5 text-center tabular-nums",
        neg && "text-dh-red",
      )}
    >
      {formatRate(rate)}
    </td>
  );
}

function ModeTabs({
  mode,
  onChange,
}: {
  mode: PeriodMode;
  onChange: (m: PeriodMode) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5">
      {(
        [
          ["month", "당월"],
          ["ytd", "누계"],
        ] as const
      ).map(([id, label]) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
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
  );
}

function PlanDiffTable({
  rows,
  unit,
}: {
  rows: ReturnType<typeof buildPlanDiffRows>;
  unit: Unit;
}) {
  const totals = rows.reduce(
    (a, r) => ({
      plan: a.plan + r.plan,
      actual: a.actual + r.actual,
      diff: a.diff + r.diff,
    }),
    { plan: 0, actual: 0, diff: 0 },
  );
  const totalRate =
    totals.plan === 0
      ? null
      : Math.round((totals.actual / totals.plan) * 1000) / 10;

  return (
    <div className="overflow-x-auto">
      <table className="gw-data-table w-full min-w-[420px] text-xs">
        <thead>
          <tr className="border-b border-border bg-muted/50 text-muted-foreground">
            <th className="px-2 py-2 font-medium">구분</th>
            <th className="px-2 py-2 font-medium">계획</th>
            <th className="px-2 py-2 font-medium">실적</th>
            <th className="px-2 py-2 font-medium">차이</th>
            <th className="px-2 py-2 font-medium">달성률</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.team} className="border-b border-border/60">
              <td className="px-2 py-1.5 text-foreground">{r.team}</td>
              <td className="px-2 py-1.5 tabular-nums">
                {fmt(r.plan, unit)}
              </td>
              <td className="px-2 py-1.5 tabular-nums">
                {fmt(r.actual, unit)}
              </td>
              <DiffCell value={r.diff} unit={unit} />
              <RateCell rate={r.rate} />
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-border font-semibold text-dh-deep dark:text-dh-light">
            <td className="px-2 py-2">합계</td>
            <td className="px-2 py-2 tabular-nums">
              {fmt(totals.plan, unit)}
            </td>
            <td className="px-2 py-2 tabular-nums">
              {fmt(totals.actual, unit)}
            </td>
            <DiffCell value={totals.diff} unit={unit} />
            <RateCell rate={totalRate} />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function YoYTable({
  rows,
  unit,
}: {
  rows: ReturnType<typeof buildYoYRows>;
  unit: Unit;
}) {
  const totals = rows.reduce(
    (a, r) => ({
      prev: a.prev + r.prev,
      curr: a.curr + r.curr,
      diff: a.diff + r.diff,
    }),
    { prev: 0, curr: 0, diff: 0 },
  );
  const totalRate =
    totals.prev === 0
      ? null
      : Math.round(((totals.curr - totals.prev) / totals.prev) * 1000) / 10;

  return (
    <div className="overflow-x-auto">
      <table className="gw-data-table w-full min-w-[420px] text-xs">
        <thead>
          <tr className="border-b border-border bg-muted/50 text-muted-foreground">
            <th className="px-2 py-2 font-medium">구분</th>
            <th className="px-2 py-2 font-medium">전년실적</th>
            <th className="px-2 py-2 font-medium">금년실적</th>
            <th className="px-2 py-2 font-medium">차이</th>
            <th className="px-2 py-2 font-medium">증감률</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.team} className="border-b border-border/60">
              <td className="px-2 py-1.5 text-foreground">{r.team}</td>
              <td className="px-2 py-1.5 tabular-nums">
                {fmt(r.prev, unit)}
              </td>
              <td className="px-2 py-1.5 tabular-nums">
                {fmt(r.curr, unit)}
              </td>
              <DiffCell value={r.diff} unit={unit} />
              <RateCell rate={r.rate} />
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-border font-semibold text-dh-deep dark:text-dh-light">
            <td className="px-2 py-2">합계</td>
            <td className="px-2 py-2 tabular-nums">
              {fmt(totals.prev, unit)}
            </td>
            <td className="px-2 py-2 tabular-nums">
              {fmt(totals.curr, unit)}
            </td>
            <DiffCell value={totals.diff} unit={unit} />
            <RateCell rate={totalRate} />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function CompareCard({
  eyebrow,
  title,
  mode,
  onModeChange,
  unitLabel,
  asOf,
  children,
}: {
  eyebrow: string;
  title: string;
  mode: PeriodMode;
  onModeChange: (m: PeriodMode) => void;
  unitLabel: string;
  asOf?: Date;
  children: React.ReactNode;
}) {
  return (
    <section className="flex min-h-0 flex-col rounded-xl border border-border bg-card shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <p className="text-[11px] text-muted-foreground">{eyebrow}</p>
          <h3 className="font-heading text-base font-semibold text-dh-deep dark:text-dh-light">
            {title}
          </h3>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
            <span>{periodLabel(mode, asOf)}</span>
            <span>{unitLabel}</span>
          </div>
        </div>
        <ModeTabs mode={mode} onChange={onModeChange} />
      </div>
      <div className="max-h-[320px] overflow-auto p-2">{children}</div>
    </section>
  );
}

export function HrPeriodCompareBlock({
  topic,
  unit,
  unitLabel,
  rows,
  asOf,
}: {
  topic: string;
  unit: Unit;
  unitLabel: string;
  rows: TeamPeriodMetric[];
  /** 기준월 (미지정 시 오늘) */
  asOf?: Date;
}) {
  const [mode, setMode] = useState<PeriodMode>("month");
  const asOfDate = asOf ?? new Date();

  const planRows = useMemo(
    () => buildPlanDiffRows(rows, mode, asOfDate),
    [rows, mode, asOfDate],
  );
  const yoyRows = useMemo(
    () => buildYoYRows(rows, mode, asOfDate),
    [rows, mode, asOfDate],
  );

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-dh-deep dark:text-dh-light">
        {topic}
      </p>
      <div className="grid gap-3 @md/app:grid-cols-2">
        <CompareCard
          eyebrow="팀별 실적비교"
          title="계획대비 차이"
          mode={mode}
          onModeChange={setMode}
          unitLabel={unitLabel}
          asOf={asOfDate}
        >
          <PlanDiffTable rows={planRows} unit={unit} />
        </CompareCard>
        <CompareCard
          eyebrow="팀별 실적비교"
          title="전년 실적비교"
          mode={mode}
          onModeChange={setMode}
          unitLabel={unitLabel}
          asOf={asOfDate}
        >
          <YoYTable rows={yoyRows} unit={unit} />
        </CompareCard>
      </div>
    </div>
  );
}
