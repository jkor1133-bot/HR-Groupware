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
