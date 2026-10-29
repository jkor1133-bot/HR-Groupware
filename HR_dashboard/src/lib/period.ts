import { addDays, formatYmd, getMonday } from "@/lib/week";

export function currentYearMonth(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function shiftYearMonth(ym: string, delta: number) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return currentYearMonth(d);
}

export function yearMonthsForCompare(now = new Date()) {
  const cur = currentYearMonth(now);
  const prev = shiftYearMonth(cur, -1);
  const curYear = now.getFullYear();
  const prevYear = curYear - 1;
  return {
    currentMonth: cur,
    previousMonth: prev,
    currentYear: curYear,
    previousYear: prevYear,
  };
}

export function sumByYear(
  rows: { yearMonth: string; amount?: number; hours?: number }[],
  year: number,
  valueKey: "amount" | "hours",
) {
  return rows
    .filter((r) => r.yearMonth.startsWith(`${year}-`))
    .reduce((acc, r) => acc + (Number(r[valueKey]) || 0), 0);
}

/** 해당 연월까지의 누계 (YYYY-01 ~ throughYm) */
export function sumThroughMonth(
  rows: { yearMonth: string; amount?: number; hours?: number }[],
  throughYm: string,
  valueKey: "amount" | "hours",
) {
  const year = throughYm.slice(0, 4);
  return rows
    .filter(
      (r) => r.yearMonth.startsWith(`${year}-`) && r.yearMonth <= throughYm,
    )
    .reduce((acc, r) => acc + (Number(r[valueKey]) || 0), 0);
}

/** 당월·전월·당월누계·전월누계 */
export function comparePeriodTotals(
  rows: { yearMonth: string; amount?: number; hours?: number }[],
  valueKey: "amount" | "hours",
  now = new Date(),
) {
  const { currentMonth, previousMonth } = yearMonthsForCompare(now);
  return {
    currentMonth: rows
      .filter((r) => r.yearMonth === currentMonth)
      .reduce((a, r) => a + (Number(r[valueKey]) || 0), 0),
    previousMonth: rows
      .filter((r) => r.yearMonth === previousMonth)
      .reduce((a, r) => a + (Number(r[valueKey]) || 0), 0),
    currentYtd: sumThroughMonth(rows, currentMonth, valueKey),
    previousYtd: sumThroughMonth(rows, previousMonth, valueKey),
    currentMonthLabel: currentMonth,
    previousMonthLabel: previousMonth,
  };
}

export function thisWeekRange(now = new Date()) {
  const monday = getMonday(now);
  const sunday = addDays(monday, 6);
  return { start: formatYmd(monday), end: formatYmd(sunday) };
}

/** 오늘 기준 남은 일수 (음수 = 기한 경과) */
export function daysUntil(endDate: string, now = new Date()) {
  const end = new Date(`${endDate}T00:00:00`);
  const today = new Date(formatYmd(now) + "T00:00:00");
  return Math.round(
    (end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
}

/** 오늘~days일 이내 만료 (아직 지나지 않은 것만) */
export function withinDays(endDate: string, days: number, now = new Date()) {
  const diff = daysUntil(endDate, now);
  return diff >= 0 && diff <= days;
}

/** 기한 경과 포함, windowDays일 이내(또는 이미 지난) 긴급 항목 */
export function isUrgentDeadline(
  endDate: string,
  windowDays: number,
  now = new Date(),
) {
  return daysUntil(endDate, now) <= windowDays;
}

export function formatDaysLeft(days: number) {
  if (days < 0) return `${-days}일 초과`;
  if (days === 0) return "오늘";
  return `D-${days}`;
}

export function overlapsRange(
  start: string,
  end: string,
  rangeStart: string,
  rangeEnd: string,
) {
  return start <= rangeEnd && end >= rangeStart;
}

export function formatWon(n: number) {
  return new Intl.NumberFormat("ko-KR").format(Math.round(n));
}
