/** ISO week helpers for weekly HR plans (Asia/Seoul-friendly Monday start). */

export function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function formatYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function weekIdFromDate(date: Date): string {
  return formatYmd(getMonday(date));
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function shiftWeek(weekId: string, offsetWeeks: number): string {
  const monday = new Date(`${weekId}T00:00:00`);
  return weekIdFromDate(addDays(monday, offsetWeeks * 7));
}

export function weekLabel(weekId: string): string {
  const monday = new Date(`${weekId}T00:00:00`);
  const friday = addDays(monday, 4);
  const fmt = (d: Date) =>
    `${d.getMonth() + 1}/${d.getDate()}`;
  return `${monday.getFullYear()}년 ${fmt(monday)} ~ ${fmt(friday)}`;
}

export function isCurrentWeek(weekId: string): boolean {
  return weekId === weekIdFromDate(new Date());
}

/** 해당 주 월~일 YYYY-MM-DD 범위 */
export function weekDateRange(weekId: string): { start: string; end: string } {
  const monday = new Date(`${weekId}T00:00:00`);
  return {
    start: formatYmd(monday),
    end: formatYmd(addDays(monday, 6)),
  };
}

/**
 * 업무 기간(시작~종료)이 이 주와 겹치면 true.
 * 기간이 없으면 weekId 필드로 판정.
 */
export function taskOverlapsWeek(
  task: {
    weekId: string;
    startDate?: string;
    endDate?: string;
    dueDate?: string;
  },
  weekId: string,
): boolean {
  const { start: ws, end: we } = weekDateRange(weekId);
  const ts = task.startDate || task.dueDate || task.endDate;
  const te = task.endDate || task.dueDate || task.startDate;
  if (ts && te) {
    return ts <= we && te >= ws;
  }
  return task.weekId === weekId;
}

/** 시작일(없으면 종료일) 기준으로 소속 weekId 계산 */
export function weekIdFromTaskDates(task: {
  startDate?: string;
  endDate?: string;
  dueDate?: string;
  weekId?: string;
}): string {
  const anchor = task.startDate || task.dueDate || task.endDate;
  if (anchor) {
    return weekIdFromDate(new Date(`${anchor}T00:00:00`));
  }
  return task.weekId ?? weekIdFromDate(new Date());
}
