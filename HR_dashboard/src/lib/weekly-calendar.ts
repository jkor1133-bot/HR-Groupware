import type { CalendarEvent, WeeklyTask } from "@/lib/types";
import { addDays, formatYmd } from "@/lib/week";

const YMD = /^\d{4}-\d{2}-\d{2}$/;

const DAY_OFFSET: Record<WeeklyTask["dueDay"], number> = {
  월: 0,
  화: 1,
  수: 2,
  목: 3,
  금: 4,
};

/** 기한 문자열 → YYYY-MM-DD (불가하면 null) */
export function parseDueToYmd(label: string | undefined | null): string | null {
  if (!label) return null;
  const t = label.trim();
  if (YMD.test(t)) return t;
  const m = t.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})$/);
  if (!m) return null;
  return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
}

function pickYmd(...candidates: Array<string | undefined | null>): string | null {
  for (const c of candidates) {
    if (c && YMD.test(c.trim())) return c.trim();
  }
  return null;
}

/** weekId(월요일) + 요일 → 해당 주 날짜 */
function dateFromWeekAndDay(
  weekId: string | undefined,
  dueDay: WeeklyTask["dueDay"] | undefined,
): string | null {
  if (!weekId || !YMD.test(weekId) || !dueDay) return null;
  const offset = DAY_OFFSET[dueDay];
  if (offset == null) return null;
  return formatYmd(addDays(new Date(`${weekId}T00:00:00`), offset));
}

const WEEKLY_COLOR = "#b45309";

/** 주간업무(본업무 기간 + 세부업무 기한) → 캘린더 표시용 이벤트 */
export function weeklyTasksToCalendarEvents(
  tasks: WeeklyTask[],
): CalendarEvent[] {
  const out: CalendarEvent[] = [];
  const now = new Date().toISOString();

  for (const task of tasks) {
    const fromWeek = dateFromWeekAndDay(task.weekId, task.dueDay);
    const start =
      pickYmd(task.startDate, task.dueDate, fromWeek) ?? null;
    const end =
      pickYmd(task.endDate, task.dueDate, task.startDate, fromWeek) ?? start;
    if (start && end) {
      out.push({
        id: `weekly-task-${task.id}`,
        title: task.title,
        date: start,
        endDate: end,
        startTime: "09:00",
        endTime: "18:00",
        allDay: true,
        location: "",
        description: `주간업무 · ${task.category || "업무"}${
          start !== end ? ` · ${start}~${end}` : ""
        }`,
        ownerId: task.ownerId,
        createdAt: task.updatedAt || now,
        calendarName: "주간업무",
        attendees: "",
        visibility: "공개",
        color: WEEKLY_COLOR,
        videoLink: "",
        reminder: "없음",
        attachments: [],
        source: "weekly",
      });
    }

    for (const st of task.subtasks ?? []) {
      const date = parseDueToYmd(st.dueLabel);
      if (!date) continue;
      const title = st.title.trim() || task.title;
      out.push({
        id: `weekly-sub-${task.id}-${st.id}`,
        title,
        date,
        endDate: date,
        startTime: "09:00",
        endTime: "18:00",
        allDay: true,
        location: "",
        description: `주간업무 세부 · ${task.title}${
          st.ownerLabel ? ` · 담당 ${st.ownerLabel}` : ""
        }`,
        ownerId: task.ownerId,
        createdAt: task.updatedAt || now,
        calendarName: "주간업무·세부",
        attendees: st.ownerLabel || "",
        visibility: "공개",
        color: WEEKLY_COLOR,
        videoLink: "",
        reminder: "없음",
        attachments: [],
        source: "weekly",
      });
    }
  }

  return out;
}

export function isWeeklyCalendarEvent(ev: CalendarEvent): boolean {
  return ev.source === "weekly" || ev.id.startsWith("weekly-");
}
