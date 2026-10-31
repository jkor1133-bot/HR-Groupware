"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CATEGORIES, SUBTASK_STATUS_LABEL, WEEKDAYS } from "@/lib/labels";
import type {
  SubTaskStatus,
  TaskPriority,
  TaskStatus,
  TeamMember,
  WeeklySubTask,
  WeeklyTask,
} from "@/lib/types";
import { addDays, formatYmd, weekIdFromDate } from "@/lib/week";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  weekId: string;
  members: TeamMember[];
  initial?: WeeklyTask | null;
  onSave: (task: WeeklyTask) => void;
  /** 지정 시 담당자 고정(본인 업무만 등록) */
  lockedOwnerId?: string | null;
};

type FormState = {
  title: string;
  description: string;
  ownerId: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDay: WeeklyTask["dueDay"];
  startDate: string;
  endDate: string;
  category: string;
  subtasks: WeeklySubTask[];
};

const DAY_OFFSET: Record<WeeklyTask["dueDay"], number> = {
  월: 0,
  화: 1,
  수: 2,
  목: 3,
  금: 4,
};

const WEEKDAY_FROM_JS: Record<number, WeeklyTask["dueDay"] | null> = {
  0: null,
  1: "월",
  2: "화",
  3: "수",
  4: "목",
  5: "금",
  6: null,
};

function weekDayDate(weekId: string, dueDay: WeeklyTask["dueDay"]) {
  return formatYmd(
    addDays(new Date(`${weekId}T00:00:00`), DAY_OFFSET[dueDay]),
  );
}

function dueDayFromYmd(ymd: string): WeeklyTask["dueDay"] | null {
  const d = new Date(`${ymd}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return WEEKDAY_FROM_JS[d.getDay()] ?? null;
}

function emptySubtask(): WeeklySubTask {
  return {
    id: `st-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: "",
    ownerLabel: "",
    status: "planned",
    dueLabel: "",
    delayReason: "",
  };
}

function emptyForm(
  members: TeamMember[],
  weekId: string,
  lockedOwnerId?: string | null,
): FormState {
  const start = weekDayDate(weekId, "월");
  return {
    title: "",
    description: "",
    ownerId: lockedOwnerId || members[0]?.id || "",
    status: "planned",
    priority: "medium",
    dueDay: "월",
    startDate: start,
    endDate: start,
    category: "인사",
    subtasks: [],
  };
}

