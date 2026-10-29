"use client";

import { Clock3, Wallet } from "lucide-react";
import {
  formatHours,
  formatMillion,
  formatRate,
  type PeriodSlice,
} from "@/lib/team-period-metrics";
import { cn } from "@/lib/utils";

type Unit = "million" | "hours";

function formatValue(n: number, unit: Unit) {
  return unit === "million" ? formatMillion(n) : formatHours(n);
}

function DiffLine({ value, unit }: { value: number; unit: Unit }) {
  const neg = value < 0;
  const pos = value > 0;
  return (
    <p
      className={cn(
        "mt-1 flex items-center gap-1 text-xs font-medium tabular-nums",
        neg && "text-dh-red",
        pos && "text-dh-real",
        !neg && !pos && "text-muted-foreground",
      )}
    >
      <span className="text-muted-foreground">차이</span>
      {neg ? "▼" : pos ? "▲" : "—"}
      <span>{formatValue(Math.abs(value), unit)}</span>
    </p>
  );
}

function SliceColumn({
  label,
  slice,
  unit,
}: {
  label: string;
  slice: PeriodSlice;
  unit: Unit;
}) {
  const negActual = slice.actual < 0;
  return (
    <div className="min-w-0 flex-1">
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 font-heading text-2xl font-bold tabular-nums tracking-tight sm:text-[1.65rem]",
          negActual ? "text-dh-red" : "text-dh-deep dark:text-dh-light",
        )}
      >
        {formatValue(slice.actual, unit)}
      </p>
      <p className="mt-2 text-xs text-muted-foreground">
        계획{" "}
        <span className="tabular-nums text-foreground/80">
          {formatValue(slice.plan, unit)}
        </span>
      </p>
      <DiffLine value={slice.diff} unit={unit} />
      <p className="mt-1 text-xs text-muted-foreground">
        달성률{" "}
        <span className="font-medium tabular-nums text-foreground">
          {formatRate(slice.rate)}
        </span>
      </p>
    </div>
  );
}

export function HrCompanyMetricCard({
  title,
  unit,
  unitLabel,
  month,
  ytd,
  tone = "blue",
}: {
  title: string;
  unit: Unit;
  unitLabel: string;
  month: PeriodSlice;
  ytd: PeriodSlice;
  tone?: "blue" | "violet";
}) {
  const Icon = unit === "million" ? Wallet : Clock3;
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/80 p-4 shadow-sm",
        tone === "blue" &&
          "bg-gradient-to-br from-[#eef6fc] to-[#f7fbfe] dark:from-dh-deep/40 dark:to-card",
        tone === "violet" &&
          "bg-gradient-to-br from-[#f3f0fb] to-[#faf8fd] dark:from-dh-deep/40 dark:to-card",
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "flex size-8 items-center justify-center rounded-lg",
              tone === "blue" && "bg-dh-sea/20 text-dh-real",
              tone === "violet" && "bg-violet-200/60 text-violet-800 dark:bg-violet-500/20 dark:text-violet-200",
            )}
          >
            <Icon className="size-4" />
          </span>
          <h3 className="font-heading text-sm font-semibold text-dh-deep dark:text-dh-light">
            {title}
          </h3>
        </div>
        <span className="shrink-0 text-[11px] text-muted-foreground">
          {unitLabel}
        </span>
      </div>
      <div className="flex gap-4">
        <SliceColumn label="당월 실적" slice={month} unit={unit} />
        <div className="w-px shrink-0 self-stretch bg-border/80" />
        <SliceColumn label="누계 실적" slice={ytd} unit={unit} />
      </div>
    </div>
  );
}
