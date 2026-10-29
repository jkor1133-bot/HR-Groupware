"use client";

import { useEffect, useState } from "react";
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
import { CATEGORIES, WEEKDAYS } from "@/lib/labels";
import type {
  TaskPriority,
  TaskStatus,
  TeamMember,
  WeeklyTask,
} from "@/lib/types";
import { addDays, formatYmd } from "@/lib/week";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  weekId: string;
  members: TeamMember[];
  initial?: WeeklyTask | null;
  onSave: (task: WeeklyTask) => void;
};

type FormState = {
  title: string;
  description: string;
  ownerId: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDay: WeeklyTask["dueDay"];
  category: string;
};

function emptyForm(members: TeamMember[]): FormState {
  return {
    title: "",
    description: "",
    ownerId: members[0]?.id ?? "",
    status: "planned",
    priority: "medium",
    dueDay: "월",
    category: "운영",
  };
}

export function TaskFormDialog({
  open,
  onOpenChange,
  weekId,
  members,
  initial,
  onSave,
}: Props) {
  const [form, setForm] = useState<FormState>(emptyForm(members));

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setForm({
        title: initial.title,
        description: initial.description,
        ownerId: initial.ownerId,
        status: initial.status,
        priority: initial.priority,
        dueDay: initial.dueDay,
        category: initial.category,
      });
    } else {
      setForm(emptyForm(members));
    }
  }, [open, initial, members]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.ownerId) return;

    const dayOffset = { 월: 0, 화: 1, 수: 2, 목: 3, 금: 4 }[form.dueDay];
    const dueDate = formatYmd(
      addDays(new Date(`${weekId}T00:00:00`), dayOffset),
    );

    onSave({
      id: initial?.id ?? `task-${crypto.randomUUID()}`,
      weekId,
      ownerId: form.ownerId,
      title: form.title.trim(),
      description: form.description.trim(),
      status: form.status,
      priority: form.priority,
      dueDay: form.dueDay,
      dueDate,
      category: form.category,
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
              이번 주에 진행할 인사 업무를 등록하거나 수정합니다.
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

            <div className="grid gap-4 sm:grid-cols-3">
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

              <div className="grid gap-2">
                <Label>목표 요일</Label>
                <Select
                  value={form.dueDay}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      dueDay: (v as WeeklyTask["dueDay"]) ?? f.dueDay,
                    }))
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
