import { Badge } from "@/components/ui/badge";
import { STATUS_LABEL, PRIORITY_LABEL } from "@/lib/labels";
import type { TaskPriority, TaskStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const statusClass: Record<TaskStatus, string> = {
  planned: "bg-[#e8f4fb] text-dh-real border-dh-sky/40",
  in_progress: "bg-[#eef5fb] text-dh-deep-2 border-dh-sea/40",
  done: "bg-[#eaf6ef] text-emerald-800 border-emerald-200",
  delayed: "bg-[#fceeee] text-dh-red border-red-200",
};

const priorityClass: Record<TaskPriority, string> = {
  high: "bg-dh-real text-white border-dh-deep",
  medium: "bg-dh-sea/15 text-dh-real border-dh-sea/30",
  low: "bg-white text-muted-foreground border-border",
};

export function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    <Badge
      variant="outline"
      className={cn("font-medium", statusClass[status])}
    >
      {STATUS_LABEL[status]}
    </Badge>
  );
}

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  return (
    <Badge
      variant="outline"
      className={cn("font-medium", priorityClass[priority])}
    >
      {PRIORITY_LABEL[priority]}
    </Badge>
  );
}
