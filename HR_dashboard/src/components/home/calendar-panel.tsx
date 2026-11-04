"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Plus,
} from "lucide-react";
import {
  EventDetailDialog,
  EventFormDialog,
  emptyEventForm,
  eventToForm,
  type EventFormState,
} from "@/components/calendar/event-form-dialog";
import { Button } from "@/components/ui/button";
import { useCalendar } from "@/hooks/use-calendar";
import { useLocalList } from "@/hooks/use-local-list";
import {
  collectContractAlerts,
  collectPermitAlerts,
  type DeadlineAlert,
} from "@/lib/deadline-alerts";
import {
  CONTRACTS_STORAGE_KEY,
  PERMITS_STORAGE_KEY,
  loadContracts,
  loadPermits,
} from "@/lib/hr-ops-storage";
import { formatDaysLeft } from "@/lib/period";
import type { CalendarEvent } from "@/lib/types";
import { addDays, formatYmd } from "@/lib/week";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function monthMatrix(year: number, month: number) {
  const first = new Date(year, month, 1);
  const start = addDays(first, -first.getDay());
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

function eventLabel(ev: CalendarEvent) {
  if (ev.allDay) return ev.title;
  return `${ev.startTime} ${ev.title}`;
}

function deadlineShortLabel(alert: DeadlineAlert) {
  if (alert.kind === "contract") {
    return alert.severity === "overdue" ? "계약 만료" : "계약 임박";
  }
  return alert.severity === "overdue" ? "인허가 만료" : "인허가 임박";
}

export function CalendarPanel() {
  const { hydrated, eventsOn, upsert, remove, members } = useCalendar("home");
  const contracts = useLocalList(CONTRACTS_STORAGE_KEY, loadContracts);
  const permits = useLocalList(PERMITS_STORAGE_KEY, loadPermits);
  const [cursor, setCursor] = useState<Date | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<EventFormState | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingCreatedAt, setEditingCreatedAt] = useState<string | undefined>();
  const [detail, setDetail] = useState<CalendarEvent | null>(null);
  const [deadlineDetail, setDeadlineDetail] = useState<DeadlineAlert | null>(
    null,
  );

  useEffect(() => {
    const now = new Date();
    setCursor(now);
    setSelected(formatYmd(now));
  }, []);

  const year = cursor?.getFullYear() ?? 2026;
  const month = cursor?.getMonth() ?? 0;
  const days = useMemo(() => monthMatrix(year, month), [year, month]);
  const memberMap = useMemo(
    () => Object.fromEntries(members.map((m) => [m.id, m])),
    [members],
  );
  const todayYmd = formatYmd(new Date());

  const deadlinesByDate = useMemo(() => {
    const now = new Date();
    const all = [
      ...collectContractAlerts(contracts.items, now),
      ...collectPermitAlerts(permits.items, now),
    ];
    const map = new Map<string, DeadlineAlert[]>();
    for (const a of all) {
      const list = map.get(a.dueDate) ?? [];
      list.push(a);
      map.set(a.dueDate, list);
    }
    return map;
  }, [contracts.items, permits.items]);

  function openCreate(date?: string) {
    const d = date ?? selected ?? todayYmd;
    setEditingId(null);
    setEditingCreatedAt(undefined);
    setForm(emptyEventForm(d, members[0]?.id ?? ""));
    setOpen(true);
  }

  function openEdit(ev: CalendarEvent) {
    setDetail(null);
    setEditingId(ev.id);
    setEditingCreatedAt(ev.createdAt);
    setForm(eventToForm(ev));
    setOpen(true);
  }

  function saveEvent(event: CalendarEvent) {
    upsert(event);
    setOpen(false);
  }

  if (!hydrated || !cursor || !selected) {
    return (
      <section className="flex h-full min-h-[28rem] items-center rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground shadow-sm">
        일정을 불러오는 중…
      </section>
    );
  }

  return (
    <section className="flex h-full min-h-[32rem] flex-col rounded-xl border border-border bg-card shadow-sm @lg/app:min-h-[36rem]">
      <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3 sm:px-5">
        <div>
          <h2 className="flex items-center gap-2 font-heading text-base font-semibold text-dh-deep dark:text-dh-light">
            <CalendarDays className="size-4 text-dh-sea" />
            Calendar · 일정 / 오늘 할 일
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            일정 ·{" "}
            <span className="text-dh-red">계약 만료/임박</span> ·{" "}
            <span className="text-amber-700 dark:text-amber-300">
              인허가 종료/임박
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => openCreate()}>
            <Plus data-icon="inline-start" />
            추가
          </Button>
          <Link
            href="/calendar"
            className="inline-flex items-center gap-1 text-xs font-medium text-dh-real hover:underline"
          >
            전체 보기
            <ExternalLink className="size-3" />
          </Link>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col p-3 sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            className="rounded p-1.5 hover:bg-muted"
            onClick={() => setCursor(new Date(year, month - 1, 1))}
            aria-label="이전 달"
          >
            <ChevronLeft className="size-4" />
          </button>
          <p className="text-base font-semibold text-dh-deep dark:text-dh-light">
            {year}. {month + 1}
          </p>
          <button
            type="button"
            className="rounded p-1.5 hover:bg-muted"
            onClick={() => setCursor(new Date(year, month + 1, 1))}
            aria-label="다음 달"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>

        <div className="grid grid-cols-7 text-center text-xs text-muted-foreground">
          {WEEKDAYS.map((d) => (
            <div key={d} className="py-1.5 font-medium">
              {d}
            </div>
          ))}
        </div>

        <div className="grid min-h-[26rem] flex-1 grid-cols-7 grid-rows-6 gap-px overflow-hidden rounded-md border border-border bg-border @lg/app:min-h-[28rem]">
          {days.map((d) => {
            const ymd = formatYmd(d);
            const inMonth = d.getMonth() === month;
            const isSelected = ymd === selected;
            const isToday = ymd === todayYmd;
            const list = eventsOn(ymd);
            const deadlines = deadlinesByDate.get(ymd) ?? [];
            const hasDeadline = deadlines.length > 0;
            const hasOverdue = deadlines.some((a) => a.severity === "overdue");
            const slots = 3;
            const deadlineShow = deadlines.slice(0, Math.min(2, slots));
            const eventShow = list.slice(
              0,
              Math.max(0, slots - deadlineShow.length),
            );
            const more =
              deadlines.length -
              deadlineShow.length +
              (list.length - eventShow.length);
            return (
              <div
                key={ymd}
                role="button"
                tabIndex={0}
                onClick={() => setSelected(ymd)}
                onDoubleClick={() => openCreate(ymd)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") setSelected(ymd);
                }}
                className={cn(
                  "flex min-h-0 flex-col bg-card p-1.5 text-left transition sm:p-2",
                  !inMonth && "bg-muted/40 text-muted-foreground/50",
                  isSelected && "ring-1 ring-inset ring-dh-real",
                  inMonth && "hover:bg-muted/30",
                  hasDeadline &&
                    inMonth &&
                    (hasOverdue
                      ? "bg-[#fceeee]/70 dark:bg-red-950/25"
                      : "bg-amber-50/80 dark:bg-amber-950/20"),
                )}
              >
                <span
                  className={cn(
                    "mb-1 inline-flex size-6 shrink-0 items-center justify-center rounded-full text-xs",
                    isToday && "bg-dh-real font-semibold text-white",
                    !isToday && inMonth && "font-medium text-foreground",
                  )}
                >
                  {d.getDate()}
                </span>
                <ul className="min-h-0 flex-1 space-y-0.5 overflow-hidden">
                  {deadlineShow.map((a) => (
                    <li key={a.id}>
                      <button
                        type="button"
                        title={`${a.title} · ${a.detail} · ${a.daysLeftLabel}`}
                        className={cn(
                          "flex w-full items-center gap-1 truncate rounded px-1 py-0.5 text-left text-[10px] font-semibold leading-snug sm:text-[11px]",
                          a.kind === "contract"
                            ? "bg-[#fceeee] text-dh-red hover:bg-red-100 dark:bg-red-950/40"
                            : "bg-amber-100 text-amber-800 hover:bg-amber-200/80 dark:bg-amber-950/40 dark:text-amber-200",
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelected(ymd);
                          setDeadlineDetail(a);
                        }}
                      >
                        <span className="truncate">
                          {deadlineShortLabel(a)}
                          {deadlines.length === 1
                            ? ` · ${a.daysLeftLabel}`
                            : ""}
                        </span>
                      </button>
                    </li>
                  ))}
                  {eventShow.map((ev) => (
                    <li key={ev.id}>
                      <button
                        type="button"
                        title={eventLabel(ev)}
                        className="flex w-full items-center gap-1 truncate rounded px-1 py-0.5 text-left text-[11px] leading-snug hover:bg-muted sm:text-xs"
                        style={{ color: ev.color || "#1f4889" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelected(ymd);
                          setDetail(ev);
                        }}
                      >
                        <span
                          className="size-1.5 shrink-0 rounded-full"
                          style={{ backgroundColor: ev.color || "#1f4889" }}
                        />
                        <span className="truncate font-medium text-foreground">
                          {eventLabel(ev)}
                        </span>
                      </button>
                    </li>
                  ))}
                  {more > 0 ? (
                    <li className="px-1 text-[10px] text-muted-foreground">
                      +{more}
                    </li>
                  ) : null}
                </ul>
              </div>
            );
          })}
        </div>
      </div>

      {form ? (
        <EventFormDialog
          open={open}
          onOpenChange={setOpen}
          members={members}
          form={form}
          onChange={setForm}
          onSave={saveEvent}
          editingId={editingId}
          editingCreatedAt={editingCreatedAt}
          title={editingId ? "일정 수정" : "새 일정"}
        />
      ) : null}

      <EventDetailDialog
        event={detail}
        ownerName={detail ? memberMap[detail.ownerId]?.name : undefined}
        open={!!detail}
        onOpenChange={(o) => {
          if (!o) setDetail(null);
        }}
        onEdit={() => detail && openEdit(detail)}
        onDelete={() => {
          if (!detail) return;
          if (window.confirm(`"${detail.title}" 일정을 삭제할까요?`)) {
            remove(detail.id);
            setDetail(null);
          }
        }}
      />

      {deadlineDetail ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setDeadlineDetail(null)}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-border bg-card p-4 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <p
              className={cn(
                "text-xs font-semibold",
                deadlineDetail.kind === "contract"
                  ? "text-dh-red"
                  : "text-amber-700 dark:text-amber-300",
              )}
            >
              {deadlineShortLabel(deadlineDetail)} ·{" "}
              {formatDaysLeft(deadlineDetail.daysLeft)}
            </p>
            <p className="mt-1 font-heading text-base font-semibold text-dh-deep dark:text-dh-light">
              {deadlineDetail.title}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {deadlineDetail.detail}
            </p>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeadlineDetail(null)}
              >
                닫기
              </Button>
              <Link
                href={deadlineDetail.href}
                className="inline-flex h-8 items-center rounded-md bg-dh-real px-3 text-xs font-medium text-white hover:opacity-90"
              >
                이력에서 보기
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
