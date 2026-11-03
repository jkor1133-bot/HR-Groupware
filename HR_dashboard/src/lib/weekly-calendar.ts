import type {
  CalendarEvent,
  TaskStatus,
  WeeklySubTask,
  WeeklyTask,
} from "@/lib/types";
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

/**
 * 세부업무가 있으면 전부 완료 시 본업무도 완료.
 * 세부업무가 없으면 기존 상태를 유지(수동).
 * 전부 완료였다 일부가 풀리면 완료를 해제한다.
 */
export function deriveTaskStatusFromSubtasks(
  current: TaskStatus,
  subtasks: WeeklySubTask[] | undefined,
): TaskStatus {
  const list = subtasks ?? [];
  if (list.length === 0) return current;
  if (list.every((s) => s.status === "done")) return "done";
  if (current !== "done") return current;
  if (list.some((s) => s.status === "delayed")) return "delayed";
  if (list.some((s) => s.status === "in_progress")) return "in_progress";
  return "planned";
}

/** 세부업무 시작·마감 정규화 (구 dueLabel → endDate 이전) */
export function normalizeWeeklySubTask<
  T extends {
    startDate?: string;
    endDate?: string;
    dueLabel?: string;
  },
>(s: T): T & { startDate: string; endDate: string; dueLabel: string } {
  const legacy = parseDueToYmd(s.dueLabel) ?? "";
  let start = parseDueToYmd(s.startDate) ?? "";
  let end = parseDueToYmd(s.endDate) ?? "";
  if (!end && legacy) end = legacy;
  if (!start && end) start = end;
  if (!end && start) end = start;
  if (start && end && end < start) {
    const tmp = start;
    start = end;
    end = tmp;
  }
  return { ...s, startDate: start, endDate: end, dueLabel: end || legacy };
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

/**
 * 주간업무 → 캘린더 표시용 이벤트.
 * 본업무만 올린다(세부업무는 업무 목록에서 관리, 캘린더 중복 방지).
 */
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
    if (!start || !end) continue;

    const subCount = task.subtasks?.length ?? 0;
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
      }${subCount > 0 ? ` · 세부 ${subCount}건` : ""}`,
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

  return out;
}

export function isWeeklyCalendarEvent(ev: CalendarEvent): boolean {
  return ev.source === "weekly" || ev.id.startsWith("weekly-");
}
