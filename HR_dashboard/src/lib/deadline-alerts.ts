import {
  daysUntil,
  formatDaysLeft,
  isUrgentDeadline,
} from "@/lib/period";
import type {
  ContractRecord,
  PermitRecord,
  TeamMember,
  WeeklyTask,
} from "@/lib/types";

export type DeadlineAlertKind = "task" | "contract" | "permit";

export type DeadlineAlert = {
  id: string;
  kind: DeadlineAlertKind;
  title: string;
  detail: string;
  dueDate: string;
  daysLeft: number;
  daysLeftLabel: string;
  href: string;
  severity: "overdue" | "soon";
};

const TASK_WINDOW_DAYS = 7;
const OPS_WINDOW_DAYS = 31;

function memberName(members: TeamMember[], ownerId: string) {
  return members.find((m) => m.id === ownerId)?.name ?? "미지정";
}

export function collectTaskAlerts(
  tasks: WeeklyTask[],
  members: TeamMember[],
  now = new Date(),
): DeadlineAlert[] {
  return tasks
    .filter(
      (t) =>
        t.status !== "done" &&
        !!t.dueDate &&
        isUrgentDeadline(t.dueDate, TASK_WINDOW_DAYS, now),
    )
    .map((t) => {
      const daysLeft = daysUntil(t.dueDate!, now);
      const statusHint =
        t.status === "delayed"
          ? "지연"
          : t.status === "in_progress"
            ? "진행 중"
            : "미완료";
      return {
        id: `task-${t.id}`,
        kind: "task" as const,
        title: t.title,
        detail: `${memberName(members, t.ownerId)} · ${statusHint} · 기한 ${t.dueDate}`,
        dueDate: t.dueDate!,
        daysLeft,
        daysLeftLabel: formatDaysLeft(daysLeft),
        href: "/weekly-plans",
        severity: daysLeft < 0 ? ("overdue" as const) : ("soon" as const),
      };
    });
}

export function collectContractAlerts(
  contracts: ContractRecord[],
  now = new Date(),
): DeadlineAlert[] {
  return contracts
    .filter((c) => isUrgentDeadline(c.endDate, OPS_WINDOW_DAYS, now))
    .map((c) => {
      const daysLeft = daysUntil(c.endDate, now);
      return {
        id: `contract-${c.id}`,
        kind: "contract" as const,
        title: `${c.employeeName} · 근로계약`,
        detail: `${c.contractType} · ${c.jobTrack} · 종료 ${c.endDate}`,
        dueDate: c.endDate,
        daysLeft,
        daysLeftLabel: formatDaysLeft(daysLeft),
        href: "/hr-records?main=hr&sub=contracts",
        severity: daysLeft < 0 ? ("overdue" as const) : ("soon" as const),
      };
    });
}

export function collectPermitAlerts(
  permits: PermitRecord[],
  now = new Date(),
): DeadlineAlert[] {
  return permits
    .filter((p) => isUrgentDeadline(p.endDate, OPS_WINDOW_DAYS, now))
    .map((p) => {
      const daysLeft = daysUntil(p.endDate, now);
      return {
        id: `permit-${p.id}`,
        kind: "permit" as const,
        title: p.name,
        detail: `${p.authority} · 종료 ${p.endDate}`,
        dueDate: p.endDate,
        daysLeft,
        daysLeftLabel: formatDaysLeft(daysLeft),
        href: "/hr-records?main=ga&sub=permits",
        severity: daysLeft < 0 ? ("overdue" as const) : ("soon" as const),
      };
    });
}

export function sortDeadlineAlerts(alerts: DeadlineAlert[]) {
  return [...alerts].sort((a, b) => {
    if (a.daysLeft !== b.daysLeft) return a.daysLeft - b.daysLeft;
    return a.dueDate.localeCompare(b.dueDate);
  });
}

export function buildDeadlineAlerts(input: {
  tasks: WeeklyTask[];
  members: TeamMember[];
  contracts: ContractRecord[];
  permits: PermitRecord[];
  now?: Date;
}) {
  const now = input.now ?? new Date();
  return sortDeadlineAlerts([
    ...collectTaskAlerts(input.tasks, input.members, now),
    ...collectContractAlerts(input.contracts, now),
    ...collectPermitAlerts(input.permits, now),
  ]);
}
