"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Download,
  Filter,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  Upload,
  UserCheck,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRaci } from "@/hooks/use-raci";
import { cellNum, cellStr, downloadRowsAsExcel, readExcelFile } from "@/lib/excel";
import type { RaciActivity, TeamMember } from "@/lib/types";
import { cn } from "@/lib/utils";

type RankedOwners = {
  key: string;
  label: string;
  jobCategory: string;
  task?: string;
  primaryId?: string;
  secondaryId?: string;
  primaryShare: number;
  secondaryShare: number;
  scores: Record<string, number>;
};

function sumScores(
  rows: RaciActivity[],
  members: TeamMember[],
): Record<string, number> {
  const scores: Record<string, number> = {};
  for (const m of members) scores[m.id] = 0;
  for (const a of rows) {
    for (const m of members) {
      scores[m.id] = (scores[m.id] ?? 0) + (a.weights[m.id] ?? 0);
    }
  }
  return scores;
}

function pickPrimarySecondary(
  scores: Record<string, number>,
  members: TeamMember[],
): {
  primaryId?: string;
  secondaryId?: string;
  primaryShare: number;
  secondaryShare: number;
} {
  const ranked = members
    .map((m) => ({ id: m.id, score: scores[m.id] ?? 0 }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  if (!ranked.length) {
    return { primaryShare: 0, secondaryShare: 0 };
  }

  const total = ranked.reduce((a, b) => a + b.score, 0) || 1;
  const primaryId = ranked[0].id;
  const primaryScore = ranked[0].score;
  const second = ranked.find((x) => x.score < primaryScore);
  const secondaryId = second?.id;
  const secondaryScore = second?.score ?? 0;

  return {
    primaryId,
    secondaryId,
    primaryShare: Math.round((primaryScore / total) * 1000) / 10,
    secondaryShare: secondaryId
      ? Math.round((secondaryScore / total) * 1000) / 10
      : 0,
  };
}

function computeTaskRanks(
  rows: RaciActivity[],
  members: TeamMember[],
): RankedOwners[] {
  const groups = new Map<string, RaciActivity[]>();
  for (const a of rows) {
    const key = `${a.jobCategory}||${a.task}`;
    const list = groups.get(key) ?? [];
    list.push(a);
    groups.set(key, list);
  }

  return [...groups.entries()].map(([key, list]) => {
    const scores = sumScores(list, members);
    const picked = pickPrimarySecondary(scores, members);
    return {
      key,
      label: list[0].task,
      jobCategory: list[0].jobCategory,
      task: list[0].task,
      scores,
      ...picked,
    };
  });
}

function computeJobRanks(
  rows: RaciActivity[],
  members: TeamMember[],
): RankedOwners[] {
  const groups = new Map<string, RaciActivity[]>();
  for (const a of rows) {
    const list = groups.get(a.jobCategory) ?? [];
    list.push(a);
    groups.set(a.jobCategory, list);
  }

  // 직무 필터 순서 유지
  const order = [
    "인사운영",
    "노무",
    "총무",
    "비서",
    "IT 운영",
    "기타 조직 운영",
  ];
  const keys = [
    ...order.filter((k) => groups.has(k)),
    ...[...groups.keys()].filter((k) => !order.includes(k)),
  ];

  return keys.map((job) => {
    const list = groups.get(job) ?? [];
    const scores = sumScores(list, members);
    const picked = pickPrimarySecondary(scores, members);
    return {
      key: job,
      label: job,
      jobCategory: job,
      scores,
      ...picked,
    };
  });
}

function cloneActivities(list: RaciActivity[]): RaciActivity[] {
  return list.map((a) => ({
    ...a,
    weights: { ...a.weights },
  }));
}

export function RaciBoard() {
  const { hydrated, members, activities, replaceAll, clearWeights } = useRaci();

  const [jobFilter, setJobFilter] = useState<string>("전체");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<RaciActivity[] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setDraft(null);
  }, [editing]);

  const working = editing && draft ? draft : activities;

  const jobCategories = useMemo(() => {
    const set = new Set(working.map((a) => a.jobCategory));
    return ["전체", ...Array.from(set)];
  }, [working]);

  const visible = useMemo(
    () =>
      jobFilter === "전체"
        ? working
        : working.filter((a) => a.jobCategory === jobFilter),
    [working, jobFilter],
  );

  const jobOwners = useMemo(
    () => computeJobRanks(visible, members),
    [visible, members],
  );

  const taskOwners = useMemo(
    () => computeTaskRanks(visible, members),
    [visible, members],
  );

  const ownerByTaskKey = useMemo(() => {
    const map = new Map<string, RankedOwners>();
    for (const o of taskOwners) map.set(o.key, o);
    return map;
  }, [taskOwners]);

  const memberById = useMemo(() => {
    const map = new Map(members.map((m) => [m.id, m]));
    return map;
  }, [members]);

  const totals = useMemo(() => {
    const map: Record<string, number> = {};
    for (const m of members) map[m.id] = 0;
    for (const a of visible) {
      for (const m of members) {
        map[m.id] = (map[m.id] ?? 0) + (a.weights[m.id] ?? 0);
      }
    }
    return map;
  }, [visible, members]);

  function startEdit() {
    setDraft(cloneActivities(activities));
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setDraft(null);
  }

  function saveEdit() {
    if (!draft) {
      setEditing(false);
      return;
    }
    const cleaned = draft
      .map((a) => ({
        ...a,
        jobCategory: a.jobCategory.trim(),
        task: a.task.trim(),
        activity: a.activity.trim(),
      }))
      .filter((a) => a.jobCategory && a.task && a.activity);
    if (cleaned.length < draft.length) {
      window.alert(
        "직무·Task·주요 Activity가 비어 있는 행은 저장에서 제외됩니다.",
      );
    }
    replaceAll(cleaned);
    setEditing(false);
    setDraft(null);
  }

  function setDraftWeight(activityId: string, memberId: string, value: number) {
    const next = Math.max(0, Math.min(100, Math.round(value)));
    setDraft((prev) => {
      const base = prev ?? cloneActivities(activities);
      return base.map((a) =>
        a.id === activityId
          ? { ...a, weights: { ...a.weights, [memberId]: next } }
          : a,
      );
    });
  }

  function setDraftField(
    activityId: string,
    field: "jobCategory" | "task" | "activity",
    value: string,
  ) {
    setDraft((prev) => {
      const base = prev ?? cloneActivities(activities);
      return base.map((a) =>
        a.id === activityId ? { ...a, [field]: value } : a,
      );
    });
  }

  function addDraftRow() {
    const weights: Record<string, number> = {};
    for (const m of members) weights[m.id] = 0;
    const row: RaciActivity = {
      id: `raci-new-${Date.now()}`,
      jobCategory:
        jobFilter !== "전체" ? jobFilter : "인사운영",
      task: "새 Task",
      activity: "새 Activity",
      weights,
    };
    setDraft((prev) => [...(prev ?? cloneActivities(activities)), row]);
    if (jobFilter !== "전체" && jobFilter !== row.jobCategory) {
      setJobFilter(row.jobCategory);
    }
  }

  function removeDraftRow(activityId: string) {
    setDraft((prev) => {
      const base = prev ?? cloneActivities(activities);
      return base.filter((a) => a.id !== activityId);
    });
  }

  function onClearZero() {
    if (
      !window.confirm(
        "모든 업무 비중을 0으로 초기화할까요? (저장된 값이 바로 반영됩니다)",
      )
    ) {
      return;
    }
    clearWeights();
    if (editing) {
      setDraft((prev) => {
        const base = prev ?? cloneActivities(activities);
        return base.map((a) => {
          const weights: Record<string, number> = { ...a.weights };
          for (const m of members) weights[m.id] = 0;
          for (const k of Object.keys(weights)) weights[k] = 0;
          return { ...a, weights };
        });
      });
    }
  }

  function exportExcel() {
    const rows = working.map((a) => {
      const row: Record<string, unknown> = {
        직무: a.jobCategory,
        Task: a.task,
        "주요 Activity": a.activity,
      };
      for (const m of members) {
        row[`${m.name} ${m.role}`] = a.weights[m.id] ?? 0;
      }
      return row;
    });
    downloadRowsAsExcel(rows, "raci-chart.xlsx", "RACI");
  }

  async function onUpload(file?: File) {
    if (!file) return;
    const rows = await readExcelFile(file);
    if (!rows.length) {
      window.alert("엑셀에서 데이터를 읽지 못했습니다.");
      return;
    }

    const memberByHeader = new Map<string, string>();
    for (const m of members) {
      memberByHeader.set(`${m.name} ${m.role}`, m.id);
      memberByHeader.set(m.name, m.id);
    }

    let matched = 0;
    let added = 0;
    const next = cloneActivities(working);

    for (const row of rows) {
      const job = cellStr(row, "직무", "jobCategory");
      const task = cellStr(row, "Task", "task");
      const activity = cellStr(row, "주요 Activity", "Activity", "activity");
      if (!job || !task || !activity) continue;

      const key = `${job}||${task}||${activity}`;
      let idx = next.findIndex(
        (a) => `${a.jobCategory}||${a.task}||${a.activity}` === key,
      );

      const weights: Record<string, number> = {};
      for (const m of members) weights[m.id] = 0;
      if (idx >= 0) {
        Object.assign(weights, next[idx].weights);
      }

      for (const [header, value] of Object.entries(row)) {
        const id = memberByHeader.get(header.trim());
        if (!id) continue;
        const n = cellNum({ [header]: value }, header);
        weights[id] = Math.max(0, Math.min(100, Math.round(n)));
      }

      if (idx < 0) {
        next.push({
          id: `raci-up-${Date.now()}-${added}`,
          jobCategory: job,
          task,
          activity,
          weights,
        });
        added += 1;
      } else {
        next[idx] = { ...next[idx], weights };
        matched += 1;
      }
    }

    if (!matched && !added) {
      window.alert(
        "읽을 데이터가 없습니다. 직무·Task·주요 Activity 열을 확인해 주세요.",
      );
      return;
    }

    if (editing) {
      setDraft(next);
      window.alert(
        `업데이트 ${matched}건 · 신규 ${added}건. [저장]을 눌러 반영하세요.`,
      );
    } else {
      replaceAll(next);
      window.alert(`업데이트 ${matched}건 · 신규 ${added}건을 저장했습니다.`);
    }
  }

  if (!hydrated) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
        RACI Chart를 불러오는 중…
      </div>
    );
  }

  function personLabel(id?: string) {
    if (!id) return "—";
    const m = memberById.get(id);
    return m ? `${m.name} ${m.role}` : id;
  }

  function jeongBuBadge(o?: RankedOwners) {
    if (!o?.primaryId) {
      return <span className="text-[10px] text-muted-foreground">미배정</span>;
    }
    return (
      <span className="inline-flex flex-wrap items-center justify-center gap-1 text-[10px] font-medium">
        <span className="rounded bg-dh-real/15 px-1.5 py-0.5 text-dh-deep dark:text-dh-light">
          정: {personLabel(o.primaryId)}
        </span>
        {o.secondaryId ? (
          <span className="rounded bg-dh-sky/25 px-1.5 py-0.5 text-dh-real">
            부: {personLabel(o.secondaryId)}
          </span>
        ) : null}
      </span>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-semibold text-dh-deep dark:text-dh-light sm:text-2xl">
            RACI Chart
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            직무·Task 비중 합산으로 정(1순위)·부(2순위) 담당자를 표시합니다.
            {editing ? (
              <span className="ml-1 font-medium text-dh-real">
                수정 모드 — 직무·Task·Activity·비중을 편집한 뒤 저장하세요.
              </span>
            ) : (
              <span className="ml-1">
                수정 버튼을 눌러 직무·Task·Activity·비중을 변경할 수 있습니다.
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => {
              void onUpload(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileRef.current?.click()}
          >
            <Upload data-icon="inline-start" />
            엑셀 업로드
          </Button>
          <Button variant="outline" size="sm" onClick={exportExcel}>
            <Download data-icon="inline-start" />
            엑셀 내보내기
          </Button>
          <Button variant="outline" size="sm" onClick={onClearZero}>
            <RotateCcw data-icon="inline-start" />
            샘플 초기화
          </Button>
          {editing ? (
            <>
              <Button variant="outline" size="sm" onClick={cancelEdit}>
                <X data-icon="inline-start" />
                취소
              </Button>
              <Button size="sm" onClick={saveEdit}>
                <Save data-icon="inline-start" />
                저장
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={startEdit}>
              <Pencil data-icon="inline-start" />
              수정
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 shadow-sm">
        <span className="mr-1 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Filter className="size-3.5" />
          직무
        </span>
        <div className="inline-flex flex-wrap gap-1 rounded-lg border border-border bg-muted/40 p-0.5">
          {jobCategories.map((job) => (
            <button
              key={job}
              type="button"
              onClick={() => setJobFilter(job)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                jobFilter === job
                  ? "bg-dh-sky/30 text-dh-deep shadow-sm dark:bg-dh-real dark:text-dh-light"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {job}
            </button>
          ))}
        </div>
        <p className="ml-auto text-xs text-muted-foreground">
          {visible.length}건 / 전체 {working.length}건
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-4 py-3 text-center">
          <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-dh-deep dark:text-dh-light">
            <UserCheck className="size-4" />
            직무별 담당자
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            직무 내 Activity 비중을 합산해 정(1순위)·부(2순위)를 판정합니다
          </p>
        </div>
        <div className="max-h-[240px] overflow-auto">
          <table className="w-full text-center text-xs">
            <thead className="sticky top-0 bg-muted/80 text-muted-foreground backdrop-blur">
              <tr className="border-b border-border">
                <th className="px-3 py-2 font-medium">직무</th>
                <th className="px-3 py-2 font-medium">정</th>
                <th className="px-3 py-2 font-medium">부</th>
                <th className="px-3 py-2 font-medium">정 비중</th>
              </tr>
            </thead>
            <tbody>
              {jobOwners.map((o) => (
                <tr key={o.key} className="border-b border-border/60">
                  <td className="px-3 py-2 font-medium text-dh-real">
                    {o.jobCategory}
                  </td>
                  <td className="px-3 py-2">
                    {o.primaryId ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-dh-real/15 px-1.5 py-0.5 font-medium text-dh-deep dark:text-dh-light">
                        {personLabel(o.primaryId)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">미배정</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {o.secondaryId ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-dh-sky/25 px-1.5 py-0.5 font-medium text-dh-real">
                        {personLabel(o.secondaryId)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 tabular-nums text-muted-foreground">
                    {o.primaryId ? `${o.primaryShare}%` : "—"}
                  </td>
                </tr>
              ))}
              {!jobOwners.length ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-3 py-6 text-muted-foreground"
                  >
                    표시할 직무가 없습니다
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] border-collapse text-center text-sm">
            <thead>
              <tr className="bg-dh-deep text-white">
                <th className="px-3 py-3 font-medium">직무</th>
                <th className="min-w-[200px] px-3 py-3 font-medium">Task</th>
                <th className="min-w-[220px] px-3 py-3 font-medium">
                  주요 Activity
                </th>
                {members.map((m) => (
                  <th
                    key={m.id}
                    className="min-w-[88px] px-2 py-3 font-medium"
                  >
                    <div>{m.name}</div>
                    <div className="text-[10px] font-normal text-white/70">
                      {m.role}
                    </div>
                  </th>
                ))}
                {editing ? (
                  <>
                    <th className="w-[4.5rem] px-1 py-2 font-medium">
                      <button
                        type="button"
                        onClick={addDraftRow}
                        className="mx-auto inline-flex items-center gap-0.5 rounded-md bg-white/15 px-2 py-1 text-[11px] font-medium text-white hover:bg-white/25"
                      >
                        <Plus className="size-3.5" />
                        행추가
                      </button>
                    </th>
                    <th className="w-14 px-2 py-3 font-medium">삭제</th>
                  </>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {visible.map((a, idx) => {
                const key = `${a.jobCategory}||${a.task}`;
                const owner = ownerByTaskKey.get(key);
                return (
                  <tr
                    key={a.id}
                    className={cn(
                      "border-t border-border",
                      idx % 2 === 1 && "bg-muted/40",
                    )}
                  >
                    <td className="px-2 py-2 font-medium text-dh-real">
                      {editing ? (
                        <input
                          value={a.jobCategory}
                          onChange={(e) =>
                            setDraftField(a.id, "jobCategory", e.target.value)
                          }
                          style={{ textAlign: "center" }}
                          className="mx-auto h-8 w-full min-w-[6.5rem] rounded border border-border bg-background px-1.5 text-center text-xs outline-none focus:ring-2 focus:ring-dh-sky"
                        />
                      ) : (
                        a.jobCategory
                      )}
                    </td>
                    <td className="px-2 py-2 text-foreground">
                      <div className="flex flex-col items-center gap-1">
                        {editing ? (
                          <input
                            value={a.task}
                            onChange={(e) =>
                              setDraftField(a.id, "task", e.target.value)
                            }
                            style={{ textAlign: "center" }}
                            className="h-8 w-full min-w-[9rem] rounded border border-border bg-background px-1.5 text-center text-xs outline-none focus:ring-2 focus:ring-dh-sky"
                          />
                        ) : (
                          <span>{a.task}</span>
                        )}
                        {!editing ? jeongBuBadge(owner) : null}
                      </div>
                    </td>
                    <td className="px-2 py-2 text-muted-foreground">
                      {editing ? (
                        <input
                          value={a.activity}
                          onChange={(e) =>
                            setDraftField(a.id, "activity", e.target.value)
                          }
                          style={{ textAlign: "center" }}
                          className="h-8 w-full min-w-[12rem] rounded border border-border bg-background px-1.5 text-center text-xs outline-none focus:ring-2 focus:ring-dh-sky"
                        />
                      ) : (
                        a.activity
                      )}
                    </td>
                    {members.map((m) => {
                      const isPrimary = owner?.primaryId === m.id;
                      const isSecondary = owner?.secondaryId === m.id;
                      return (
                        <td
                          key={m.id}
                          className={cn(
                            "px-1 py-1.5",
                            isPrimary && "bg-dh-real/10",
                            isSecondary && !isPrimary && "bg-dh-sky/15",
                          )}
                        >
                          <input
                            type="number"
                            min={0}
                            max={100}
                            disabled={!editing}
                            readOnly={!editing}
                            value={a.weights[m.id] ?? 0}
                            onChange={(e) =>
                              setDraftWeight(
                                a.id,
                                m.id,
                                Number(e.target.value),
                              )
                            }
                            style={{ textAlign: "center" }}
                            className={cn(
                              "mx-auto block h-8 w-16 rounded border text-center tabular-nums outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
                              editing
                                ? "bg-background focus:ring-2 focus:ring-dh-sky"
                                : "cursor-default bg-muted/40 text-muted-foreground",
                              isPrimary &&
                                "border-dh-real font-semibold text-dh-deep dark:text-dh-light",
                              isSecondary &&
                                !isPrimary &&
                                "border-dh-sea font-medium text-dh-real",
                              !isPrimary && !isSecondary && "border-border",
                            )}
                          />
                        </td>
                      );
                    })}
                    {editing ? (
                      <>
                        <td className="px-1 py-1.5" />
                        <td className="px-1 py-1.5">
                          <button
                            type="button"
                            title="행 삭제"
                            onClick={() => {
                              if (window.confirm("이 행을 삭제할까요?")) {
                                removeDraftRow(a.id);
                              }
                            }}
                            className="mx-auto inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-red-50 hover:text-dh-red"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </td>
                      </>
                    ) : null}
                  </tr>
                );
              })}
              {!visible.length ? (
                <tr>
                  <td
                    colSpan={3 + members.length + (editing ? 2 : 0)}
                    className="px-3 py-8 text-sm text-muted-foreground"
                  >
                    선택한 직무에 해당하는 Activity가 없습니다
                  </td>
                </tr>
              ) : null}
              <tr className="border-t-2 border-dh-sea bg-[#e8f6ee] dark:bg-emerald-950/40">
                <td
                  colSpan={3}
                  className="px-3 py-3 text-center font-semibold text-dh-deep dark:text-dh-light"
                >
                  업무 비중 합계
                  {jobFilter !== "전체" ? (
                    <span className="ml-1 text-xs font-normal text-muted-foreground">
                      ({jobFilter})
                    </span>
                  ) : null}
                </td>
                {members.map((m) => {
                  const total = totals[m.id] ?? 0;
                  const ok = total === 100;
                  return (
                    <td
                      key={m.id}
                      className={cn(
                        "px-2 py-3 text-base font-bold tabular-nums",
                        ok
                          ? "text-dh-red"
                          : "text-amber-700 dark:text-amber-400",
                      )}
                    >
                      {total}
                      {!ok ? (
                        <span className="mt-0.5 block text-[10px] font-normal">
                          (목표 100)
                        </span>
                      ) : null}
                    </td>
                  );
                })}
                {editing ? (
                  <>
                    <td />
                    <td />
                  </>
                ) : null}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
