"use client";

import Link from "next/link";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Download,
  Pencil,
  Upload,
} from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { TaskSubtasksPanel } from "@/components/task-subtasks-panel";
import { Button } from "@/components/ui/button";
import { useWeeklyPlans } from "@/hooks/use-weekly-plans";
import {
  cellDate,
  cellStr,
  downloadRowsAsExcel,
  readExcelFile,
} from "@/lib/excel";
import type { TaskPriority, TaskStatus, WeeklyTask } from "@/lib/types";
import {
  addDays,
  formatYmd,
  getMonday,
  weekIdFromDate,
  weekLabel,
} from "@/lib/week";
import { cn } from "@/lib/utils";

type RangeMode = "day" | "week" | "month";

function taskDate(task: WeeklyTask): string | null {
  if (task.dueDate) return task.dueDate;
  try {
    const idx = { 월: 0, 화: 1, 수: 2, 목: 3, 금: 4 }[task.dueDay];
    return formatYmd(addDays(new Date(`${task.weekId}T00:00:00`), idx));
  } catch {
    return null;
  }
}

export function ScheduleOverview() {
  const { hydrated, tasks, members, upsertTask } = useWeeklyPlans();
  const [mode, setMode] = useState<RangeMode>("week");
  const [anchor, setAnchor] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setAnchor(formatYmd(new Date()));
  }, []);

  const memberMap = useMemo(
    () => Object.fromEntries(members.map((m) => [m.id, m])),
    [members],
  );

  const range = useMemo(() => {
    if (!anchor) return { start: "", end: "", label: "" };
    const d = new Date(`${anchor}T00:00:00`);
    if (mode === "day") {
      return { start: anchor, end: anchor, label: `${anchor} (일 단위)` };
    }
    if (mode === "week") {
      const monday = getMonday(d);
      const friday = addDays(monday, 4);
      const weekId = weekIdFromDate(d);
      return {
        start: formatYmd(monday),
        end: formatYmd(friday),
        label: weekLabel(weekId),
      };
    }
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return {
      start: formatYmd(start),
      end: formatYmd(end),
      label: `${d.getFullYear()}년 ${d.getMonth() + 1}월`,
    };
  }, [anchor, mode]);

  const visible = useMemo(() => {
    return tasks
      .map((t) => ({ task: t, date: taskDate(t) }))
      .filter(
        (x) =>
          x.date &&
          x.date >= range.start &&
          x.date <= range.end,
      )
      .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
  }, [tasks, range.start, range.end]);

  function shift(dir: -1 | 1) {
    if (!anchor) return;
    const d = new Date(`${anchor}T00:00:00`);
    if (mode === "day") {
      setAnchor(formatYmd(addDays(d, dir)));
    } else if (mode === "week") {
      setAnchor(formatYmd(addDays(d, dir * 7)));
    } else {
      setAnchor(formatYmd(new Date(d.getFullYear(), d.getMonth() + dir, 1)));
    }
  }

  function exportExcel() {
    downloadRowsAsExcel(
      tasks.map((t) => ({
        주차시작: t.weekId,
        날짜: t.dueDate ?? "",
        요일: t.dueDay,
        업무: t.title,
        상세: t.description,
        담당자ID: t.ownerId,
        담당자: memberMap[t.ownerId]?.name ?? "",
        상태: t.status,
        우선순위: t.priority,
        카테고리: t.category,
      })),
      "주간업무계획.xlsx",
      "주간업무",
    );
  }

  async function importExcel(file?: File) {
    if (!file) return;
    const rows = await readExcelFile(file);
    const dayMap = ["일", "월", "화", "수", "목", "금", "토"] as const;
    for (const [i, row] of rows.entries()) {
      const title = cellStr(row, "업무", "title", "제목");
      if (!title) continue;
      const dueDate =
        cellDate(row, "날짜", "dueDate") ||
        formatYmd(new Date());
      const d = new Date(`${dueDate}T00:00:00`);
      const dueDay = (dayMap[d.getDay()] === "토" || dayMap[d.getDay()] === "일"
        ? "월"
        : dayMap[d.getDay()]) as WeeklyTask["dueDay"];
      const ownerName = cellStr(row, "담당자", "owner");
      const owner =
        members.find((m) => m.name === ownerName) ??
        members.find((m) => m.id === cellStr(row, "담당자ID", "ownerId")) ??
        members[0];
      const statusRaw = cellStr(row, "상태", "status") || "planned";
      const status = (
        ["planned", "in_progress", "done", "delayed"].includes(statusRaw)
          ? statusRaw
          : statusRaw.includes("완료")
            ? "done"
            : statusRaw.includes("지연")
              ? "delayed"
              : statusRaw.includes("진행")
                ? "in_progress"
                : "planned"
      ) as TaskStatus;
      upsertTask({
        id: `import-${Date.now()}-${i}`,
        weekId: weekIdFromDate(d),
        ownerId: owner?.id ?? "m1",
        title,
        description: cellStr(row, "상세", "description"),
        status,
        priority: (cellStr(row, "우선순위", "priority") ||
          "medium") as TaskPriority,
        dueDay,
        dueDate,
        category: cellStr(row, "카테고리", "category") || "운영",
        updatedAt: new Date().toISOString(),
      });
    }
  }

  if (!hydrated || !anchor) {
    return (
      <section className="flex h-full min-h-[12rem] items-center rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground shadow-sm">
        주간업무계획을 불러오는 중…
      </section>
    );
  }

  return (
    <section className="flex h-full min-h-0 flex-col rounded-xl border border-border bg-card shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
        <div>
          <h2 className="flex items-center gap-2 font-heading text-base font-semibold text-dh-deep dark:text-dh-light">
            <ClipboardList className="size-4 text-dh-sea" />
            주간업무계획
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            일·주·월 조회 · 웹 등록/수정 · 엑셀·구글시트(xlsx/csv) 연동
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg bg-muted p-1">
            {(
              [
                ["day", "일"],
                ["week", "주"],
                ["month", "월"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setMode(value)}
                className={cn(
                  "rounded-md px-3 py-1 text-xs font-medium transition",
                  mode === value
                    ? "bg-dh-real text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label} 단위
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={() => shift(-1)}>
              <ChevronLeft />
            </Button>
            <span className="min-w-[9rem] text-center text-xs font-medium sm:text-sm">
              {range.label}
            </span>
            <Button variant="outline" size="sm" onClick={() => shift(1)}>
              <ChevronRight />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAnchor(formatYmd(new Date()))}
            >
              오늘
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={exportExcel}>
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
              void importExcel(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <Link
            href="/weekly-plans"
            className="inline-flex h-7 items-center gap-1 rounded-lg border border-border bg-background px-2.5 text-[0.8rem] font-medium hover:bg-muted"
          >
            <Pencil className="size-3.5" />
            등록/수정
          </Link>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="gw-data-table w-full min-w-[560px] text-sm">
          <thead>
            <tr className="bg-muted/60 text-xs text-muted-foreground">
              <th className="px-4 py-2.5 font-medium sm:px-5">날짜</th>
              <th className="px-4 py-2.5 text-left font-medium">업무</th>
              <th className="px-4 py-2.5 font-medium">담당</th>
              <th className="px-4 py-2.5 font-medium">상태</th>
              <th className="px-4 py-2.5 font-medium sm:px-5">카테고리</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-5 py-12 text-center text-muted-foreground"
                >
                  이 기간에 등록된 업무가 없습니다.
                </td>
              </tr>
            ) : (
              visible.map(({ task, date }, i) => {
                const owner = memberMap[task.ownerId];
                const expanded = expandedId === task.id;
                const bottleneck =
                  task.subtasks?.filter((s) => s.status === "delayed").length ??
                  0;
                return (
                  <Fragment key={task.id}>
                    <tr
                      className={cn(
                        "border-t border-border/70",
                        i % 2 === 1 && "bg-muted/30",
                      )}
                    >
                      <td className="px-4 py-2.5 whitespace-nowrap text-muted-foreground sm:px-5">
                        {date}
                        <span className="ml-1 text-xs">({task.dueDay})</span>
                      </td>
                      <td className="px-4 py-2.5 text-left">
                        <button
                          type="button"
                          className="group flex w-full items-start gap-1 text-left"
                          onClick={() =>
                            setExpandedId(expanded ? null : task.id)
                          }
                          aria-expanded={expanded}
                        >
                          <ChevronDown
                            className={cn(
                              "mt-0.5 size-3.5 shrink-0 text-dh-sea transition",
                              expanded ? "rotate-0" : "-rotate-90",
                            )}
                          />
                          <span className="min-w-0">
                            <span className="font-medium text-dh-deep underline-offset-2 group-hover:underline">
                              {task.title}
                            </span>
                            {task.description ? (
                              <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                                {task.description}
                              </p>
                            ) : null}
                            {bottleneck > 0 ? (
                              <p className="mt-0.5 text-[11px] font-medium text-dh-red">
                                병목 {bottleneck}건 · 클릭하여 확인
                              </p>
                            ) : (
                              <p className="mt-0.5 text-[11px] text-muted-foreground">
                                세부업무 {(task.subtasks?.length ?? 0)}건 ·
                                클릭
                              </p>
                            )}
                          </span>
                        </button>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        {owner?.name ?? "미지정"}
                      </td>
                      <td className="px-4 py-2.5">
                        <StatusBadge status={task.status} />
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground sm:px-5">
                        {task.category}
                      </td>
                    </tr>
                    {expanded ? (
                      <tr className="border-t border-border/40 bg-muted/20">
                        <td colSpan={5} className="p-3">
                          <TaskSubtasksPanel
                            task={task}
                            onChange={upsertTask}
                          />
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
