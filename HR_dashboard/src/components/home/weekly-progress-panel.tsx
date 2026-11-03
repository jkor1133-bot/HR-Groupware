"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ClipboardCheck } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { useWeeklyPlans } from "@/hooks/use-weekly-plans";
import type { TaskStatus, WeeklyTask } from "@/lib/types";
import {
  addDays,
  formatYmd,
  getMonday,
  weekIdFromDate,
  weekLabel,
} from "@/lib/week";
import { cn } from "@/lib/utils";

function taskDate(task: WeeklyTask): string | null {
  if (task.dueDate) return task.dueDate;
  try {
    const idx = { 월: 0, 화: 1, 수: 2, 목: 3, 금: 4 }[task.dueDay];
    return formatYmd(addDays(new Date(`${task.weekId}T00:00:00`), idx));
  } catch {
    return null;
  }
}

const STATUS_ORDER: TaskStatus[] = [
  "delayed",
  "in_progress",
  "planned",
  "done",
];

export function WeeklyProgressPanel() {
  const { hydrated, tasks, members } = useWeeklyPlans();
  const [today, setToday] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<TaskStatus | null>(null);

  useEffect(() => {
    setToday(formatYmd(new Date()));
  }, []);

  const weekMeta = useMemo(() => {
    if (!today) return null;
    const d = new Date(`${today}T00:00:00`);
    const monday = getMonday(d);
    const friday = addDays(monday, 4);
    return {
      weekId: weekIdFromDate(d),
      start: formatYmd(monday),
      end: formatYmd(friday),
      label: weekLabel(weekIdFromDate(d)),
    };
  }, [today]);

  const memberMap = useMemo(
    () => Object.fromEntries(members.map((m) => [m.id, m.name])),
    [members],
  );

  const weekTasks = useMemo(() => {
    if (!weekMeta) return [];
    return tasks
      .filter((t) => {
        if (t.weekId === weekMeta.weekId) return true;
        const d = taskDate(t);
        return d != null && d >= weekMeta.start && d <= weekMeta.end;
      })
      .sort((a, b) => {
        const sa = STATUS_ORDER.indexOf(a.status);
        const sb = STATUS_ORDER.indexOf(b.status);
        if (sa !== sb) return sa - sb;
        return (taskDate(a) ?? "").localeCompare(taskDate(b) ?? "");
      });
  }, [tasks, weekMeta]);

  const summary = useMemo(() => {
    const counts: Record<TaskStatus, number> = {
      planned: 0,
      in_progress: 0,
      done: 0,
      delayed: 0,
    };
    for (const t of weekTasks) counts[t.status] += 1;
    const total = weekTasks.length;
    const doneRate =
      total > 0 ? Math.round((counts.done / total) * 1000) / 10 : 0;
    return { counts, total, doneRate };
  }, [weekTasks]);

  const filteredTasks = useMemo(() => {
    if (!statusFilter) return weekTasks;
    return weekTasks.filter((t) => t.status === statusFilter);
  }, [weekTasks, statusFilter]);

  const filterLabel =
    statusFilter === "delayed"
      ? "지연"
      : statusFilter === "in_progress"
        ? "진행"
        : statusFilter === "planned"
          ? "예정"
          : statusFilter === "done"
            ? "완료"
            : null;

  return (
    <section className="flex h-full min-h-[32rem] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm @lg/app:min-h-[36rem]">
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-2 border-b border-border px-4 py-3 sm:px-5">
        <div>
          <h2 className="flex items-center gap-2 font-heading text-base font-semibold text-dh-deep dark:text-dh-light">
            <ClipboardCheck className="size-4 text-dh-sea" />
            이번 주 업무 진행
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {weekMeta ? weekMeta.label : "주간업무계획 기준"}
            {weekTasks.length > 4 ? " · 스크롤로 전체 확인" : ""}
          </p>
        </div>
        <Link
          href="/weekly-plans"
          className="inline-flex h-8 items-center rounded-md border border-border bg-background px-2.5 text-xs font-medium hover:bg-muted"
        >
          전체 보기
        </Link>
      </div>

      {!hydrated || !weekMeta ? (
        <p className="flex flex-1 items-center p-5 text-sm text-muted-foreground">
          불러오는 중…
        </p>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {(
              [
                {
                  key: null,
                  label: "전체",
                  value: summary.total,
                  tone: "bg-white",
                  active:
                    "border-dh-sea bg-dh-sky/20 ring-1 ring-dh-sea/30",
                },
                {
                  key: "planned" as const,
                  label: "예정",
                  value: summary.counts.planned,
                  tone: "bg-slate-100",
                  active:
                    "border-slate-400 bg-slate-200 ring-1 ring-slate-400/40",
                },
                {
                  key: "in_progress" as const,
                  label: "진행",
                  value: summary.counts.in_progress,
                  tone: "bg-amber-50",
                  active:
                    "border-amber-400 bg-amber-100 ring-1 ring-amber-400/40",
                },
                {
                  key: "done" as const,
                  label: "완료",
                  value: summary.counts.done,
                  tone: "bg-emerald-50",
                  active:
                    "border-emerald-500 bg-emerald-100 ring-1 ring-emerald-500/30",
                },
                {
                  key: "delayed" as const,
                  label: "지연",
                  value: summary.counts.delayed,
                  tone: "bg-[#fceeee]",
                  active:
                    "border-dh-red bg-[#f8dede] ring-1 ring-dh-red/30",
                },
              ] as const
            ).map((item) => {
              const active = statusFilter === item.key;
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => setStatusFilter(item.key)}
                  aria-pressed={active}
                  title={`${item.label} 업무 보기`}
                  className={cn(
                    "rounded-xl border px-2.5 py-3 text-center shadow-sm transition",
                    active
                      ? item.active
                      : cn("border-border", item.tone, "hover:brightness-[0.98]"),
                  )}
                >
                  <p className="text-[11px] text-muted-foreground">
                    {item.label}
                  </p>
                  <p className="mt-0.5 font-heading text-xl font-semibold tabular-nums text-dh-deep dark:text-dh-light">
                    {item.value}
                  </p>
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>
              {filterLabel
                ? `${filterLabel} ${filteredTasks.length}건`
                : `총 ${summary.total}건`}
            </span>
            <span className="font-medium text-foreground">
              완료율 {summary.doneRate}%
            </span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-dh-real transition-all"
              style={{ width: `${Math.min(100, summary.doneRate)}%` }}
            />
          </div>

          <ul className="mt-3 space-y-1.5">
            {weekTasks.length === 0 ? (
              <li className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
                이번 주 등록된 업무가 없습니다.
              </li>
            ) : filteredTasks.length === 0 ? (
              <li className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
                {filterLabel} 상태 업무가 없습니다. 카드를 다시 누르면 전체
                목록으로 돌아갑니다.
              </li>
            ) : (
              filteredTasks.map((t) => (
                <li
                  key={t.id}
                  className={cn(
                    "flex items-start justify-between gap-2 rounded-lg border border-border px-2.5 py-2",
                    t.status === "delayed" && "border-dh-red/40 bg-[#fceeee]/40",
                  )}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {t.title}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {memberMap[t.ownerId] ?? "미지정"}
                      {taskDate(t) ? ` · ${taskDate(t)}` : ""}
                      {t.category ? ` · ${t.category}` : ""}
                    </p>
                  </div>
                  <StatusBadge status={t.status} />
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </section>
  );
}
