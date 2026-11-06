"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  buildPlanDiffRows,
  buildYoYRows,
  formatHours,
  formatMillion,
  formatRate,
  periodLabel,
  type PeriodMode,
  type PlanDiffRow,
  type YoYRow,
} from "@/lib/team-period-metrics";
import type { OrgTeam, TeamPeriodMetric } from "@/lib/types";
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
        "px-2.5 py-2 text-center tabular-nums",
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
        "px-2.5 py-2 text-center tabular-nums",
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
            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
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

function FragmentRows({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function useOpenSet() {
  const [open, setOpen] = useState<Set<string>>(() => new Set());
  function toggle(key: string) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }
  return { open, toggle };
}

function ExpandLabel({
  expanded,
  label,
  onToggle,
  className,
}: {
  expanded: boolean;
  label: string;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "inline-flex items-center gap-1 font-medium hover:text-dh-real",
        className,
      )}
    >
      {expanded ? (
        <ChevronDown className="size-4 shrink-0" />
      ) : (
        <ChevronRight className="size-4 shrink-0" />
      )}
      {label}
    </button>
  );
}

function PlanDiffTable({
  rows,
  unit,
  showHourDetails,
}: {
  rows: PlanDiffRow[];
  unit: Unit;
  showHourDetails?: boolean;
}) {
  const { open, toggle } = useOpenSet();

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
      <table className="gw-data-table w-full min-w-[420px] text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50 text-muted-foreground">
            <th className="px-2.5 py-2.5 font-medium">구분</th>
            <th className="px-2.5 py-2.5 font-medium">계획</th>
            <th className="px-2.5 py-2.5 font-medium">실적</th>
            <th className="px-2.5 py-2.5 font-medium">차이</th>
            <th className="px-2.5 py-2.5 font-medium">달성률</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const hasParts = r.parts.length > 0;
            const hasTeamDetails =
              showHourDetails && !hasParts && r.details.length > 0;
            const expandable = hasParts || hasTeamDetails;
            const teamOpen = open.has(r.team);
            return (
              <FragmentRows key={r.team}>
                <tr className="border-b border-border/60">
                  <td className="px-2.5 py-2 text-foreground">
                    {expandable ? (
                      <ExpandLabel
                        expanded={teamOpen}
                        label={r.team}
                        onToggle={() => toggle(r.team)}
                      />
                    ) : (
                      r.team
                    )}
                  </td>
                  <td className="px-2.5 py-2 tabular-nums">
                    {fmt(r.plan, unit)}
                  </td>
                  <td className="px-2.5 py-2 tabular-nums">
                    {fmt(r.actual, unit)}
                  </td>
                  <DiffCell value={r.diff} unit={unit} />
                  <RateCell rate={r.rate} />
                </tr>
                {teamOpen && hasTeamDetails
                  ? r.details.map((d) => (
                      <tr
                        key={`${r.team}-${d.key}`}
                        className="border-b border-border/30 bg-muted/15"
                      >
                        <td className="px-2.5 py-1.5 pl-8 text-muted-foreground">
                          {d.label}
                        </td>
                        <td className="px-2.5 py-1.5 tabular-nums">
                          {fmt(d.plan, unit)}
                        </td>
                        <td className="px-2.5 py-1.5 tabular-nums">
                          {fmt(d.actual, unit)}
                        </td>
                        <DiffCell value={d.diff} unit={unit} />
                        <RateCell rate={d.rate} />
                      </tr>
                    ))
                  : null}
                {teamOpen && hasParts
                  ? r.parts.map((p) => {
                      const partKey = `${r.team}::${p.part}`;
                      const partOpen = open.has(partKey);
                      const canExpandPart =
                        showHourDetails && p.details.length > 0;
                      return (
                        <FragmentRows key={partKey}>
                          <tr className="border-b border-border/40 bg-muted/20">
                            <td className="px-2.5 py-2 pl-5 text-muted-foreground">
                              {canExpandPart ? (
                                <ExpandLabel
                                  expanded={partOpen}
                                  label={p.part}
                                  onToggle={() => toggle(partKey)}
                                  className="font-normal"
                                />
                              ) : (
                                <span className="pl-4">{p.part}</span>
                              )}
                            </td>
                            <td className="px-2.5 py-2 tabular-nums">
                              {fmt(p.plan, unit)}
                            </td>
                            <td className="px-2.5 py-2 tabular-nums">
                              {fmt(p.actual, unit)}
                            </td>
                            <DiffCell value={p.diff} unit={unit} />
                            <RateCell rate={p.rate} />
                          </tr>
                          {partOpen && canExpandPart
                            ? p.details.map((d) => (
                                <tr
                                  key={`${partKey}-${d.key}`}
                                  className="border-b border-border/30 bg-muted/10"
                                >
                                  <td className="px-2.5 py-1.5 pl-12 text-muted-foreground">
                                    {d.label}
                                  </td>
                                  <td className="px-2.5 py-1.5 tabular-nums">
                                    {fmt(d.plan, unit)}
                                  </td>
                                  <td className="px-2.5 py-1.5 tabular-nums">
                                    {fmt(d.actual, unit)}
                                  </td>
                                  <DiffCell value={d.diff} unit={unit} />
                                  <RateCell rate={d.rate} />
                                </tr>
                              ))
                            : null}
                        </FragmentRows>
                      );
                    })
                  : null}
              </FragmentRows>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t border-border font-semibold text-dh-deep dark:text-dh-light">
            <td className="px-2.5 py-2.5">합계</td>
            <td className="px-2.5 py-2.5 tabular-nums">
              {fmt(totals.plan, unit)}
            </td>
            <td className="px-2.5 py-2.5 tabular-nums">
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
  showHourDetails,
}: {
  rows: YoYRow[];
  unit: Unit;
  showHourDetails?: boolean;
}) {
  const { open, toggle } = useOpenSet();

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
      <table className="gw-data-table w-full min-w-[420px] text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50 text-muted-foreground">
            <th className="px-2.5 py-2.5 font-medium">구분</th>
            <th className="px-2.5 py-2.5 font-medium">전년실적</th>
            <th className="px-2.5 py-2.5 font-medium">금년실적</th>
            <th className="px-2.5 py-2.5 font-medium">차이</th>
            <th className="px-2.5 py-2.5 font-medium">증감률</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const hasParts = r.parts.length > 0;
            const hasTeamDetails =
              showHourDetails && !hasParts && r.details.length > 0;
            const expandable = hasParts || hasTeamDetails;
            const teamOpen = open.has(r.team);
            return (
              <FragmentRows key={r.team}>
                <tr className="border-b border-border/60">
                  <td className="px-2.5 py-2 text-foreground">
                    {expandable ? (
                      <ExpandLabel
                        expanded={teamOpen}
                        label={r.team}
                        onToggle={() => toggle(r.team)}
                      />
                    ) : (
                      r.team
                    )}
                  </td>
                  <td className="px-2.5 py-2 tabular-nums">
                    {fmt(r.prev, unit)}
                  </td>
                  <td className="px-2.5 py-2 tabular-nums">
                    {fmt(r.curr, unit)}
                  </td>
                  <DiffCell value={r.diff} unit={unit} />
                  <RateCell rate={r.rate} />
                </tr>
                {teamOpen && hasTeamDetails
                  ? r.details.map((d) => (
                      <tr
                        key={`${r.team}-${d.key}`}
                        className="border-b border-border/30 bg-muted/15"
                      >
                        <td className="px-2.5 py-1.5 pl-8 text-muted-foreground">
                          {d.label}
                        </td>
                        <td className="px-2.5 py-1.5 tabular-nums">
                          {fmt(d.prev, unit)}
                        </td>
                        <td className="px-2.5 py-1.5 tabular-nums">
                          {fmt(d.curr, unit)}
                        </td>
                        <DiffCell value={d.diff} unit={unit} />
                        <RateCell rate={d.rate} />
                      </tr>
                    ))
                  : null}
                {teamOpen && hasParts
                  ? r.parts.map((p) => {
                      const partKey = `${r.team}::${p.part}`;
                      const partOpen = open.has(partKey);
                      const canExpandPart =
                        showHourDetails && p.details.length > 0;
                      return (
                        <FragmentRows key={partKey}>
                          <tr className="border-b border-border/40 bg-muted/20">
                            <td className="px-2.5 py-2 pl-5 text-muted-foreground">
                              {canExpandPart ? (
                                <ExpandLabel
                                  expanded={partOpen}
                                  label={p.part}
                                  onToggle={() => toggle(partKey)}
                                  className="font-normal"
                                />
                              ) : (
                                <span className="pl-4">{p.part}</span>
                              )}
                            </td>
                            <td className="px-2.5 py-2 tabular-nums">
                              {fmt(p.prev, unit)}
                            </td>
                            <td className="px-2.5 py-2 tabular-nums">
                              {fmt(p.curr, unit)}
                            </td>
                            <DiffCell value={p.diff} unit={unit} />
                            <RateCell rate={p.rate} />
                          </tr>
                          {partOpen && canExpandPart
                            ? p.details.map((d) => (
                                <tr
                                  key={`${partKey}-${d.key}`}
                                  className="border-b border-border/30 bg-muted/10"
                                >
                                  <td className="px-2.5 py-1.5 pl-12 text-muted-foreground">
                                    {d.label}
                                  </td>
                                  <td className="px-2.5 py-1.5 tabular-nums">
                                    {fmt(d.prev, unit)}
                                  </td>
                                  <td className="px-2.5 py-1.5 tabular-nums">
                                    {fmt(d.curr, unit)}
                                  </td>
                                  <DiffCell value={d.diff} unit={unit} />
                                  <RateCell rate={d.rate} />
                                </tr>
                              ))
                            : null}
                        </FragmentRows>
                      );
                    })
                  : null}
              </FragmentRows>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t border-border font-semibold text-dh-deep dark:text-dh-light">
            <td className="px-2.5 py-2.5">합계</td>
            <td className="px-2.5 py-2.5 tabular-nums">
              {fmt(totals.prev, unit)}
            </td>
            <td className="px-2.5 py-2.5 tabular-nums">
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
          <p className="text-sm text-muted-foreground">{eyebrow}</p>
          <h3 className="font-heading text-lg font-semibold text-dh-deep dark:text-dh-light">
            {title}
          </h3>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-sm text-muted-foreground">
            <span>{periodLabel(mode, asOf)}</span>
            <span>{unitLabel}</span>
          </div>
        </div>
        <ModeTabs mode={mode} onChange={onModeChange} />
      </div>
      <div className="max-h-[420px] overflow-auto p-2">{children}</div>
    </section>
  );
}

