"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Clock3, Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { seedWorkHours } from "@/data/hr-ops-seed";
import { useLocalList } from "@/hooks/use-local-list";
import {
  cellNum,
  cellStr,
  downloadRowsAsExcel,
  readExcelFile,
} from "@/lib/excel";
import { formatWon, sumByYear, yearMonthsForCompare } from "@/lib/period";
import type { WorkHoursRow } from "@/lib/types";
import { cn } from "@/lib/utils";

const TRACKS: Array<WorkHoursRow["jobTrack"]> = ["현장직", "별정직"];

export function WorkHoursPanel() {
  const { hydrated, items, replaceAll } = useLocalList(
    "hr-dashboard-workhours-v2",
    seedWorkHours,
  );
  const [selected, setSelected] =
    useState<Array<WorkHoursRow["jobTrack"]>>([...TRACKS]);
  const fileRef = useRef<HTMLInputElement>(null);
  const [periods, setPeriods] = useState<ReturnType<
    typeof yearMonthsForCompare
  > | null>(null);

  useEffect(() => {
    setPeriods(yearMonthsForCompare(new Date()));
  }, []);

  const filtered = useMemo(
    () => items.filter((r) => selected.includes(r.jobTrack)),
    [items, selected],
  );

  const summary = useMemo(() => {
    if (!periods) return null;
    const byYm = (ym: string) =>
      filtered
        .filter((r) => r.yearMonth === ym)
        .reduce((a, r) => a + r.hours, 0);
    return {
      currentMonth: byYm(periods.currentMonth),
      previousMonth: byYm(periods.previousMonth),
      currentYear: sumByYear(filtered, periods.currentYear, "hours"),
      previousYear: sumByYear(filtered, periods.previousYear, "hours"),
    };
  }, [filtered, periods]);

  async function onUpload(file?: File) {
    if (!file) return;
    const rows = await readExcelFile(file);
    const next: WorkHoursRow[] = rows
      .map((row, i) => ({
        id: `wh-up-${Date.now()}-${i}`,
        yearMonth: cellStr(row, "연월", "yearMonth", "년월").slice(0, 7),
        jobTrack: cellStr(row, "직군", "jobTrack") as WorkHoursRow["jobTrack"],
        hours: cellNum(row, "근무시간", "hours", "시간"),
      }))
      .filter(
        (r) => r.yearMonth && TRACKS.includes(r.jobTrack) && r.hours > 0,
      );
    if (next.length) replaceAll(next);
  }

  const cards =
    periods && summary
      ? [
          {
            label: `당월 (${periods.currentMonth})`,
            value: summary.currentMonth,
          },
          {
            label: `전월 (${periods.previousMonth})`,
            value: summary.previousMonth,
          },
          {
            label: `당년 누계 (${periods.currentYear})`,
            value: summary.currentYear,
          },
          {
            label: `전년 누계 (${periods.previousYear})`,
            value: summary.previousYear,
          },
        ]
      : [];

  return (
    <section className="flex h-full min-h-0 flex-col rounded-xl border border-border bg-card shadow-sm">
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-2 border-b border-border px-4 py-3 sm:px-5">
        <div>
          <h2 className="flex items-center gap-2 font-heading text-base font-semibold text-dh-deep dark:text-dh-light">
            <Clock3 className="size-4 text-dh-sea" />
            근무시간
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            현장직·별정직 · 당월/전월/당년·전년 누계 · 엑셀 연동
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              downloadRowsAsExcel(
                items.map((r) => ({
                  연월: r.yearMonth,
                  직군: r.jobTrack,
                  근무시간: r.hours,
                })),
                "근무시간.xlsx",
                "근무시간",
              )
            }
          >
            <Download data-icon="inline-start" />
            엑셀
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileRef.current?.click()}
          >
            <Upload data-icon="inline-start" />
            업로드
          </Button>
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
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col space-y-4 p-4 sm:p-5">
        <div className="flex flex-wrap gap-1.5">
          {TRACKS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() =>
                setSelected((prev) =>
                  prev.includes(t)
                    ? prev.filter((x) => x !== t)
                    : [...prev, t],
                )
              }
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition",
                selected.includes(t)
                  ? "bg-dh-real text-white"
                  : "bg-muted text-muted-foreground hover:text-dh-real",
              )}
            >
              {t}
            </button>
          ))}
        </div>

        {!hydrated || !periods || !summary ? (
          <p className="text-sm text-muted-foreground">불러오는 중…</p>
        ) : (
          <div className="grid gap-3 @md/app:grid-cols-2 @5xl/app:grid-cols-4">
            {cards.map((c) => (
              <div
                key={c.label}
                className="rounded-lg border border-border bg-muted/20 p-3"
              >
                <p className="text-xs text-muted-foreground">{c.label}</p>
                <p className="mt-1 font-heading text-xl font-semibold tabular-nums text-dh-deep dark:text-dh-light">
                  {formatWon(c.value)}
                  <span className="ml-0.5 text-xs font-normal text-muted-foreground">
                    시간
                  </span>
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
