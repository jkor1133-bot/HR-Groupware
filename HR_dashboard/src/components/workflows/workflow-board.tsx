"use client";

import { useMemo, useRef, useState } from "react";
import {
  FileText,
  History,
  Paperclip,
  Plus,
  RotateCcw,
  Trash2,
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
import type {
  WorkflowAttachment,
  WorkflowDomain,
  WorkflowProcess,
  WorkflowStandardChange,
  WorkflowStep,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const DOMAIN_TABS: { id: WorkflowDomain; label: string }[] = [
  { id: "hr", label: "인사" },
  { id: "ga", label: "총무" },
  { id: "planning", label: "기획" },
];

const MAX_FILE_BYTES = 2 * 1024 * 1024;

function emptyStep(defaultOwnerId: string, stage = 1): WorkflowStep {
  return {
    id: `s-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: "",
    ownerId: defaultOwnerId,
    dueLabel: "",
    stage,
    standardLabel: "",
    attachments: [],
    changeHistory: [],
  };
}

function emptyProcess(
  defaultOwnerId: string,
  domain: WorkflowDomain,
): WorkflowProcess {
  const stamp = Date.now();
  return {
    id: `wf-${stamp}`,
    name: "",
    domain,
    category: "일반",
    description: "",
    updatedAt: new Date().toISOString(),
    steps: [emptyStep(defaultOwnerId, 1)],
  };
}

function emptyChangeDraft(): Omit<WorkflowStandardChange, "id" | "createdAt"> {
  return {
    changedAt: new Date().toISOString().slice(0, 10),
    fromLabel: "",
    toLabel: "",
    reason: "",
  };
}

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function readFileAsAttachment(file: File): Promise<WorkflowAttachment> {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_FILE_BYTES) {
      reject(
        new Error(`파일은 ${formatBytes(MAX_FILE_BYTES)} 이하만 가능합니다.`),
      );
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: file.name,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        dataUrl: String(reader.result ?? ""),
        uploadedAt: new Date().toISOString(),
      });
    };
    reader.onerror = () => reject(new Error("파일을 읽지 못했습니다."));
    reader.readAsDataURL(file);
  });
}

function normalizeStep(s: WorkflowStep): WorkflowStep {
  return {
    ...s,
    standardLabel: s.standardLabel ?? "",
    attachments: s.attachments ?? [],
    changeHistory: s.changeHistory ?? [],
  };
}

export function WorkflowBoard() {
  const { members } = useMembers();
  const { hydrated, processes, upsertProcess, deleteProcess, resetToSeed } =
    useWorkflows();
  const [domain, setDomain] = useState<WorkflowDomain>("hr");
  const [processOpen, setProcessOpen] = useState(false);
  const [processDraft, setProcessDraft] = useState<WorkflowProcess | null>(
    null,
  );
  const [stepOpen, setStepOpen] = useState(false);
  const [stepProcessId, setStepProcessId] = useState<string | null>(null);
  const [stepDraft, setStepDraft] = useState<WorkflowStep | null>(null);
  const [changeDraft, setChangeDraft] = useState(emptyChangeDraft());
  const [fileError, setFileError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const defaultOwnerId = members[0]?.id ?? "m1";

  const memberMap = useMemo(
    () => Object.fromEntries(members.map((m) => [m.id, m])),
    [members],
  );

  const filtered = useMemo(
    () => processes.filter((p) => (p.domain ?? "hr") === domain),
    [processes, domain],
  );

  function openCreateProcess() {
    setProcessDraft(emptyProcess(defaultOwnerId, domain));
    setProcessOpen(true);
  }

  function openEditProcess(process: WorkflowProcess) {
    setProcessDraft(JSON.parse(JSON.stringify(process)) as WorkflowProcess);
    setProcessOpen(true);
  }

  function openEditStep(process: WorkflowProcess, step: WorkflowStep) {
    setStepProcessId(process.id);
    setStepDraft(normalizeStep(JSON.parse(JSON.stringify(step)) as WorkflowStep));
    setChangeDraft({
      ...emptyChangeDraft(),
      fromLabel: step.standardLabel ?? "",
    });
    setFileError("");
    setStepOpen(true);
  }

  function addProcessStep() {
    if (!processDraft) return;
    const stage =
      Math.max(0, ...processDraft.steps.map((s) => s.stage)) + 1 || 1;
    setProcessDraft({
      ...processDraft,
      steps: [...processDraft.steps, emptyStep(defaultOwnerId, stage)],
    });
  }

  function saveProcess() {
    if (!processDraft || !processDraft.name.trim()) return;
    const cleaned: WorkflowProcess = {
      ...processDraft,
      name: processDraft.name.trim(),
      description: processDraft.description.trim(),
      category: processDraft.category.trim() || "일반",
      steps: processDraft.steps
        .filter((s) => s.title.trim())
        .map(normalizeStep),
      updatedAt: new Date().toISOString(),
    };
    if (cleaned.steps.length === 0) return;
    upsertProcess(cleaned);
    setProcessOpen(false);
  }

  async function onPickFiles(files: FileList | null) {
    if (!stepDraft || !files?.length) return;
    setFileError("");
    try {
      const next: WorkflowAttachment[] = [...(stepDraft.attachments ?? [])];
      for (const file of Array.from(files)) {
        next.push(await readFileAsAttachment(file));
      }
      setStepDraft({ ...stepDraft, attachments: next });
    } catch (e) {
      setFileError(e instanceof Error ? e.message : "파일 첨부 실패");
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  function addChangeHistory() {
    if (!stepDraft) return;
    const fromLabel = changeDraft.fromLabel.trim();
    const toLabel = changeDraft.toLabel.trim();
    const reason = changeDraft.reason.trim();
    if (!fromLabel || !toLabel || !reason || !changeDraft.changedAt) return;

    const entry: WorkflowStandardChange = {
      id: `chg-${Date.now()}`,
      changedAt: changeDraft.changedAt,
      fromLabel,
      toLabel,
      reason,
      createdAt: new Date().toISOString(),
    };
    setStepDraft({
      ...stepDraft,
      standardLabel: toLabel,
      changeHistory: [entry, ...(stepDraft.changeHistory ?? [])],
    });
    setChangeDraft({ ...emptyChangeDraft(), fromLabel: toLabel });
  }

  function saveStep() {
    if (!stepDraft || !stepProcessId || !stepDraft.title.trim()) return;
    const process = processes.find((p) => p.id === stepProcessId);
    if (!process) return;
    const nextStep = normalizeStep(stepDraft);
    upsertProcess({
      ...process,
      steps: process.steps.map((s) => (s.id === nextStep.id ? nextStep : s)),
      updatedAt: new Date().toISOString(),
    });
    setStepOpen(false);
    setStepDraft(null);
    setStepProcessId(null);
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
            프로세스는 「수정」으로, 각 단계(카드)는 클릭해서 기준 파일·변경
            이력을 관리합니다.
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
          <Button size="sm" onClick={openCreateProcess}>
            <Plus data-icon="inline-start" />
            프로세스 등록
          </Button>
        </div>
      </div>

      <div className="inline-flex rounded-lg border border-border bg-card p-1 shadow-sm">
        {DOMAIN_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setDomain(t.id)}
            className={cn(
              "rounded-md px-4 py-1.5 text-sm font-medium transition",
              domain === t.id
                ? "bg-dh-real text-white"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-muted-foreground">
            이 영역에 등록된 프로세스가 없습니다. 「프로세스 등록」으로 추가해
            주세요.
          </div>
        ) : (
          filtered.map((process) => {
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
                      onClick={() => openEditProcess(process)}
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
                            const fileCount = step.attachments?.length ?? 0;
                            const histCount = step.changeHistory?.length ?? 0;
                            return (
                              <button
                                key={step.id}
                                type="button"
                                onClick={() => openEditStep(process, step)}
                                className="w-full rounded-lg border border-amber-200/80 bg-amber-50 px-3 py-2.5 text-left transition hover:border-dh-sea hover:bg-amber-100/80 dark:border-amber-900/40 dark:bg-amber-950/30 dark:hover:bg-amber-950/50"
                              >
                                <p className="text-sm font-semibold leading-snug text-foreground">
                                  {step.title}
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {memberMap[step.ownerId]?.name ?? "미지정"}
                                  {step.dueLabel ? ` · ${step.dueLabel}` : ""}
                                </p>
                                {step.standardLabel ||
                                fileCount > 0 ||
                                histCount > 0 ? (
                                  <p className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-dh-deep dark:text-dh-sky">
                                    {step.standardLabel ? (
                                      <span>기준 {step.standardLabel}</span>
                                    ) : null}
                                    {fileCount > 0 ? (
                                      <span className="inline-flex items-center gap-0.5">
                                        <Paperclip className="size-3" />
                                        {fileCount}
                                      </span>
                                    ) : null}
                                    {histCount > 0 ? (
                                      <span className="inline-flex items-center gap-0.5">
                                        <History className="size-3" />
                                        {histCount}
                                      </span>
                                    ) : null}
                                  </p>
                                ) : (
                                  <p className="mt-1.5 text-[11px] text-muted-foreground">
                                    클릭하여 기준·파일 등록
                                  </p>
                                )}
                              </button>
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

      {/* 프로세스 등록/수정 — 이름·단계 구성만 */}
      <Dialog
        open={processOpen}
        onOpenChange={(next) => {
          setProcessOpen(next);
          if (!next) setProcessDraft(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>프로세스 등록·수정</DialogTitle>
          </DialogHeader>
          {processDraft ? (
            <div className="grid gap-3 py-1">
              <p className="text-[11px] text-muted-foreground">
                기준 파일·변경 이력은 저장 후 각 단계 카드를 클릭해 등록하세요.
              </p>
              <div className="grid gap-1.5">
                <Label>프로세스명</Label>
                <Input
                  value={processDraft.name}
                  onChange={(e) =>
                    setProcessDraft({ ...processDraft, name: e.target.value })
                  }
                  placeholder="예: 채용 → 입사 온보딩"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-1.5">
                  <Label>영역</Label>
                  <select
                    className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
                    value={processDraft.domain ?? "hr"}
                    onChange={(e) =>
                      setProcessDraft({
                        ...processDraft,
                        domain: e.target.value as WorkflowDomain,
                      })
                    }
                  >
                    {DOMAIN_TABS.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-1.5">
                  <Label>카테고리</Label>
                  <Input
                    value={processDraft.category}
                    onChange={(e) =>
                      setProcessDraft({
                        ...processDraft,
                        category: e.target.value,
                      })
                    }
                    placeholder="채용 / 퇴직 / 급여 등"
                  />
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label>설명</Label>
                <Textarea
                  value={processDraft.description}
                  onChange={(e) =>
                    setProcessDraft({
                      ...processDraft,
                      description: e.target.value,
                    })
                  }
                  placeholder="프로세스 개요"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>프로세스 단계</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addProcessStep}
                  >
                    <Plus data-icon="inline-start" />
                    단계 추가
                  </Button>
                </div>
                {processDraft.steps.map((step, idx) => (
                  <div
                    key={step.id}
                    className="grid gap-2 rounded-lg border border-border p-3"
                  >
                    <Input
                      placeholder={`${idx + 1}단계 업무명`}
                      value={step.title}
                      onChange={(e) => {
                        const steps = [...processDraft.steps];
                        steps[idx] = { ...step, title: e.target.value };
                        setProcessDraft({ ...processDraft, steps });
                      }}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        className="h-9 rounded-md border border-border bg-background px-2 text-sm"
                        value={step.ownerId}
                        onChange={(e) => {
                          const steps = [...processDraft.steps];
                          steps[idx] = { ...step, ownerId: e.target.value };
                          setProcessDraft({ ...processDraft, steps });
                        }}
                      >
                        {members.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} {m.role}
                          </option>
                        ))}
                      </select>
                      <Input
                        placeholder="표준 일정 (D-7)"
                        value={step.dueLabel}
                        onChange={(e) => {
                          const steps = [...processDraft.steps];
                          steps[idx] = { ...step, dueLabel: e.target.value };
                          setProcessDraft({ ...processDraft, steps });
                        }}
                      />
                    </div>
                    <Input
                      type="number"
                      min={1}
                      placeholder="단계 번호"
                      value={step.stage}
                      onChange={(e) => {
                        const steps = [...processDraft.steps];
                        steps[idx] = {
                          ...step,
                          stage: Math.max(1, Number(e.target.value) || 1),
                        };
                        setProcessDraft({ ...processDraft, steps });
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setProcessOpen(false)}>
              취소
            </Button>
            <Button onClick={saveProcess}>저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 단계 개별 수정 — 기준·파일·이력 */}
      <Dialog
        open={stepOpen}
        onOpenChange={(next) => {
          setStepOpen(next);
          if (!next) {
            setStepDraft(null);
            setStepProcessId(null);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>단계 기준 · 파일</DialogTitle>
          </DialogHeader>
          {stepDraft ? (
            <div className="grid gap-3 py-1">
              <div className="grid gap-1.5">
                <Label>단계 업무명</Label>
                <Input
                  value={stepDraft.title}
                  onChange={(e) =>
                    setStepDraft({ ...stepDraft, title: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-1.5">
                  <Label>담당</Label>
                  <select
                    className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
                    value={stepDraft.ownerId}
                    onChange={(e) =>
                      setStepDraft({ ...stepDraft, ownerId: e.target.value })
                    }
                  >
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} {m.role}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-1.5">
                  <Label>표준 일정</Label>
                  <Input
                    value={stepDraft.dueLabel}
                    onChange={(e) =>
                      setStepDraft({ ...stepDraft, dueLabel: e.target.value })
                    }
                    placeholder="D-14"
                  />
                </div>
              </div>

              <div className="grid gap-1.5">
                <Label>현재 기준 명칭</Label>
                <Input
                  value={stepDraft.standardLabel ?? ""}
                  onChange={(e) =>
                    setStepDraft({
                      ...stepDraft,
                      standardLabel: e.target.value,
                    })
                  }
                  placeholder="예: 기준 B / 2024 개정안"
                />
              </div>

              <div className="space-y-2 rounded-lg border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <Label className="flex items-center gap-1.5">
                    <FileText className="size-3.5" />
                    기준 파일
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileRef.current?.click()}
                  >
                    <Paperclip data-icon="inline-start" />
                    파일 첨부
                  </Button>
                  <input
                    ref={fileRef}
                    type="file"
                    className="hidden"
                    multiple
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.hwp,.hwpx,.txt,.png,.jpg,.jpeg"
                    onChange={(e) => onPickFiles(e.target.files)}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  이 단계 업무의 기준 문서 · 파일당{" "}
                  {formatBytes(MAX_FILE_BYTES)} 이하
                </p>
                {fileError ? (
                  <p className="text-xs font-medium text-dh-red">{fileError}</p>
                ) : null}
                {(stepDraft.attachments?.length ?? 0) === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    첨부된 파일 없음
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {stepDraft.attachments!.map((att) => (
                      <li
                        key={att.id}
                        className="flex items-center justify-between gap-2 rounded-md bg-muted/40 px-2 py-1.5 text-xs"
                      >
                        <a
                          href={att.dataUrl}
                          download={att.name}
                          className="truncate hover:underline"
                        >
                          {att.name}{" "}
                          <span className="text-muted-foreground">
                            ({formatBytes(att.size)})
                          </span>
                        </a>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-dh-red"
                          onClick={() =>
                            setStepDraft({
                              ...stepDraft,
                              attachments: (stepDraft.attachments ?? []).filter(
                                (a) => a.id !== att.id,
                              ),
                            })
                          }
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="space-y-2 rounded-lg border border-border p-3">
                <Label className="flex items-center gap-1.5">
                  <History className="size-3.5" />
                  기준 변경 이력 추가
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="grid gap-1">
                    <span className="text-[11px] text-muted-foreground">
                      이전 기준
                    </span>
                    <Input
                      value={changeDraft.fromLabel}
                      onChange={(e) =>
                        setChangeDraft((d) => ({
                          ...d,
                          fromLabel: e.target.value,
                        }))
                      }
                      placeholder="A"
                    />
                  </div>
                  <div className="grid gap-1">
                    <span className="text-[11px] text-muted-foreground">
                      변경 후
                    </span>
                    <Input
                      value={changeDraft.toLabel}
                      onChange={(e) =>
                        setChangeDraft((d) => ({
                          ...d,
                          toLabel: e.target.value,
                        }))
                      }
                      placeholder="B"
                    />
                  </div>
                </div>
                <Input
                  type="date"
                  value={changeDraft.changedAt}
                  onChange={(e) =>
                    setChangeDraft((d) => ({
                      ...d,
                      changedAt: e.target.value,
                    }))
                  }
                />
                <Textarea
                  value={changeDraft.reason}
                  onChange={(e) =>
                    setChangeDraft((d) => ({ ...d, reason: e.target.value }))
                  }
                  placeholder="변경 사유"
                  rows={2}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addChangeHistory}
                >
                  <Plus data-icon="inline-start" />
                  이력 추가
                </Button>
                {(stepDraft.changeHistory?.length ?? 0) > 0 ? (
                  <ul className="space-y-1.5 border-t border-border pt-2">
                    {stepDraft.changeHistory!.map((h) => (
                      <li
                        key={h.id}
                        className="flex items-start justify-between gap-2 rounded-md bg-muted/40 px-2 py-1.5 text-xs"
                      >
                        <div>
                          <p className="font-medium">
                            {h.changedAt} · {h.fromLabel} → {h.toLabel}
                          </p>
                          <p className="text-muted-foreground">{h.reason}</p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 shrink-0 px-2 text-dh-red"
                          onClick={() =>
                            setStepDraft({
                              ...stepDraft,
                              changeHistory: (
                                stepDraft.changeHistory ?? []
                              ).filter((c) => c.id !== h.id),
                            })
                          }
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setStepOpen(false)}>
              취소
            </Button>
            <Button onClick={saveStep}>저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
