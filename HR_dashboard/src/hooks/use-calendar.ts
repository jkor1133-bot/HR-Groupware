"use client";

import { useCallback, useEffect, useState } from "react";
import { useMembers } from "@/hooks/use-members";
import type { CalendarEvent } from "@/lib/types";
import { formatYmd } from "@/lib/week";

/** 사이드바 월간 일정표(업무) — 직접 입력 + 주간업무·계약 등과 함께 표시 */
const PAGE_STORAGE_KEY = "hr-dashboard-calendar-v3";
/** 메인 화면 홈 캘린더 전용 (사이드바 Calendar와 분리) */
const HOME_STORAGE_KEY = "hr-dashboard-home-calendar-v1";

export type CalendarScope = "page" | "home";

function seedEvents(): CalendarEvent[] {
  const today = formatYmd(new Date());
  const now = new Date().toISOString();
  return [
    {
      id: "c1",
      title: "인사총무 주간 미팅",
      date: today,
      endDate: today,
      startTime: "10:00",
      endTime: "11:00",
      allDay: false,
      location: "본사 3층 회의실",
      description: "주간 이슈 공유",
      ownerId: "m1",
      createdAt: now,
      calendarName: "인사총무",
      attendees: "",
      visibility: "공개",
      color: "#1f4889",
      videoLink: "",
      reminder: "10분 전",
      attachments: [],
      source: "calendar",
    },
  ];
}

function normalize(ev: CalendarEvent): CalendarEvent {
  return {
    ...ev,
    endDate: ev.endDate || ev.date,
    calendarName: ev.calendarName || "내 캘린더",
    attendees: ev.attendees ?? "",
    visibility: ev.visibility === "비공개" ? "비공개" : "공개",
    color: ev.color || "#1f4889",
    videoLink: ev.videoLink ?? "",
    reminder: ev.reminder || "없음",
    attachments: Array.isArray(ev.attachments) ? ev.attachments : [],
    source: ev.source ?? "calendar",
  };
}

function load(scope: CalendarScope): CalendarEvent[] {
  if (typeof window === "undefined") {
    return scope === "page" ? seedEvents() : [];
  }
  try {
    if (scope === "home") {
      const raw = window.localStorage.getItem(HOME_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as CalendarEvent[];
      return Array.isArray(parsed) ? parsed.map(normalize) : [];
    }

    const raw =
      window.localStorage.getItem(PAGE_STORAGE_KEY) ||
      window.localStorage.getItem("hr-dashboard-calendar-v2") ||
      window.localStorage.getItem("hr-dashboard-calendar-v1");
    if (!raw) return seedEvents();
    const parsed = JSON.parse(raw) as CalendarEvent[];
    return Array.isArray(parsed) ? parsed.map(normalize) : seedEvents();
  } catch {
    return scope === "page" ? seedEvents() : [];
  }
}

function storageKey(scope: CalendarScope) {
  return scope === "home" ? HOME_STORAGE_KEY : PAGE_STORAGE_KEY;
}

/**
 * @param scope `home` = 메인 화면 위젯 전용 저장소
 *              `page`(기본) = 사이드바 월간 일정표
 */
export function useCalendar(scope: CalendarScope = "page") {
  const { members, hydrated: membersHydrated } = useMembers();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setEvents(load(scope));
    setHydrated(true);
  }, [scope]);

  const persist = useCallback(
    (next: CalendarEvent[]) => {
      setEvents(next);
      window.localStorage.setItem(storageKey(scope), JSON.stringify(next));
    },
    [scope],
  );

  const upsert = useCallback(
    (event: CalendarEvent) => {
      const next = normalize({
        ...event,
        source: scope === "home" ? "calendar" : (event.source ?? "calendar"),
      });
      // home 일정은 홈 저장소에만 두고, page와 id 충돌을 줄이기 위해 접두사 유지
      const exists = events.some((e) => e.id === next.id);
      persist(
        exists
          ? events.map((e) => (e.id === next.id ? next : e))
          : [...events, next],
      );
    },
    [events, persist, scope],
  );

  const remove = useCallback(
    (id: string) => {
      persist(events.filter((e) => e.id !== id));
    },
    [events, persist],
  );

  const eventsOn = useCallback(
    (date: string) =>
      [...events]
        .filter((e) => {
          const end = e.endDate || e.date;
          return e.date <= date && end >= date;
        })
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [events],
  );

  return {
    hydrated: hydrated && membersHydrated,
    events,
    members,
    eventsOn,
    upsert,
    remove,
  };
}
