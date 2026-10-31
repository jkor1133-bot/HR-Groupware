"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Paperclip,
  Plus,
  Trash2,
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
import { useWeeklyPlans } from "@/hooks/use-weekly-plans";
import type { CalendarEvent, TeamMember } from "@/lib/types";
import {
  isWeeklyCalendarEvent,
  weeklyTasksToCalendarEvents,
} from "@/lib/weekly-calendar";
import { addDays, formatYmd } from "@/lib/week";
import { cn } from "@/lib/utils";
import Link from "next/link";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
type ViewMode = "day" | "week" | "month";

function formatSelectedLabel(ymd: string) {
  const d = new Date(`${ymd}T00:00:00`);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAYS[d.getDay()]})`;
}

function eventChipLabel(ev: CalendarEvent) {
  if (isWeeklyCalendarEvent(ev)) return `[주간] ${ev.title}`;
  if (ev.allDay) return ev.title;
  return `${ev.startTime} ${ev.title}`;
}

function startOfWeekSunday(d: Date) {
  return addDays(d, -d.getDay());
}

function monthMatrix(year: number, month: number) {
  const first = new Date(year, month, 1);
  const start = startOfWeekSunday(first);
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

function parseYmd(ymd: string) {
  return new Date(`${ymd}T00:00:00`);
}

function headerLabel(mode: ViewMode, cursor: Date) {
  const y = cursor.getFullYear();
  const m = cursor.getMonth() + 1;
  const d = cursor.getDate();
  if (mode === "month") return `${y}년 ${m}월`;
  if (mode === "day") return `${y}년 ${m}월 ${d}일`;
  const sun = startOfWeekSunday(cursor);
  const sat = addDays(sun, 6);
  return `${sun.getFullYear()}년 ${sun.getMonth() + 1}월 ${sun.getDate()}일 – ${sat.getMonth() + 1}월 ${sat.getDate()}일`;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function CalendarPageView() {
  const { hydrated, eventsOn, upsert, remove, members } = useCalendar();
  const { hydrated: weeklyHydrated, tasks } = useWeeklyPlans();
  const [mode, setMode] = useState<ViewMode>("month");
  const [cursor, setCursor] = useState<Date | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<EventFormState | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingCreatedAt, setEditingCreatedAt] = useState<string | undefined>();

  const [detail, setDetail] = useState<CalendarEvent | null>(null);

  useEffect(() => {
    const now = new Date();
    setCursor(now);
    setSelected(formatYmd(now));
  }, []);

  const memberMap = useMemo(
    () => Object.fromEntries(members.map((m) => [m.id, m])),
    [members],
  );

  const weeklyEvents = useMemo(
    () => weeklyTasksToCalendarEvents(tasks),
    [tasks],
  );
  const weeklyCount = weeklyEvents.length;

  /** 직접 입력 + 주간업무 기한 (Calendar 페이지 전용) */
  const itemsOn = useCallback(
    (date: string) => {
      const fromCalendar = eventsOn(date);
      const fromWeekly = weeklyEvents.filter((e) => {
        const end = e.endDate || e.date;
        return e.date <= date && end >= date;
      });
      return [...fromCalendar, ...fromWeekly].sort((a, b) => {
        const aw = isWeeklyCalendarEvent(a) ? 1 : 0;
        const bw = isWeeklyCalendarEvent(b) ? 1 : 0;
        if (aw !== bw) return aw - bw;
        return a.startTime.localeCompare(b.startTime);
      });
    },
    [eventsOn, weeklyEvents],
  );

  const year = cursor?.getFullYear() ?? 2026;
  const month = cursor?.getMonth() ?? 0;
  const monthDays = useMemo(
    () => monthMatrix(year, month),
    [year, month],
  );

  const weekDays = useMemo(() => {
    if (!cursor) return [];
    const sun = startOfWeekSunday(cursor);
    return Array.from({ length: 7 }, (_, i) => addDays(sun, i));
  }, [cursor]);

  function shift(dir: -1 | 1) {
    if (!cursor) return;
    if (mode === "month") {
      setCursor(new Date(year, month + dir, 1));
    } else if (mode === "week") {
      const next = addDays(cursor, dir * 7);
      setCursor(next);
      setSelected(formatYmd(next));
    } else {
      const next = addDays(cursor, dir);
      setCursor(next);
      setSelected(formatYmd(next));
    }
  }

  function goToday() {
    const now = new Date();
    setCursor(now);
    setSelected(formatYmd(now));
  }

  function openCreate(date?: string) {
    const d = date ?? selected ?? formatYmd(new Date());
    setEditingId(null);
    setEditingCreatedAt(undefined);
    setForm(emptyEventForm(d, members[0]?.id ?? ""));
    setFormOpen(true);
  }

  function openEdit(ev: CalendarEvent) {
    if (isWeeklyCalendarEvent(ev)) return;
    setDetail(null);
    setEditingId(ev.id);
    setEditingCreatedAt(ev.createdAt);
    setForm(eventToForm(ev));
    setFormOpen(true);
  }

  function handleSave(event: CalendarEvent) {
    upsert({ ...event, source: "calendar" });
    setFormOpen(false);
  }

  if (!hydrated || !weeklyHydrated || !cursor || !selected) {
    return (
      <div className="flex min-h-[24rem] items-center justify-center rounded-xl border border-border bg-card text-sm text-muted-foreground shadow-sm">
        캘린더를 불러오는 중…
      </div>
    );
  }

  const dayEvents = itemsOn(selected);
  const detailIsWeekly = detail ? isWeeklyCalendarEvent(detail) : false;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-heading text-xl font-semibold text-dh-deep dark:text-dh-light">
            <CalendarDays className="size-5 text-dh-sea" />
            Calendar
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            직접 입력 일정과 주간업무 기한을 함께 표시합니다. 주간업무는
            주황으로 구분되며, 홈 캘린더에는 직접 입력만 나갑니다.
          </p>
          <div className="mt-1.5 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: "#1f4889" }}
              />
              직접 입력
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: "#b45309" }}
              />
              주간업무 기한 ({weeklyCount}건)
            </span>
          </div>
        </div>
        <Button onClick={() => openCreate()}>
          <Plus data-icon="inline-start" />
          새 일정
        </Button>
      </header>

      <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2.5 sm:px-4">
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="rounded-md p-1.5 hover:bg-muted"
              onClick={() => shift(-1)}
              aria-label="이전"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              className="rounded-md px-2.5 py-1 text-xs font-medium hover:bg-muted"
              onClick={goToday}
            >
              오늘
            </button>
            <button
              type="button"
              className="rounded-md p-1.5 hover:bg-muted"
              onClick={() => shift(1)}
              aria-label="다음"
            >
              <ChevronRight className="size-4" />
            </button>
            <p className="ml-2 text-sm font-semibold text-dh-deep dark:text-dh-light">
              {headerLabel(mode, cursor)}
            </p>
          </div>

          <div className="inline-flex rounded-lg border border-border p-0.5">
            {(
              [
                ["day", "일간"],
                ["week", "주간"],
                ["month", "월간"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setMode(key)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition",
                  mode === key
                    ? "bg-dh-real text-white"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {mode === "month" ? (
          <MonthGrid
            days={monthDays}
            month={month}
            selected={selected}
            eventsOn={itemsOn}
            onSelect={(ymd) => {
              setSelected(ymd);
              setCursor(parseYmd(ymd));
            }}
            onOpenEvent={setDetail}
            onCreate={openCreate}
          />
        ) : null}

        {mode === "week" ? (
          <WeekGrid
            days={weekDays}
            selected={selected}
            eventsOn={itemsOn}
            onSelect={(ymd) => {
              setSelected(ymd);
              setCursor(parseYmd(ymd));
            }}
            onOpenEvent={setDetail}
            onCreate={openCreate}
          />
        ) : null}

        {mode === "day" ? (
          <DayTimeline
            date={selected}
            events={dayEvents}
            onOpenEvent={setDetail}
            onCreate={() => openCreate(selected)}
          />
        ) : null}

        {/* 선택한 날짜 일정 요약 (달력 하단) */}
        {mode !== "day" ? (
          <DaySummaryBar
            selected={selected}
            events={dayEvents}
            memberMap={memberMap}
            onOpenEvent={setDetail}
            onCreate={() => openCreate(selected)}
            onRemove={remove}
          />
        ) : null}
      </section>

      {form ? (
        <EventFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          members={members}
          form={form}
          onChange={setForm}
          onSave={handleSave}
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
        onEdit={
          detailIsWeekly
            ? undefined
            : () => detail && openEdit(detail)
        }
        onDelete={
          detailIsWeekly
            ? undefined
            : () => {
                if (!detail) return;
                if (window.confirm(`"${detail.title}" 일정을 삭제할까요?`)) {
                  remove(detail.id);
                  setDetail(null);
                }
              }
        }
        footerExtra={
          detailIsWeekly ? (
            <Link
              href="/weekly-plans"
              onClick={() => setDetail(null)}
              className="inline-flex h-8 items-center rounded-md border border-border bg-background px-3 text-sm hover:bg-muted"
            >
              주간업무계획에서 확인
            </Link>
          ) : null
        }
      />

    </div>
  );
}

function MonthGrid({
  days,
  month,
  selected,
  eventsOn,
  onSelect,
  onOpenEvent,
  onCreate,
}: {
  days: Date[];
  month: number;
  selected: string;
  eventsOn: (d: string) => CalendarEvent[];
  onSelect: (ymd: string) => void;
  onOpenEvent: (ev: CalendarEvent) => void;
  onCreate: (ymd: string) => void;
}) {
  const today = formatYmd(new Date());
  return (
    <div className="flex min-h-0 shrink-0 flex-col border-b border-border lg:max-h-[min(52vh,36rem)] lg:overflow-auto">
      <div className="grid grid-cols-7 border-b border-border bg-muted/30 text-center text-xs font-medium text-muted-foreground">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-2">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 grid-rows-6">
        {days.map((d) => {
          const ymd = formatYmd(d);
          const inMonth = d.getMonth() === month;
          const list = eventsOn(ymd);
          const isSelected = ymd === selected;
          const isToday = ymd === today;
          return (
            <div
              key={ymd}
              className={cn(
                "min-h-[4.75rem] border-b border-r border-border p-1.5 transition sm:min-h-[5.25rem]",
                !inMonth && "bg-muted/20",
                isSelected && "bg-dh-real/5",
              )}
              onClick={() => onSelect(ymd)}
              onDoubleClick={() => onCreate(ymd)}
            >
              <div className="mb-1 flex items-center justify-between">
                <span
                  className={cn(
                    "inline-flex size-6 items-center justify-center rounded-full text-xs",
                    isToday && "bg-dh-real font-semibold text-white",
                    !isToday && !inMonth && "text-muted-foreground/50",
                    !isToday && inMonth && "text-foreground",
                  )}
                >
                  {d.getDate()}
                </span>
              </div>
              <ul className="space-y-0.5">
                {list.slice(0, 3).map((ev) => (
                  <li key={ev.id}>
                    <button
                      type="button"
                      title={eventChipLabel(ev)}
                      className="flex w-full items-center gap-1 truncate rounded px-1 py-0.5 text-left text-[11px] hover:bg-muted"
                      style={{ color: ev.color || "#1f4889" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenEvent(ev);
                      }}
                    >
                      <span
                        className="size-1.5 shrink-0 rounded-full"
                        style={{ backgroundColor: ev.color || "#1f4889" }}
                      />
                      <span className="truncate font-medium text-foreground">
                        {eventChipLabel(ev)}
                      </span>
                    </button>
                  </li>
                ))}
                {list.length > 3 ? (
                  <li className="px-1 text-[10px] text-muted-foreground">
                    +{list.length - 3}개
                  </li>
                ) : null}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekGrid({
  days,
  selected,
  eventsOn,
  onSelect,
  onOpenEvent,
  onCreate,
}: {
  days: Date[];
  selected: string;
  eventsOn: (d: string) => CalendarEvent[];
  onSelect: (ymd: string) => void;
  onOpenEvent: (ev: CalendarEvent) => void;
  onCreate: (ymd: string) => void;
}) {
  const today = formatYmd(new Date());
  return (
    <div className="flex max-h-[min(48vh,32rem)] min-h-0 shrink-0 flex-col overflow-auto border-b border-border">
      <div className="grid min-w-[640px] grid-cols-[3.5rem_repeat(7,1fr)] border-b border-border">
        <div />
        {days.map((d) => {
          const ymd = formatYmd(d);
          const isToday = ymd === today;
          const isSelected = ymd === selected;
          return (
            <button
              key={ymd}
              type="button"
              onClick={() => onSelect(ymd)}
              className={cn(
                "border-l border-border py-2 text-center text-xs",
                isSelected && "bg-dh-real/5",
              )}
            >
              <span className="text-muted-foreground">
                {WEEKDAYS[d.getDay()]}
              </span>
              <span
                className={cn(
                  "mt-0.5 flex justify-center text-sm font-semibold",
                  isToday &&
                    "mx-auto flex size-7 items-center justify-center rounded-full bg-dh-real text-white",
                )}
              >
                {d.getDate()}
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid min-w-[640px] flex-1 grid-cols-[3.5rem_repeat(7,1fr)]">
        <div className="relative">
          {HOURS.filter((h) => h >= 7 && h <= 21).map((h) => (
            <div
              key={h}
              className="h-14 border-b border-border pr-1 text-right text-[10px] text-muted-foreground"
            >
              {String(h).padStart(2, "0")}:00
            </div>
          ))}
        </div>
        {days.map((d) => {
          const ymd = formatYmd(d);
          const list = eventsOn(ymd);
          return (
            <div
              key={ymd}
              className={cn(
                "relative border-l border-border",
                ymd === selected && "bg-dh-real/[0.03]",
              )}
              onDoubleClick={() => onCreate(ymd)}
            >
              {HOURS.filter((h) => h >= 7 && h <= 21).map((h) => (
                <div key={h} className="h-14 border-b border-border" />
              ))}
              <div className="pointer-events-none absolute inset-x-0.5 top-1 space-y-0.5">
                {list.map((ev) => {
                  const startH = ev.allDay
                    ? 7
                    : Math.max(7, Number(ev.startTime.slice(0, 2)));
                  const top = (startH - 7) * 56;
                  return (
                    <button
                      key={ev.id}
                      type="button"
                      className="pointer-events-auto absolute left-0.5 right-0.5 truncate rounded px-1.5 py-1 text-left text-[11px] font-medium text-white shadow-sm"
                      style={{
                        top,
                        backgroundColor: ev.color || "#1f4889",
                      }}
                      onClick={() => onOpenEvent(ev)}
                    >
                      {ev.allDay ? "종일 · " : `${ev.startTime} · `}
                      {ev.title}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DayTimeline({
  date,
  events,
  onOpenEvent,
  onCreate,
}: {
  date: string;
  events: CalendarEvent[];
  onOpenEvent: (ev: CalendarEvent) => void;
  onCreate: () => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <p className="text-sm font-medium">{date} 일정</p>
        <Button size="sm" variant="outline" onClick={onCreate}>
          <Plus data-icon="inline-start" />
          이 날 추가
        </Button>
      </div>
      <div className="relative min-h-[28rem] flex-1">
        {HOURS.filter((h) => h >= 7 && h <= 21).map((h) => (
          <div
            key={h}
            className="flex h-14 border-b border-border"
            onDoubleClick={onCreate}
          >
            <div className="w-14 shrink-0 pr-2 text-right text-[10px] text-muted-foreground">
              {String(h).padStart(2, "0")}:00
            </div>
            <div className="flex-1" />
          </div>
        ))}
        <div className="absolute inset-y-0 left-14 right-2">
          {events.map((ev) => {
            const startH = ev.allDay
              ? 7
              : Math.max(7, Number(ev.startTime.slice(0, 2)));
            const startM = ev.allDay ? 0 : Number(ev.startTime.slice(3, 5));
            const endH = ev.allDay
              ? 8
              : Math.max(startH + 1, Number(ev.endTime.slice(0, 2)));
            const endM = ev.allDay ? 0 : Number(ev.endTime.slice(3, 5));
            const top = (startH - 7) * 56 + (startM / 60) * 56;
            const height = Math.max(
              28,
              (endH - startH) * 56 + ((endM - startM) / 60) * 56,
            );
            return (
              <button
                key={ev.id}
                type="button"
                className="absolute left-1 right-1 overflow-hidden rounded-md px-2.5 py-1.5 text-left text-sm text-white shadow-sm"
                style={{
                  top,
                  height,
                  backgroundColor: ev.color || "#1f4889",
                }}
                onClick={() => onOpenEvent(ev)}
              >
                <p className="font-semibold">{ev.title}</p>
                <p className="text-xs opacity-90">
                  {ev.allDay
                    ? "종일"
                    : `${ev.startTime} ~ ${ev.endTime}`}
                  {ev.location ? ` · ${ev.location}` : ""}
                </p>
              </button>
            );
          })}
        </div>
        {events.length === 0 ? (
          <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
            등록된 일정이 없습니다. 더블클릭하거나 「이 날 추가」로 등록하세요.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function DaySummaryBar({
  selected,
  events,
  memberMap,
  onOpenEvent,
  onCreate,
  onRemove,
}: {
  selected: string;
  events: CalendarEvent[];
  memberMap: Record<string, TeamMember>;
  onOpenEvent: (ev: CalendarEvent) => void;
  onCreate: () => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="flex min-h-[14rem] flex-1 flex-col border-t border-border bg-amber-50/80 p-4 dark:bg-amber-950/25 sm:p-5">
      <div className="mb-3 flex shrink-0 items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-dh-deep dark:text-dh-light">
            {formatSelectedLabel(selected)} 일정 요약
          </p>
          <p className="text-xs text-muted-foreground">
            {events.length > 0
              ? `${events.length}건 · 항목을 누르면 상세를 볼 수 있습니다`
              : "날짜를 선택하면 해당 일 일정이 여기에 표시됩니다"}
          </p>
        </div>
        <Button size="sm" onClick={onCreate}>
          <Plus data-icon="inline-start" />
          추가
        </Button>
      </div>

      {events.length === 0 ? (
        <div className="flex min-h-[8rem] flex-1 items-center justify-center rounded-lg border border-dashed border-amber-200/80 bg-white/50 text-sm text-muted-foreground dark:border-amber-900/40 dark:bg-background/40">
          등록된 일정이 없습니다.
        </div>
      ) : (
        <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto">
          {events.map((ev) => {
            const owner = memberMap[ev.ownerId];
            const period =
              ev.endDate && ev.endDate !== ev.date
                ? `${ev.date} ~ ${ev.endDate}`
                : null;
            return (
              <li
                key={ev.id}
                className="flex items-start justify-between gap-2 rounded-lg border border-amber-200/70 bg-white/85 px-3 py-2.5 shadow-sm dark:border-amber-900/40 dark:bg-background/60"
              >
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => onOpenEvent(ev)}
                >
                  <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: ev.color || "#1f4889" }}
                    />
                    {ev.title}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {ev.allDay
                      ? "종일"
                      : `${ev.startTime} ~ ${ev.endTime}`}
                    {period ? ` · ${period}` : ""}
                    {ev.location ? ` · ${ev.location}` : ""}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {ev.calendarName ? `${ev.calendarName} · ` : ""}
                    등록 {owner?.name ?? "미지정"}
                    {ev.attendees ? ` · 참석 ${ev.attendees}` : ""}
                    {ev.attachments?.length ? (
                      <span className="ml-1 inline-flex items-center gap-0.5 text-dh-real">
                        <Paperclip className="size-3" />
                        {ev.attachments.length}
                      </span>
                    ) : null}
                  </p>
                  {ev.description ? (
                    <p className="mt-1 line-clamp-2 text-xs text-foreground/80">
                      {ev.description}
                    </p>
                  ) : null}
                </button>
                {isWeeklyCalendarEvent(ev) ? (
                  <span className="shrink-0 rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                    주간업무
                  </span>
                ) : (
                  <button
                    type="button"
                    className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-dh-red"
                    aria-label="삭제"
                    onClick={() => {
                      if (window.confirm(`"${ev.title}" 일정을 삭제할까요?`)) {
                        onRemove(ev.id);
                      }
                    }}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
