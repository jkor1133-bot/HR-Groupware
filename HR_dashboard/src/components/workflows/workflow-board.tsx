"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  CircleDashed,
  Clock3,
  Plus,
  RotateCcw,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useMembers } from "@/hooks/use-members";
import { useWorkflows } from "@/hooks/use-workflows";
import type { WorkflowProcess, WorkflowStatus, WorkflowStep } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS_META: Record<
  WorkflowStatus,
  { label: string; className: string; Icon: typeof CheckCircle2 }
> = {
  done: {
    label: "완료",
    className: "border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200",
    Icon: CheckCircle2,
  },
  in_progress: {
    label: "진행",
    className: "border-sky-300 bg-sky-50 text-sky-900 dark:bg-sky-950/40 dark:text-sky-200",
    Icon: Clock3,
  },
  delayed: {
    label: "지연",
    className: "border-red-300 bg-red-50 text-dh-red dark:bg-red-950/40",
    Icon: TriangleAlert,
  },
  planned: {
    label: "예정",
    className: "border-border bg-muted text-muted-foreground",
    Icon: CircleDashed,
  },
};

function emptyProcess(defaultOwnerId: string): WorkflowProcess {
  const stamp = Date.now();
  return {
    id: `wf-${stamp}`,
    name: "",
    category: "일반",
    description: "",
    updatedAt: new Date().toISOString(),
    steps: [
      {
        id: `s-${stamp}-1`,
        title: "",
        ownerId: defaultOwnerId,
        dueLabel: "D-Day",
        status: "planned",
        stage: 1,
      },
    ],
  };
}

