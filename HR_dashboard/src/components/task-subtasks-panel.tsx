"use client";

import { useState, type DragEvent } from "react";
import { AlertTriangle, GripVertical, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWeeklyPlans } from "@/hooks/use-weekly-plans";
import { SUBTASK_STATUS_LABEL } from "@/lib/labels";
import type { SubTaskStatus, WeeklySubTask, WeeklyTask } from "@/lib/types";
import {
  deriveTaskStatusFromSubtasks,
  normalizeWeeklySubTask,
} from "@/lib/weekly-calendar";
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
    startDate: "",
    endDate: "",
    dueLabel: "",
    delayReason: "",
  };
}

function ymdValue(raw: string | undefined) {
  const t = (raw ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(t) ? t : "";
}

function reorderList<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) {
    return list;
  }
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function TaskSubtasksPanel({
  task,
  onChange,
}: {
  task: WeeklyTask;
  onChange: (next: WeeklyTask) => void;
}) {
  const { members } = useWeeklyPlans();
  const subtasks = (task.subtasks ?? []).map(normalizeWeeklySubTask);
  const delayedCount = subtasks.filter((s) => s.status === "delayed").length;
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const memberNames = members.map((m) => m.name).filter(Boolean);
  const ownerOptions = Array.from(
    new Set([
      ...memberNames,
      ...subtasks.map((s) => s.ownerLabel.trim()).filter(Boolean),
    ]),
  );

  function patchList(next: WeeklySubTask[]) {
    const normalized = next.map(normalizeWeeklySubTask);
    onChange({
      ...task,
      subtasks: normalized,
      status: deriveTaskStatusFromSubtasks(task.status, normalized),
      updatedAt: new Date().toISOString(),
    });
  }

  function updateAt(idx: number, patch: Partial<WeeklySubTask>) {
    patchList(
      subtasks.map((s, i) => {
        if (i !== idx) return s;
        const merged = normalizeWeeklySubTask({ ...s, ...patch });
        if (merged.status !== "delayed") merged.delayReason = "";
        return merged;
      }),
    );
  }

  function onRowDragStart(idx: number, e: DragEvent) {
    setDragIndex(idx);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(idx));
  }

  function onRowDragOver(idx: number, e: DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (overIndex !== idx) setOverIndex(idx);
  }

  function onRowDrop(idx: number, e: DragEvent) {
    e.preventDefault();
    const from =
      dragIndex ?? Number(e.dataTransfer.getData("text/plain"));
    if (Number.isFinite(from)) {
      patchList(reorderList(subtasks, from, idx));
    }
    setDragIndex(null);
    setOverIndex(null);
  }

  function onRowDragEnd() {
    setDragIndex(null);
    setOverIndex(null);
  }

  return (
    <div className="space-y-3 rounded-lg border border-dh-sea/30 bg-[#f7fbfe] p-3 dark:bg-dh-deep/20">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-dh-deep dark:text-dh-light">
            세부업무 · 병목 관리
          </p>
          <p className="text-xs text-muted-foreground">
            단계별 시작·마감·상태·지연사유를 기록합니다. 캘린더에는 본업무만
            표시되며, 왼쪽 손잡이로 순서를 바꿀 수 있습니다.
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
        <table className="gw-data-table w-full min-w-[900px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
              <th className="w-8 px-1 py-2.5 text-center align-middle" />
              <th className="w-12 px-2 py-2.5 text-center align-middle font-medium">
                구분
              </th>
              <th className="px-2 py-2.5 text-center align-middle font-medium">
                세부내용
              </th>
              <th className="w-[8.5rem] px-2 py-2.5 text-center align-middle font-medium">
                담당자
              </th>
              <th className="w-[7.5rem] px-2 py-2.5 text-center align-middle font-medium">
                상태
              </th>
              <th className="w-[7.5rem] px-2 py-2.5 text-center align-middle font-medium">
                시작일
              </th>
              <th className="w-[7.5rem] px-2 py-2.5 text-center align-middle font-medium">
                마감일
              </th>
              <th className="min-w-[12rem] px-2 py-2.5 text-center align-middle font-medium">
                지연사유
              </th>
              <th className="w-10 px-1 py-2.5 text-center align-middle" />
            </tr>
          </thead>
          <tbody>
            {subtasks.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
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
                  draggable={false}
                  onDragOver={(e) => onRowDragOver(idx, e)}
                  onDrop={(e) => onRowDrop(idx, e)}
                  onDragEnd={onRowDragEnd}
                  className={cn(
                    "border-t border-border align-middle transition-colors",
                    s.status === "delayed" && "bg-[#fceeee]/60",
                    dragIndex === idx && "opacity-50",
                    overIndex === idx &&
                      dragIndex !== null &&
                      dragIndex !== idx &&
                      "border-t-2 border-t-dh-sea bg-dh-sky/10",
                  )}
                >
                  <td className="px-1 py-2 text-center align-middle">
                    <button
                      type="button"
                      draggable
                      title="드래그하여 순서 변경"
                      aria-label={`${idx + 1}번 세부업무 순서 변경`}
                      className="inline-flex cursor-grab touch-none rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing"
                      onDragStart={(e) => onRowDragStart(idx, e)}
                      onDragEnd={onRowDragEnd}
                    >
                      <GripVertical className="size-4" />
                    </button>
                  </td>
                  <td className="px-2 py-2 text-center align-middle tabular-nums text-muted-foreground">
                    {idx + 1}
                  </td>
                  <td className="px-2 py-2 text-center align-middle">
                    <Input
                      value={s.title}
                      placeholder="세부업무 내용"
                      className="h-8 text-center"
                      onChange={(e) =>
                        updateAt(idx, { title: e.target.value })
                      }
                    />
                  </td>
                  <td className="px-2 py-2 text-center align-middle">
                    <select
                      className="h-8 w-full rounded-md border border-border bg-background px-1.5 text-center text-xs"
                      value={s.ownerLabel}
                      onChange={(e) =>
                        updateAt(idx, { ownerLabel: e.target.value })
                      }
                    >
                      <option value="">담당자 선택</option>
                      {ownerOptions.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-2 text-center align-middle">
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
                  <td className="px-2 py-2 text-center align-middle">
                    <Input
                      type="date"
                      value={ymdValue(s.startDate)}
                      title="시작일"
                      className="h-8 text-center"
                      onChange={(e) => {
                        const startDate = e.target.value;
                        updateAt(idx, {
                          startDate,
                          endDate:
                            s.endDate && startDate && s.endDate < startDate
                              ? startDate
                              : s.endDate,
                        });
                      }}
                    />
                  </td>
                  <td className="px-2 py-2 text-center align-middle">
                    <Input
                      type="date"
                      value={ymdValue(s.endDate)}
                      title="마감일"
                      className="h-8 text-center"
                      onChange={(e) => {
                        const endDate = e.target.value;
                        updateAt(idx, {
                          endDate,
                          startDate:
                            s.startDate && endDate && endDate < s.startDate
                              ? endDate
                              : s.startDate,
                          dueLabel: endDate,
                        });
                      }}
                    />
                  </td>
                  <td className="px-2 py-2 text-center align-middle">
                    {s.status === "delayed" ? (
                      <Input
                        value={s.delayReason}
                        placeholder="지연 사유 입력"
                        className="h-8 text-center border-red-200 focus-visible:border-dh-red"
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
                  <td className="px-1 py-2 text-center align-middle">
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
