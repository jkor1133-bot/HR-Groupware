import { daysUntil, formatDaysLeft } from "@/lib/period";
import type {
  CalendarEvent,
  ContractRecord,
  PermitRecord,
} from "@/lib/types";

const CONTRACT_COLOR = "#b91c1c";
const PERMIT_COLOR = "#d97706";

function emptyEventBase(
  partial: Pick<
    CalendarEvent,
    "id" | "title" | "date" | "description" | "calendarName" | "color" | "source"
  >,
): CalendarEvent {
  return {
    endDate: partial.date,
    startTime: "09:00",
    endTime: "18:00",
    allDay: true,
    location: "",
    ownerId: "",
    createdAt: new Date().toISOString(),
    attendees: "",
    visibility: "공개",
    videoLink: "",
    reminder: "없음",
    attachments: [],
    ...partial,
  };
}

/** 근로계약 종료일 → 캘린더 표시용 (전 기간, 임박/만료 라벨) */
export function contractsToCalendarEvents(
  contracts: ContractRecord[],
  now = new Date(),
): CalendarEvent[] {
  return contracts
    .filter((c) => !!c.endDate)
    .map((c) => {
      const daysLeft = daysUntil(c.endDate, now);
      const status =
        daysLeft < 0 ? "만료" : daysLeft <= 31 ? "임박" : "종료예정";
      return emptyEventBase({
        id: `contract-${c.id}`,
        title: `${c.employeeName} · 계약 ${status}`,
        date: c.endDate,
        description: `${c.contractType} · ${c.jobTrack} · 종료 ${c.endDate} · ${formatDaysLeft(daysLeft)}`,
        calendarName: "근로계약",
        color: CONTRACT_COLOR,
        source: "contract",
      });
    });
}

/** 인허가 종료일 → 캘린더 표시용 */
export function permitsToCalendarEvents(
  permits: PermitRecord[],
  now = new Date(),
): CalendarEvent[] {
  return permits
    .filter((p) => !!p.endDate)
    .map((p) => {
      const daysLeft = daysUntil(p.endDate, now);
      const status =
        daysLeft < 0 ? "만료" : daysLeft <= 31 ? "임박" : "종료예정";
      return emptyEventBase({
        id: `permit-${p.id}`,
        title: `${p.name} · 인허가 ${status}`,
        date: p.endDate,
        description: `${p.authority} · 종료 ${p.endDate} · ${formatDaysLeft(daysLeft)}`,
        calendarName: "인허가",
        color: PERMIT_COLOR,
        source: "permit",
      });
    });
}

export function isContractCalendarEvent(ev: CalendarEvent) {
  return ev.source === "contract" || ev.id.startsWith("contract-");
}

export function isPermitCalendarEvent(ev: CalendarEvent) {
  return ev.source === "permit" || ev.id.startsWith("permit-");
}

export function isOpsDeadlineCalendarEvent(ev: CalendarEvent) {
  return isContractCalendarEvent(ev) || isPermitCalendarEvent(ev);
}

export function isReadOnlyCalendarEvent(ev: CalendarEvent) {
  return (
    ev.source === "weekly" ||
    ev.id.startsWith("weekly-") ||
    isOpsDeadlineCalendarEvent(ev)
  );
}

export function opsDeadlineHref(ev: CalendarEvent) {
  if (isContractCalendarEvent(ev)) {
    return "/hr-records?main=hr&sub=contracts";
  }
  if (isPermitCalendarEvent(ev)) {
    return "/hr-records?main=ga&sub=permits";
  }
  return "/hr-records";
}