export function WorkflowBoard() {
  const { members } = useMembers();
  const { hydrated, processes, upsertProcess, deleteProcess, resetToSeed } =
    useWorkflows();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<WorkflowProcess | null>(null);
  const defaultOwnerId = members[0]?.id ?? "m1";

  const memberMap = useMemo(
    () => Object.fromEntries(members.map((m) => [m.id, m])),
    [members],
  );

  const stats = useMemo(() => {
    const steps = processes.flatMap((p) => p.steps);
    const done = steps.filter((s) => s.status === "done").length;
    const delayed = steps.filter((s) => s.status === "delayed").length;
    const inProgress = steps.filter((s) => s.status === "in_progress").length;
    return {
      total: steps.length,
      done,
      delayed,
      inProgress,
      rate: steps.length ? Math.round((done / steps.length) * 100) : 0,
    };
  }, [processes]);

  function openCreate() {
    setDraft(emptyProcess(defaultOwnerId));
    setOpen(true);
  }

  function openEdit(process: WorkflowProcess) {
    setDraft(JSON.parse(JSON.stringify(process)) as WorkflowProcess);
    setOpen(true);
  }

  function addStep() {
    if (!draft) return;
    const stage =
      Math.max(0, ...draft.steps.map((s) => s.stage)) + 1 || 1;
    const step: WorkflowStep = {
      id: `s-${Date.now()}`,
      title: "",
      ownerId: defaultOwnerId,
      dueLabel: "",
      status: "planned",
      stage,
    };
    setDraft({ ...draft, steps: [...draft.steps, step] });
  }

  function save() {
    if (!draft || !draft.name.trim()) return;
    const cleaned = {
      ...draft,
      name: draft.name.trim(),
      description: draft.description.trim(),
      steps: draft.steps.filter((s) => s.title.trim()),
      updatedAt: new Date().toISOString(),
    };
    if (cleaned.steps.length === 0) return;
    upsertProcess(cleaned);
    setOpen(false);
  }

  if (!hydrated) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
        업무기술서를 불러오는 중…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-semibold text-dh-deep dark:text-dh-light sm:text-2xl">
            업무기술서 · Work Flow
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            관례로 해오던 업무를 단계별 프로세스로 등록해, 입·퇴사 시에도
            인수인계가 가능하도록 만듭니다. 담당자가 직접 등록·수정할 수
            있습니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (window.confirm("샘플 Work Flow로 초기화할까요?")) {
                resetToSeed();
              }
            }}
          >
            <RotateCcw data-icon="inline-start" />
            샘플 초기화
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus data-icon="inline-start" />
            프로세스 등록
          </Button>
        </div>
      </div>

      <div className="grid gap-3 @md/app:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <p className="text-xs text-muted-foreground">완료율</p>
          <p className="mt-1 font-heading text-3xl font-semibold text-dh-deep dark:text-dh-light">
            {stats.rate}%
          </p>
          <p className="text-xs text-muted-foreground">
            {stats.done}/{stats.total} 단계
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <p className="text-xs text-muted-foreground">진행 중</p>
          <p className="mt-1 font-heading text-3xl font-semibold text-dh-sea">
            {stats.inProgress}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <p className="text-xs text-muted-foreground">지연</p>
          <p className="mt-1 font-heading text-3xl font-semibold text-dh-red">
            {stats.delayed}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {processes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-muted-foreground">
            등록된 프로세스가 없습니다. 첫 Work Flow를 등록해 주세요.
          </div>
        ) : (
          processes.map((process) => {
            const stages = [
              ...new Set(process.steps.map((s) => s.stage)),
            ].sort((a, b) => a - b);
            return (
              <section
                key={process.id}
                className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5"
              >
                <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-medium text-dh-sea">
                      {process.category}
                    </p>
                    <h2 className="font-heading text-lg font-semibold text-dh-deep dark:text-dh-light">
                      {process.name}
                    </h2>
                    {process.description ? (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {process.description}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEdit(process)}
                    >
                      수정
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (
                          window.confirm(
                            `"${process.name}" 프로세스를 삭제할까요?`,
                          )
                        ) {
                          deleteProcess(process.id);
                        }
                      }}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </div>

                <div className="flex flex-wrap items-stretch gap-2 overflow-x-auto pb-1">
                  {stages.map((stage, stageIdx) => {
                    const steps = process.steps.filter(
                      (s) => s.stage === stage,
                    );
                    return (
                      <div key={stage} className="flex items-stretch gap-2">
                        <div className="min-w-[180px] space-y-2">
                          <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                            {stage}단계
                          </p>
                          {steps.map((step) => {
                            const meta = STATUS_META[step.status];
                            const Icon = meta.Icon;
                            return (
                              <div
                                key={step.id}
                                className={cn(
                                  "rounded-lg border px-3 py-2.5",
                                  meta.className,
                                )}
                              >
                                <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium">
                                  <Icon className="size-3.5" />
                                  {meta.label}
                                </div>
                                <p className="text-sm font-semibold leading-snug">
                                  {step.title}
                                </p>
                                <p className="mt-1 text-xs opacity-80">
                                  {memberMap[step.ownerId]?.name ?? "미지정"} ·{" "}
                                  {step.dueLabel || "일정 미정"}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                        {stageIdx < stages.length - 1 ? (
                          <div className="flex items-center self-center text-muted-foreground">
                            →
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })
        )}
      </div>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setDraft(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Work Flow 등록</DialogTitle>
          </DialogHeader>
          {draft ? (
            <div className="grid gap-3 py-1">
              <div className="grid gap-1.5">
                <Label>프로세스명</Label>
                <Input
                  value={draft.name}
                  onChange={(e) =>
                    setDraft({ ...draft, name: e.target.value })
                  }
                  placeholder="예: 채용 → 입사 온보딩"
                />
              </div>
              <div className="grid gap-1.5">
                <Label>카테고리</Label>
                <Input
                  value={draft.category}
                  onChange={(e) =>
                    setDraft({ ...draft, category: e.target.value })
                  }
                  placeholder="채용 / 퇴직 / 급여 등"
                />
              </div>
              <div className="grid gap-1.5">
                <Label>설명</Label>
                <Textarea
                  value={draft.description}
                  onChange={(e) =>
                    setDraft({ ...draft, description: e.target.value })
                  }
                  placeholder="인수인계용으로 프로세스를 간단히 설명해 주세요"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>단계</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addStep}
                  >
                    <Plus data-icon="inline-start" />
                    단계 추가
                  </Button>
                </div>
                {draft.steps.map((step, idx) => (
                  <div
                    key={step.id}
                    className="grid gap-2 rounded-lg border border-border p-3"
                  >
                    <Input
                      placeholder={`${idx + 1}단계 업무명`}
                      value={step.title}
                      onChange={(e) => {
                        const steps = [...draft.steps];
                        steps[idx] = { ...step, title: e.target.value };
                        setDraft({ ...draft, steps });
                      }}
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <select
                        className="h-9 rounded-md border border-border bg-background px-2 text-sm"
                        value={step.ownerId}
                        onChange={(e) => {
                          const steps = [...draft.steps];
                          steps[idx] = { ...step, ownerId: e.target.value };
                          setDraft({ ...draft, steps });
                        }}
                      >
                        {members.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} {m.role}
                          </option>
                        ))}
                      </select>
                      <Input
                        placeholder="일정 (D-7)"
                        value={step.dueLabel}
                        onChange={(e) => {
                          const steps = [...draft.steps];
                          steps[idx] = { ...step, dueLabel: e.target.value };
                          setDraft({ ...draft, steps });
                        }}
                      />
                      <select
                        className="h-9 rounded-md border border-border bg-background px-2 text-sm"
                        value={step.status}
                        onChange={(e) => {
                          const steps = [...draft.steps];
                          steps[idx] = {
                            ...step,
                            status: e.target.value as WorkflowStatus,
                          };
                          setDraft({ ...draft, steps });
                        }}
                      >
                        <option value="planned">예정</option>
                        <option value="in_progress">진행</option>
                        <option value="done">완료</option>
                        <option value="delayed">지연</option>
                      </select>
                    </div>
                    <Input
                      type="number"
                      min={1}
                      placeholder="단계 번호"
                      value={step.stage}
                      onChange={(e) => {
                        const steps = [...draft.steps];
                        steps[idx] = {
                          ...step,
                          stage: Math.max(1, Number(e.target.value) || 1),
                        };
                        setDraft({ ...draft, steps });
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              취소
            </Button>
            <Button onClick={save}>저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
