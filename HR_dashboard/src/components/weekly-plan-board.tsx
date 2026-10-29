"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Plus,
  RotateCcw,
  Upload,
  Pencil,
  Trash2,
} from "lucide-react";
import { PriorityBadge, StatusBadge } from "@/components/status-badge";
import { TaskFormDialog } from "@/components/task-form-dialog";
import { TaskSubtasksPanel } from "@/components/task-subtasks-panel";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useWeeklyPlans } from "@/hooks/use-weekly-plans";
import type { TaskStatus, WeeklyTask } from "@/lib/types";
import {
  isCurrentWeek,
  shiftWeek,
  weekIdFromDate,
  weekLabel,
} from "@/lib/week";
import { cn } from "@/lib/utils";

type FilterStatus = TaskStatus | "all";

export function WeeklyPlanBoard() {
  const {
    hydrated,
    members,
    tasksByWeek,
    upsertTask,
    deleteTask,
    resetToSeed,
    exportJson,
    importJson,
  } = useWeeklyPlans();

  const [weekId, setWeekId] = useState<string | null>(null);
  const [ownerFilter, setOwnerFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<WeeklyTask | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setWeekId(weekIdFromDate(new Date()));
  }, []);

  const weekTasks = useMemo(() => {
    if (!weekId) return [];
    let list = tasksByWeek(weekId);
    if (ownerFilter !== "all") {
      list = list.filter((t) => t.ownerId === ownerFilter);
    }
    if (statusFilter !== "all") {
      list = list.filter((t) => t.status === statusFilter);
    }
    const dayOrder = { 월: 0, 화: 1, 수: 2, 목: 3, 금: 4 };
    return [...list].sort(
      (a, b) => dayOrder[a.dueDay] - dayOrder[b.dueDay] || a.title.localeCompare(b.title, "ko"),
    );
  }, [tasksByWeek, weekId, ownerFilter, statusFilter]);

  const summary = useMemo(() => {
    const all = weekId ? tasksByWeek(weekId) : [];
    return {
      total: all.length,
      done: all.filter((t) => t.status === "done").length,
      inProgress: all.filter((t) => t.status === "in_progress").length,
      delayed: all.filter((t) => t.status === "delayed").length,
      planned: all.filter((t) => t.status === "planned").length,
    };
  }, [tasksByWeek, weekId]);

  const memberMap = useMemo(
    () => Object.fromEntries(members.map((m) => [m.id, m])),
    [members],
  );

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(task: WeeklyTask) {
    setEditing(task);
    setDialogOpen(true);
  }

  async function onImportFile(file: File | undefined) {
    if (!file) return;
    setImportError(null);
    try {
      await importJson(file);
    } catch {
      setImportError("파일을 불러오지 못했습니다. JSON 형식을 확인해 주세요.");
    }
  }

  if (!hydrated || !weekId) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
        주간업무계획을 불러오는 중…
      </div>
    );
  }

  const activeWeekId = weekId;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 @lg/app:flex-row @lg/app:items-end @lg/app:justify-between">
        <div>
          <div className="mb-1.5 inline-flex items-center gap-2 text-xs font-semibold tracking-wide text-dh-real">
            <CalendarDays className="size-3.5" />
            주간 단위 운영
          </div>
          <h2 className="font-heading text-xl font-semibold tracking-tight text-dh-deep sm:text-2xl">
            이번 주 인사팀 할 일
          </h2>
          <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
            주간 업무를 등록하고 진행 상태를 확인하세요. 데이터는 이 브라우저에
            자동 저장되며 JSON으로 내보낼 수 있습니다.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWeekId(shiftWeek(activeWeekId, -1))}
          >
            <ChevronLeft data-icon="inline-start" />
            지난주
          </Button>
          <div
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium ring-1",
              isCurrentWeek(activeWeekId)
                ? "bg-dh-real text-white ring-dh-deep"
                : "bg-white text-dh-gray ring-border",
            )}
          >
            {weekLabel(activeWeekId)}
            {isCurrentWeek(activeWeekId) ? " · 이번 주" : ""}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWeekId(shiftWeek(activeWeekId, 1))}
          >
            다음주
            <ChevronRight data-icon="inline-end" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setWeekId(weekIdFromDate(new Date()))}
          >
            오늘로
          </Button>
        </div>
      </div>

      <div className="grid gap-3 @md/app:grid-cols-2 @5xl/app:grid-cols-4">
        {[
          { label: "전체 업무", value: summary.total, tone: "bg-white" },
          { label: "예정", value: summary.planned, tone: "bg-[#eef7fc]" },
          {
            label: "진행 중",
            value: summary.inProgress,
            tone: "bg-[#e8f1f9]",
          },
          { label: "지연", value: summary.delayed, tone: "bg-[#fceeee]" },
        ].map((item) => (
          <Card
            key={item.label}
            className={cn("border-border shadow-sm", item.tone)}
          >
            <CardHeader className="pb-2">
              <CardDescription className="text-muted-foreground">
                {item.label}
              </CardDescription>
              <CardTitle className="font-heading text-3xl tabular-nums text-dh-deep">
                {item.value}
              </CardTitle>
            </CardHeader>
            {item.label === "전체 업무" ? (
              <CardContent className="pt-0 text-xs text-muted-foreground">
                완료 {summary.done}건 포함
              </CardContent>
            ) : null}
          </Card>
        ))}
      </div>

      <Card className="border-border shadow-sm">
        <CardHeader className="gap-4 border-b border-border @sm/app:flex-row @sm/app:items-center @sm/app:justify-between">
          <div>
            <CardTitle className="font-heading text-lg text-dh-deep">
              업무 목록
            </CardTitle>
            <CardDescription>
              담당자·상태별로 필터하고, 새 업무를 추가해 보세요.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Select
              value={ownerFilter}
              onValueChange={(v) => setOwnerFilter(v ?? "all")}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="담당자" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 담당자</SelectItem>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={statusFilter}
              onValueChange={(v) =>
                setStatusFilter((v as FilterStatus) ?? "all")
              }
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="상태" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 상태</SelectItem>
                <SelectItem value="planned">예정</SelectItem>
                <SelectItem value="in_progress">진행 중</SelectItem>
                <SelectItem value="done">완료</SelectItem>
                <SelectItem value="delayed">지연</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={openCreate}>
              <Plus data-icon="inline-start" />
              업무 추가
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {weekTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
              <p className="font-heading text-lg text-dh-deep">
                이 주에는 등록된 업무가 없습니다
              </p>
              <p className="max-w-sm text-sm text-muted-foreground">
                주간업무계획을 추가하거나, 지난주·다음주로 이동해 보세요.
              </p>
              <Button onClick={openCreate}>첫 업무 추가하기</Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-dh-deep/5 hover:bg-dh-deep/5">
                    <TableHead className="text-dh-deep">요일</TableHead>
                    <TableHead className="text-left text-dh-deep">업무</TableHead>
                    <TableHead className="text-dh-deep">담당</TableHead>
                    <TableHead className="text-dh-deep">카테고리</TableHead>
                    <TableHead className="text-dh-deep">우선순위</TableHead>
                    <TableHead className="text-dh-deep">상태</TableHead>
                    <TableHead className="text-dh-deep">관리</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {weekTasks.map((task) => {
                    const owner = memberMap[task.ownerId];
                    const expanded = expandedId === task.id;
                    const subCount = task.subtasks?.length ?? 0;
                    const bottleneck =
                      task.subtasks?.filter((s) => s.status === "delayed")
                        .length ?? 0;
                    return (
                      <Fragment key={task.id}>
                        <TableRow className="align-top">
                          <TableCell className="font-medium text-dh-gray">
                            {task.dueDay}
                          </TableCell>
                          <TableCell className="min-w-[220px] text-left">
                            <button
                              type="button"
                              className="group flex w-full items-start gap-1.5 text-left"
                              onClick={() =>
                                setExpandedId(expanded ? null : task.id)
                              }
                              aria-expanded={expanded}
                            >
                              <ChevronDown
                                className={cn(
                                  "mt-0.5 size-4 shrink-0 text-dh-sea transition",
                                  expanded ? "rotate-0" : "-rotate-90",
                                )}
                              />
                              <span className="min-w-0">
                                <span className="font-medium text-dh-deep underline-offset-2 group-hover:underline">
                                  {task.title}
                                </span>
                                {task.description ? (
                                  <p className="mt-1 text-sm text-muted-foreground">
                                    {task.description}
                                  </p>
                                ) : null}
                                <p className="mt-1 text-[11px] text-muted-foreground">
                                  세부업무 {subCount}건
                                  {bottleneck > 0
                                    ? ` · 병목 ${bottleneck}건`
                                    : ""}
                                  {" · 클릭하여 "}
                                  {expanded ? "접기" : "펼치기"}
                                </p>
                              </span>
                            </button>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm font-medium text-dh-gray">
                              {owner?.name ?? "미지정"}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {owner?.role}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {task.category}
                          </TableCell>
                          <TableCell>
                            <PriorityBadge priority={task.priority} />
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={task.status} />
                          </TableCell>
                          <TableCell>
                            <div className="inline-flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label="수정"
                                onClick={() => openEdit(task)}
                              >
                                <Pencil />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label="삭제"
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      `"${task.title}" 업무를 삭제할까요?`,
                                    )
                                  ) {
                                    deleteTask(task.id);
                                  }
                                }}
                              >
                                <Trash2 />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        {expanded ? (
                          <TableRow className="hover:bg-transparent">
                            <TableCell colSpan={7} className="bg-muted/20 p-3">
                              <TaskSubtasksPanel
                                task={task}
                                onChange={upsertTask}
                              />
                            </TableCell>
                          </TableRow>
                        ) : null}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-dashed border-dh-sea/40 bg-[#f7fbfe] shadow-none">
        <CardHeader>
          <CardTitle className="font-heading text-base text-dh-deep">
            히스토리 공유 · 백업
          </CardTitle>
          <CardDescription>
            JSON으로 내보내거나 불러올 수 있습니다. 샘플로 다시 시작하려면
            초기화를 누르세요.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={exportJson}>
            <Download data-icon="inline-start" />
            JSON 내보내기
          </Button>
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            <Upload data-icon="inline-start" />
            JSON 불러오기
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              void onImportFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <Button
            variant="ghost"
            onClick={() => {
              if (
                window.confirm(
                  "샘플 주간업무계획으로 되돌릴까요? 현재 데이터는 덮어씌워집니다.",
                )
              ) {
                resetToSeed();
              }
            }}
          >
            <RotateCcw data-icon="inline-start" />
            샘플로 초기화
          </Button>
          {importError ? (
            <p className="w-full text-sm text-dh-red">{importError}</p>
          ) : null}
        </CardContent>
      </Card>

      <TaskFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        weekId={activeWeekId}
        members={members}
        initial={editing}
        onSave={upsertTask}
      />
    </div>
  );
}