export function TaskFormDialog({
  open,
  onOpenChange,
  weekId,
  members,
  initial,
  onSave,
  lockedOwnerId,
}: Props) {
  const [form, setForm] = useState<FormState>(
    emptyForm(members, weekId, lockedOwnerId),
  );
  const ownerLocked = Boolean(lockedOwnerId);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      const start =
        initial.startDate ||
        initial.dueDate ||
        weekDayDate(weekId, initial.dueDay);
      const end = initial.endDate || initial.dueDate || start;
      setForm({
        title: initial.title,
        description: initial.description,
        ownerId: lockedOwnerId || initial.ownerId,
        status: initial.status,
        priority: initial.priority,
        dueDay: initial.dueDay,
        startDate: start,
        endDate: end,
        category: initial.category,
        subtasks: (initial.subtasks ?? []).map((s) => ({ ...s })),
      });
    } else {
      setForm(emptyForm(members, weekId, lockedOwnerId));
    }
  }, [open, initial, members, lockedOwnerId, weekId]);

  function setDueDay(dueDay: WeeklyTask["dueDay"]) {
    const d = weekDayDate(weekId, dueDay);
    setForm((f) => ({
      ...f,
      dueDay,
      startDate: f.startDate || d,
      endDate: f.endDate || d,
    }));
  }

  function setStartDate(startDate: string) {
    setForm((f) => {
      const day = dueDayFromYmd(startDate);
      let endDate = f.endDate;
      if (endDate && startDate && endDate < startDate) endDate = startDate;
      return {
        ...f,
        startDate,
        endDate,
        dueDay: day ?? f.dueDay,
      };
    });
  }

  function setEndDate(endDate: string) {
    setForm((f) => {
      let startDate = f.startDate;
      if (startDate && endDate && endDate < startDate) startDate = endDate;
      const day = dueDayFromYmd(endDate || startDate);
      return {
        ...f,
        startDate,
        endDate,
        dueDay: day ?? f.dueDay,
      };
    });
  }

  function updateSub(idx: number, patch: Partial<WeeklySubTask>) {
    setForm((f) => ({
      ...f,
      subtasks: f.subtasks.map((s, i) => {
        if (i !== idx) return s;
        const merged = { ...s, ...patch };
        if (merged.status !== "delayed") merged.delayReason = "";
        return merged;
      }),
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const ownerId = lockedOwnerId || form.ownerId;
    if (!form.title.trim() || !ownerId) return;

    let startDate = form.startDate;
    let endDate = form.endDate;
    if (!startDate && !endDate) {
      startDate = weekDayDate(weekId, form.dueDay);
      endDate = startDate;
    }
    if (startDate && !endDate) endDate = startDate;
    if (endDate && !startDate) startDate = endDate;
    if (startDate && endDate && endDate < startDate) {
      const t = startDate;
      startDate = endDate;
      endDate = t;
    }

    const dueDay =
      dueDayFromYmd(endDate || startDate) ||
      form.dueDay;

    const subtasks = form.subtasks
      .filter((s) => s.title.trim())
      .map((s) => ({
        ...s,
        title: s.title.trim(),
        ownerLabel: s.ownerLabel.trim(),
        delayReason: s.status === "delayed" ? s.delayReason.trim() : "",
      }));

    const anchor = startDate || endDate;
    const resolvedWeekId = anchor
      ? weekIdFromDate(new Date(`${anchor}T00:00:00`))
      : weekId;

    onSave({
      id: initial?.id ?? `task-${crypto.randomUUID()}`,
      weekId: resolvedWeekId,
      ownerId,
      title: form.title.trim(),
      description: form.description.trim(),
      status: form.status,
      priority: form.priority,
      dueDay,
      dueDate: endDate || startDate,
      startDate,
      endDate,
      category: form.category,
      subtasks,
      updatedAt: new Date().toISOString(),
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {initial ? "업무 수정" : "주간 업무 추가"}
            </DialogTitle>
            <DialogDescription>
              이번 주 업무와 세부업무·기간을 함께 등록합니다.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="title">업무명</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
                placeholder="예: 신입 온보딩 체크리스트 점검"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">상세 내용</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="구체적으로 무엇을 할지 적어 주세요"
                rows={3}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>담당자</Label>
                {ownerLocked ? (
                  <div className="flex h-9 items-center rounded-md border border-border bg-muted/40 px-3 text-sm">
                    {members.find((m) => m.id === lockedOwnerId)?.name ??
                      "본인"}{" "}
                    ·{" "}
                    {members.find((m) => m.id === lockedOwnerId)?.role ?? ""}
                    <span className="ml-2 text-[11px] text-muted-foreground">
                      (본인 업무만 등록)
                    </span>
                  </div>
                ) : (
                  <Select
                    value={form.ownerId}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, ownerId: v ?? f.ownerId }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="담당자 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {members.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name} · {m.role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="grid gap-2">
                <Label>카테고리</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, category: v ?? f.category }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="카테고리" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>상태</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      status: (v as TaskStatus) ?? f.status,
                    }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planned">예정</SelectItem>
                    <SelectItem value="in_progress">진행 중</SelectItem>
                    <SelectItem value="done">완료</SelectItem>
                    <SelectItem value="delayed">지연</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>우선순위</Label>
                <Select
                  value={form.priority}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      priority: (v as TaskPriority) ?? f.priority,
                    }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">높음</SelectItem>
                    <SelectItem value="medium">보통</SelectItem>
                    <SelectItem value="low">낮음</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2 rounded-lg border border-border p-3">
              <Label>목표 요일 · 기간</Label>
              <p className="text-[11px] text-muted-foreground">
                요일은 목록 표시용입니다. 실제 캘린더에는 아래 시작일~종료일이
                반영됩니다.
              </p>
              <div className="grid gap-2 sm:grid-cols-3">
                <div className="grid gap-1.5">
                  <span className="text-[11px] text-muted-foreground">
                    목표 요일
                  </span>
                  <Select
                    value={form.dueDay}
                    onValueChange={(v) =>
                      setDueDay((v as WeeklyTask["dueDay"]) ?? form.dueDay)
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WEEKDAYS.map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}요일
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <span className="text-[11px] text-muted-foreground">
                    시작일
                  </span>
                  <Input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="grid gap-1.5">
                  <span className="text-[11px] text-muted-foreground">
                    종료일
                  </span>
                  <Input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2 rounded-lg border border-dh-sea/30 bg-[#f7fbfe] p-3 dark:bg-dh-deep/20">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <Label>세부업무</Label>
                  <p className="text-[11px] text-muted-foreground">
                    등록과 동시에 단계를 나눠 둘 수 있습니다. 기한은
                    Calendar에 「주간업무」로 표시됩니다.
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      subtasks: [...f.subtasks, emptySubtask()],
                    }))
                  }
                >
                  <Plus className="size-3.5" />
                  세부업무 추가
                </Button>
              </div>

              {form.subtasks.length === 0 ? (
                <p className="rounded-md border border-dashed border-border bg-card/60 px-3 py-4 text-center text-xs text-muted-foreground">
                  아직 세부업무가 없습니다. 「세부업무 추가」로 단계를
                  나눠보세요.
                </p>
              ) : (
                <ul className="space-y-2">
                  {form.subtasks.map((s, idx) => (
                    <li
                      key={s.id}
                      className="grid gap-2 rounded-md border border-border bg-card p-2.5"
                    >
                      <div className="flex items-start gap-2">
                        <span className="mt-2 w-6 shrink-0 text-center text-xs text-muted-foreground">
                          {idx + 1}
                        </span>
                        <Input
                          placeholder="세부내용"
                          value={s.title}
                          className="h-8"
                          onChange={(e) =>
                            updateSub(idx, { title: e.target.value })
                          }
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 shrink-0 px-2 text-dh-red"
                          onClick={() =>
                            setForm((f) => ({
                              ...f,
                              subtasks: f.subtasks.filter((_, i) => i !== idx),
                            }))
                          }
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-3 gap-2 pl-8">
                        <Input
                          placeholder="담당자"
                          value={s.ownerLabel}
                          className="h-8"
                          onChange={(e) =>
                            updateSub(idx, { ownerLabel: e.target.value })
                          }
                        />
                        <select
                          className="h-8 rounded-md border border-border bg-background px-2 text-xs"
                          value={s.status}
                          onChange={(e) =>
                            updateSub(idx, {
                              status: e.target.value as SubTaskStatus,
                            })
                          }
                        >
                          {(
                            Object.keys(SUBTASK_STATUS_LABEL) as SubTaskStatus[]
                          ).map((st) => (
                            <option key={st} value={st}>
                              {SUBTASK_STATUS_LABEL[st]}
                            </option>
                          ))}
                        </select>
                        <Input
                          type="date"
                          value={
                            /^\d{4}-\d{2}-\d{2}$/.test(s.dueLabel.trim())
                              ? s.dueLabel.trim()
                              : ""
                          }
                          className="h-8"
                          onChange={(e) =>
                            updateSub(idx, { dueLabel: e.target.value })
                          }
                        />
                      </div>
                      {s.status === "delayed" ? (
                        <Input
                          placeholder="지연 사유"
                          value={s.delayReason}
                          className="h-8 border-red-200 pl-8"
                          onChange={(e) =>
                            updateSub(idx, { delayReason: e.target.value })
                          }
                        />
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              취소
            </Button>
            <Button type="submit">{initial ? "저장" : "추가"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
