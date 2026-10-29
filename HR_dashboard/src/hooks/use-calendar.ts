"use client";

import { useCallback, useEffect, useState } from "react";
import { useMembers } from "@/hooks/use-members";
import type { CalendarEvent } from "@/lib/types";
import { formatYmd } from "@/lib/week";

const STORAGE_KEY = "hr-dashboard-calendar-v3";

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
  };
}

function load(): CalendarEvent[] {
  if (typeof window === "undefined") return seedEvents();
  try {
    const raw =
      window.localStorage.getItem(STORAGE_KEY) ||
      window.localStorage.getItem("hr-dashboard-calendar-v2") ||
      window.localStorage.getItem("hr-dashboard-calendar-v1");
    if (!raw) return seedEvents();
    const parsed = JSON.parse(raw) as CalendarEvent[];
    return Array.isArray(parsed) ? parsed.map(normalize) : seedEvents();
  } catch {
    return seedEvents();
  }
}

export function useCalendar() {
  const { members, hydrated: membersHydrated } = useMembers();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setEvents(load());
    setHydrated(true);
  }, []);

  const persist = useCallback((next: CalendarEvent[]) => {
    setEvents(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const upsert = useCallback(
    (event: CalendarEvent) => {
      const next = normalize(event);
      const exists = events.some((e) => e.id === next.id);
      persist(
        exists
          ? events.map((e) => (e.id === next.id ? next : e))
          : [...events, next],
      );
    },
    [events, persist],
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
