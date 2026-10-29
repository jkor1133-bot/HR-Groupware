"use client";

import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SUBTASK_STATUS_LABEL } from "@/lib/labels";
import type { SubTaskStatus, WeeklySubTask, WeeklyTask } from "@/lib/types";
import { cn } from "@/lib/utils";

const SUB_STATUSES: SubTaskStatus[] = [
  "planned",
  "in_progress",
  "done",
  "delayed",
];

function emptySubtask(): WeeklySubTask {
  return {
    id: `st-${Date.now()}`,
    title: "",
    ownerLabel: "",
    status: "planned",
    dueLabel: "",
    delayReason: "",
  };
}

export function TaskSubtasksPanel({
  task,
  onChange,
}: {
  task: WeeklyTask;
  onChange: (next: WeeklyTask) => void;
}) {
  const subtasks = task.subtasks ?? [];
  const delayedCount = subtasks.filter((s) => s.status === "delayed").length;

  function patchList(next: WeeklySubTask[]) {
    onChange({
      ...task,
      subtasks: next,
      updatedAt: new Date().toISOString(),
    });
  }

  function updateAt(idx: number, patch: Partial<WeeklySubTask>) {
    patchList(
      subtasks.map((s, i) => {
        if (i !== idx) return s;
        const merged = { ...s, ...patch };
        if (merged.status !== "delayed") merged.delayReason = "";
        return merged;
      }),
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-dh-sea/30 bg-[#f7fbfe] p-3 dark:bg-dh-deep/20">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-dh-deep dark:text-dh-light">
            세부업무 · 병목 관리
          </p>
          <p className="text-xs text-muted-foreground">
            이 업무를 완수하기 위한 단계별 기한·상태·지연사유를 기록합니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {delayedCount > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-[#fceeee] px-2 py-1 text-[11px] font-medium text-dh-red">
              <AlertTriangle className="size-3" />
              병목 {delayedCount}건
            </span>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => patchList([...subtasks, emptySubtask()])}
          >
            <Plus className="size-3.5" />
            세부업무 추가
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border border-border bg-card">
        <table className="gw-data-table w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
              <th className="w-12 px-2 py-2.5 font-medium">구분</th>
              <th className="px-2 py-2.5 text-left font-medium">세부내용</th>
              <th className="w-[8.5rem] px-2 py-2.5 font-medium">담당자</th>
              <th className="w-[7.5rem] px-2 py-2.5 font-medium">상태</th>
              <th className="w-[7rem] px-2 py-2.5 font-medium">기한</th>
              <th className="min-w-[12rem] px-2 py-2.5 text-left font-medium">
                지연사유
              </th>
              <th className="w-10 px-1 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {subtasks.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-3 py-8 text-center text-muted-foreground"
                >
                  등록된 세부업무가 없습니다. 「세부업무 추가」로 단계를
                  나눠보세요.
                </td>
              </tr>
            ) : (
              subtasks.map((s, idx) => (
                <tr
                  key={s.id}
                  className={cn(
                    "border-t border-border align-top",
                    s.status === "delayed" && "bg-[#fceeee]/60",
                  )}
                >
                  <td className="px-2 py-2 text-center tabular-nums text-muted-foreground">
                    {idx + 1}
                  </td>
                  <td className="px-2 py-2 text-left">
                    <Input
                      value={s.title}
                      placeholder="세부업무 내용"
                      className="h-8"
                      onChange={(e) =>
                        updateAt(idx, { title: e.target.value })
                      }
                    />
                  </td>
                  <td className="px-2 py-2">
                    <Input
                      value={s.ownerLabel}
                      placeholder="담당자"
                      className="h-8"
                      onChange={(e) =>
                        updateAt(idx, { ownerLabel: e.target.value })
                      }
                    />
                  </td>
                  <td className="px-2 py-2">
                    <select
                      className={cn(
                        "h-8 w-full rounded-md border bg-background px-1.5 text-center text-xs font-medium",
                        s.status === "delayed" &&
                          "border-red-300 text-dh-red",
                        s.status === "done" &&
                          "border-emerald-300 text-emerald-800",
                        s.status === "in_progress" &&
                          "border-dh-sea/50 text-dh-deep",
                        s.status === "planned" &&
                          "border-border text-muted-foreground",
                      )}
                      value={s.status}
                      onChange={(e) =>
                        updateAt(idx, {
                          status: e.target.value as SubTaskStatus,
                        })
                      }
                    >
                      {SUB_STATUSES.map((st) => (
                        <option key={st} value={st}>
                          {SUBTASK_STATUS_LABEL[st]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-2">
                    <Input
                      value={s.dueLabel}
                      placeholder="D-3d / 날짜"
                      className="h-8 text-center"
                      onChange={(e) =>
                        updateAt(idx, { dueLabel: e.target.value })
                      }
                    />
                  </td>
                  <td className="px-2 py-2 text-left">
                    {s.status === "delayed" ? (
                      <Input
                        value={s.delayReason}
                        placeholder="지연 사유 입력"
                        className="h-8 border-red-200 focus-visible:border-dh-red"
                        onChange={(e) =>
                          updateAt(idx, { delayReason: e.target.value })
                        }
                      />
                    ) : (
                      <span className="block px-1 py-1.5 text-center text-xs text-muted-foreground/50">
                        —
                      </span>
                    )}
                  </td>
                  <td className="px-1 py-2 text-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="text-dh-red"
                      aria-label="세부업무 삭제"
                      onClick={() =>
                        patchList(subtasks.filter((_, i) => i !== idx))
                      }
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