export function HrPeriodCompareBlock({
  topic,
  unit,
  unitLabel,
  rows,
  asOf,
  teams,
}: {
  topic: string;
  unit: Unit;
  unitLabel: string;
  rows: TeamPeriodMetric[];
  asOf?: Date;
  teams?: readonly OrgTeam[];
}) {
  const [mode, setMode] = useState<PeriodMode>("month");
  const asOfDate = asOf ?? new Date();
  const showHourDetails = unit === "hours";

  const planRows = useMemo(
    () =>
      buildPlanDiffRows(rows, mode, asOfDate, teams, {
        hourDetails: showHourDetails,
      }),
    [rows, mode, asOfDate, teams, showHourDetails],
  );
  const yoyRows = useMemo(
    () =>
      buildYoYRows(rows, mode, asOfDate, teams, {
        hourDetails: showHourDetails,
      }),
    [rows, mode, asOfDate, teams, showHourDetails],
  );

  return (
    <div className="space-y-2">
      <p className="text-base font-semibold text-dh-deep dark:text-dh-light">
        {topic}
      </p>
      <div className="grid gap-3 @md/app:grid-cols-2">
        <CompareCard
          eyebrow={showHourDetails ? "팀·파트·시간유형" : "팀·파트 실적비교"}
          title="계획대비 차이"
          mode={mode}
          onModeChange={setMode}
          unitLabel={unitLabel}
          asOf={asOfDate}
        >
          <PlanDiffTable
            rows={planRows}
            unit={unit}
            showHourDetails={showHourDetails}
          />
        </CompareCard>
        <CompareCard
          eyebrow={showHourDetails ? "팀·파트·시간유형" : "팀·파트 실적비교"}
          title="전년 실적비교"
          mode={mode}
          onModeChange={setMode}
          unitLabel={unitLabel}
          asOf={asOfDate}
        >
          <YoYTable
            rows={yoyRows}
            unit={unit}
            showHourDetails={showHourDetails}
          />
        </CompareCard>
      </div>
    </div>
  );
}
