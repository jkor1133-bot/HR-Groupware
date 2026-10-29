"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Plane, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { seedLeaves } from "@/data/hr-ops-seed";
import { useLocalList } from "@/hooks/use-local-list";
import { cellDate, cellNum, cellStr, readExcelFile } from "@/lib/excel";
import { overlapsRange, thisWeekRange } from "@/lib/period";
import type { LeaveRecord } from "@/lib/types";
import { formatYmd } from "@/lib/week";

export function LeavePanel() {
  const { hydrated, items, replaceAll } = useLocalList(
    "hr-dashboard-leaves-v1",
    seedLeaves,
  );
  const fileRef = useRef<HTMLInputElement>(null);
  const [today, setToday] = useState<string | null>(null);
  const [week, setWeek] = useState<{ start: string; end: string } | null>(null);

  useEffect(() => {
    setToday(formatYmd(new Date()));
    setWeek(thisWeekRange(new Date()));
  }, []);

  const todayList = useMemo(() => {
    if (!today) return [];
    return items.filter((l) =>
      overlapsRange(l.startDate, l.endDate, today, today),
    );
  }, [items, today]);

  const weekList = useMemo(() => {
    if (!week) return [];
    return items.filter((l) =>
      overlapsRange(l.startDate, l.endDate, week.start, week.end),
    );
  }, [items, week]);

  async function onUpload(file?: File) {
    if (!file) return;
    const rows = await readExcelFile(file);
    const next: LeaveRecord[] = rows
      .map((row, i) => ({
        id: `lv-up-${Date.now()}-${i}`,
        name: cellStr(row, "이름", "성명", "name"),
        department: cellStr(row, "부서", "department"),
        leaveType: cellStr(row, "구분", "연차유형", "leaveType") || "연차",
        startDate: cellDate(row, "시작일", "startDate", "시작"),
        endDate: cellDate(row, "종료일", "endDate", "종료"),
        days: cellNum(row, "일수", "days") || 1,
      }))
      .filter((r) => r.name && r.startDate && r.endDate);
    if (next.length) replaceAll(next);
  }

  return (
    <section className="flex h-full min-h-0 flex-col rounded-xl border border-border bg-card shadow-sm">
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-2 border-b border-border px-4 py-3 sm:px-5">
        <div>
          <h2 className="flex items-center gap-2 font-heading text-base font-semibold text-dh-deep dark:text-dh-light">
            <Plane className="size-4 text-dh-sea" />
            연차 신청 현황
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            ERP 연동 전 · 엑셀 업로드로 확인 (금일/금주)
          </p>
        </div>
        <div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileRef.current?.click()}
          >
            <Upload data-icon="inline-start" />
            엑셀 업로드
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

      {!hydrated || !today || !week ? (
        <p className="flex flex-1 items-center p-5 text-sm text-muted-foreground">
          불러오는 중…
        </p>
      ) : (
        <div className="grid min-h-0 flex-1 gap-4 p-4 @md/app:grid-cols-2 @sm/app:p-5">
          <div className="flex min-h-0 flex-col">
            <p className="mb-2 shrink-0 text-xs font-semibold text-dh-real">
              금일 ({today})
            </p>
            {todayList.length === 0 ? (
              <p className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
                오늘 연차 사용자 없음
              </p>
            ) : (
              <ul className="min-h-0 flex-1 space-y-1.5 overflow-y-auto">
                {todayList.map((l) => (
                  <li
                    key={l.id}
                    className="rounded-md border border-border bg-muted/20 px-3 py-2 text-sm"
                  >
                    <span className="font-medium">{l.name}</span>
                    <span className="text-muted-foreground">
                      {" "}
                      · {l.leaveType} · {l.department}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex min-h-0 flex-col">
            <p className="mb-2 shrink-0 text-xs font-semibold text-dh-real">
              금주 ({week.start} ~ {week.end})
            </p>
            {weekList.length === 0 ? (
              <p className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
                이번 주 연차 사용자 없음
              </p>
            ) : (
              <ul className="min-h-0 flex-1 space-y-1.5 overflow-y-auto">
                {weekList.map((l) => (
                  <li
                    key={l.id}
                    className="rounded-md border border-border bg-muted/20 px-3 py-2 text-sm"
                  >
                    <span className="font-medium">{l.name}</span>
                    <span className="text-muted-foreground">
                      {" "}
                      · {l.startDate}
                      {l.startDate !== l.endDate ? `~${l.endDate}` : ""} ·{" "}
                      {l.leaveType}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
