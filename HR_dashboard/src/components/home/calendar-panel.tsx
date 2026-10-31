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

export function CalendarPanel() {
  const { hydrated, eventsOn, upsert, remove, members } = useCalendar();
  const [cursor, setCursor] = useState<Date | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<EventFormState | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingCreatedAt, setEditingCreatedAt] = useState<string | undefined>();
  const [detail, setDetail] = useState<CalendarEvent | null>(null);

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
            직접 입력한 일정만 표시 · 주간업무 기한은 Calendar 페이지에서 확인
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
                  {list.slice(0, 3).map((ev) => (
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
                  {list.length > 3 ? (
                    <li className="px-1 text-[10px] text-muted-foreground">
                      +{list.length - 3}
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
    </section>
  );
}
