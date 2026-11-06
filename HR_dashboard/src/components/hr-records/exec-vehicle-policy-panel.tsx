"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  ExecVehiclePolicyRow,
  ExecVehiclePolicySnapshot,
  ExecVehiclePolicyStore,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "hr-dashboard-vehicle-policy-group-exec-table-v1";

function seedCurrentRows(): ExecVehiclePolicyRow[] {
  return [
    { id: "v1", rank: "상무보", model: "그랜저", displacement: "2,500" },
    { id: "v2", rank: "상무", model: "그랜저", displacement: "2,500" },
    { id: "v3", rank: "전무", model: "그랜저", displacement: "3,300" },
    { id: "v4", rank: "부사장", model: "G80", displacement: "3,500" },
    { id: "v5", rank: "사장", model: "G90", displacement: "3,800" },
  ];
}

function seedHistory2019(): ExecVehiclePolicySnapshot {
  return {
    id: "hist-2019-01",
    periodLabel: "2019.01 이후",
    effectiveDate: "2019-01-01",
    note: "2019.01 이후 기준",
    rows: [
      { id: "h1", rank: "상무보", model: "그랜저", displacement: "3,000" },
      { id: "h2", rank: "상무", model: "그랜저", displacement: "3,000" },
      { id: "h3", rank: "전무", model: "그랜저", displacement: "3,000" },
      { id: "h4", rank: "부사장", model: "제네시스", displacement: "3,300" },
      { id: "h5", rank: "사장", model: "EQ900", displacement: "3,800" },
    ],
    footnotes: [
      "※ 부사장 이하 대표이사 직책자의 경우 G80 차량 지급",
      "※ 임원 차량 지급간 트림/옵션 모두 '기본' 기준",
    ],
    archivedAt: "2020-04-01T00:00:00.000Z",
  };
}

function seedHistoryPre2019(): ExecVehiclePolicySnapshot {
  return {
    id: "hist-pre-2019",
    periodLabel: "2019.01 이전",
    effectiveDate: "2018-01-01",
    note: "2019.01 이전 기준",
    rows: [
      { id: "p1", rank: "상무보", model: "그랜저", displacement: "2,400" },
      { id: "p2", rank: "상무", model: "그랜저", displacement: "3,000" },
      { id: "p3", rank: "전무", model: "그랜저", displacement: "3,000" },
      { id: "p4", rank: "부사장", model: "제네시스", displacement: "3,300" },
      { id: "p5", rank: "사장", model: "EQ900", displacement: "3,800" },
    ],
    footnotes: [
      "※ 부사장 이하 대표이사 직책자의 경우 G80 차량 지급",
      "※ 임원 차량 지급간 트림/옵션 모두 '기본' 기준",
    ],
    archivedAt: "2019-01-01T00:00:00.000Z",
  };
}

function seedSnapshot(): ExecVehiclePolicySnapshot {
  return {
    id: "current",
    periodLabel: "현재 (2020.04 이후)",
    effectiveDate: "2020-04-01",
    note: "현행 기준",
    rows: seedCurrentRows(),
    footnotes: [
      "※ 부사장 이하 대표이사 직책자의 경우 G80 차량 지급",
      "※ 임원 차량 지급간 트림/옵션 모두 '기본' 기준",
    ],
  };
}

function seedStore(): ExecVehiclePolicyStore {
  return {
    current: seedSnapshot(),
    history: [seedHistory2019(), seedHistoryPre2019()],
  };
}

function cloneSnap(s: ExecVehiclePolicySnapshot): ExecVehiclePolicySnapshot {
  return JSON.parse(JSON.stringify(s)) as ExecVehiclePolicySnapshot;
}

function loadStore(): ExecVehiclePolicyStore {
  if (typeof window === "undefined") return seedStore();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedStore();
    const parsed = JSON.parse(raw) as ExecVehiclePolicyStore;
    if (!parsed?.current?.rows?.length) return seedStore();
    return {
      current: parsed.current,
      history: Array.isArray(parsed.history) ? parsed.history : [],
    };
  } catch {
    return seedStore();
  }
}

function saveStore(store: ExecVehiclePolicyStore) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function formatEffectiveLabel(ymd: string) {
  if (!ymd || ymd.length < 10) return ymd || "—";
  const [y, m, d] = ymd.split("-");
  return `${y}년 ${Number(m)}월 ${Number(d)}일 부`;
}

function PolicyTable({
  periodLabel,
  rows,
  footnotes,
  editing,
  onChangeRow,
  onChangeFootnote,
  onAddFootnote,
  onRemoveFootnote,
}: {
  periodLabel: string;
  rows: ExecVehiclePolicyRow[];
  footnotes: string[];
  editing?: boolean;
  onChangeRow?: (
    rowId: string,
    key: "rank" | "model" | "displacement",
    value: string,
  ) => void;
  onChangeFootnote?: (index: number, value: string) => void;
  onAddFootnote?: () => void;
  onRemoveFootnote?: (index: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="gw-data-table w-full min-w-[420px] border-collapse text-sm">
          <thead>
            <tr className="bg-dh-deep text-white">
              <th
                rowSpan={2}
                className="border border-dh-deep/40 px-2 py-2 text-center align-middle font-medium"
              >
                구분
              </th>
              <th
                colSpan={2}
                className="border border-dh-deep/40 px-2 py-2 text-center font-medium"
              >
                {periodLabel}
              </th>
            </tr>
            <tr className="bg-dh-deep text-white">
              <th className="border border-dh-deep/40 px-2 py-1.5 text-center font-medium">
                차종
              </th>
              <th className="border border-dh-deep/40 px-2 py-1.5 text-center font-medium">
                배기량
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-border">
                {(
                  [
                    ["rank", row.rank],
                    ["model", row.model],
                    ["displacement", row.displacement],
                  ] as const
                ).map(([key, v]) => (
                  <td
                    key={key}
                    className={cn(
                      "border border-border px-1.5 py-1.5 text-center",
                      key === "displacement" && "tabular-nums",
                    )}
                  >
                    {editing && onChangeRow ? (
                      <Input
                        className="h-8 px-1 text-center text-xs"
                        value={v}
                        onChange={(e) =>
                          onChangeRow(row.id, key, e.target.value)
                        }
                      />
                    ) : (
                      v
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="space-y-1">
        {footnotes.map((line, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-foreground">
            {editing && onChangeFootnote ? (
              <>
                <Input
                  className="h-8 flex-1 text-xs"
                  value={line}
                  onChange={(e) => onChangeFootnote(i, e.target.value)}
                />
                {onRemoveFootnote ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="shrink-0"
                    onClick={() => onRemoveFootnote(i)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                ) : null}
              </>
            ) : (
              <span>{line}</span>
            )}
          </li>
        ))}
      </ul>
      {editing && onAddFootnote ? (
        <Button type="button" variant="outline" size="sm" onClick={onAddFootnote}>
          <Plus data-icon="inline-start" />
          비고 줄 추가
        </Button>
      ) : null}
    </div>
  );
}

/** 그룹사 임원 차량 지급 기준 (표 + 이력) */
export function ExecVehiclePolicyPanel() {
  const [store, setStore] = useState<ExecVehiclePolicyStore>(seedStore);
  const [hydrated, setHydrated] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ExecVehiclePolicySnapshot | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [openHistoryId, setOpenHistoryId] = useState<string | null>(null);

  useEffect(() => {
    setStore(loadStore());
    setHydrated(true);
  }, []);

  const working = editing && draft ? draft : store.current;
  const historySorted = useMemo(
    () =>
      [...store.history].sort((a, b) =>
        (b.effectiveDate || "").localeCompare(a.effectiveDate || ""),
      ),
    [store.history],
  );

  function startEdit() {
    setDraft(cloneSnap(store.current));
    setEditing(true);
  }

  function cancelEdit() {
    setDraft(null);
    setEditing(false);
  }

  function saveEdit() {
    if (!draft) return;
    if (!draft.effectiveDate) {
      window.alert("시행일을 입력해 주세요.");
      return;
    }
    const prev = cloneSnap(store.current);
    const changed =
      JSON.stringify({
        rows: prev.rows,
        footnotes: prev.footnotes,
        periodLabel: prev.periodLabel,
        effectiveDate: prev.effectiveDate,
      }) !==
      JSON.stringify({
        rows: draft.rows,
        footnotes: draft.footnotes,
        periodLabel: draft.periodLabel,
        effectiveDate: draft.effectiveDate,
      });

    const nextCurrent: ExecVehiclePolicySnapshot = {
      ...draft,
      id: "current",
      archivedAt: undefined,
    };

    let nextHistory = store.history;
    if (changed) {
      nextHistory = [
        {
          ...prev,
          id: `hist-${Date.now()}`,
          archivedAt: new Date().toISOString(),
        },
        ...store.history,
      ];
    }

    const nextStore: ExecVehiclePolicyStore = {
      current: nextCurrent,
      history: nextHistory,
    };
    saveStore(nextStore);
    setStore(nextStore);
    setDraft(null);
    setEditing(false);
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 2000);
  }

  function patchMeta(patch: Partial<ExecVehiclePolicySnapshot>) {
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  function changeRow(
    rowId: string,
    key: "rank" | "model" | "displacement",
    value: string,
  ) {
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        rows: prev.rows.map((r) =>
          r.id === rowId ? { ...r, [key]: value } : r,
        ),
      };
    });
  }

  if (!hydrated) {
    return (
      <section className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <p className="text-sm text-muted-foreground">불러오는 중…</p>
      </section>
    );
  }

  return (
    <section className="space-y-5 rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-heading text-lg font-semibold text-dh-deep dark:text-dh-light">
            그룹사 임원 차량 지급 기준
          </h2>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            직급별 차종·배기량 기준입니다. 수정 저장 시 이전 기준은 이력으로
            남습니다.
          </p>
          {editing ? (
            <p className="mt-1 text-xs font-medium text-dh-real">
              수정 모드 — 값을 바꾼 뒤 [저장]을 눌러 주세요.
            </p>
          ) : null}
          {savedFlash ? (
            <p className="mt-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
              저장되었습니다.
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
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

      {editing && draft ? (
        <div className="grid gap-3 rounded-lg border border-border bg-muted/20 p-3 sm:grid-cols-2">
          <div className="grid gap-1">
            <Label>기준 구간 표기</Label>
            <Input
              value={draft.periodLabel}
              onChange={(e) => patchMeta({ periodLabel: e.target.value })}
            />
          </div>
          <div className="grid gap-1">
            <Label>시행일</Label>
            <Input
              type="date"
              value={draft.effectiveDate}
              onChange={(e) => patchMeta({ effectiveDate: e.target.value })}
            />
          </div>
          <div className="grid gap-1 sm:col-span-2">
            <Label>변경 사유 · 비고</Label>
            <Input
              value={draft.note}
              onChange={(e) => patchMeta({ note: e.target.value })}
              placeholder="예: 차종·배기량 조정"
            />
          </div>
        </div>
      ) : null}

      <PolicyTable
        periodLabel={working.periodLabel}
        rows={working.rows}
        footnotes={working.footnotes}
        editing={editing}
        onChangeRow={editing ? changeRow : undefined}
        onChangeFootnote={
          editing
            ? (index, value) =>
                setDraft((prev) => {
                  if (!prev) return prev;
                  const footnotes = [...prev.footnotes];
                  footnotes[index] = value;
                  return { ...prev, footnotes };
                })
            : undefined
        }
        onAddFootnote={
          editing
            ? () =>
                setDraft((prev) =>
                  prev
                    ? { ...prev, footnotes: [...prev.footnotes, "※ "] }
                    : prev,
                )
            : undefined
        }
        onRemoveFootnote={
          editing
            ? (index) =>
                setDraft((prev) => {
                  if (!prev) return prev;
                  return {
                    ...prev,
                    footnotes: prev.footnotes.filter((_, i) => i !== index),
                  };
                })
            : undefined
        }
      />

      <p className="text-right text-sm font-semibold text-dh-red">
        시행일 : {formatEffectiveLabel(working.effectiveDate)}
      </p>

      <div className="border-t border-border pt-4">
        <h3 className="mb-2 text-sm font-semibold text-dh-deep dark:text-dh-light">
          변경 이력
        </h3>
        {historySorted.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            아직 변경 이력이 없습니다.
          </p>
        ) : (
          <ul className="space-y-2">
            {historySorted.map((h) => {
              const open = openHistoryId === h.id;
              return (
                <li
                  key={h.id}
                  className="rounded-lg border border-border bg-muted/15"
                >
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left"
                    onClick={() => setOpenHistoryId(open ? null : h.id)}
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-foreground">
                        {h.periodLabel} · 시행일{" "}
                        {formatEffectiveLabel(h.effectiveDate)}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {h.note || "사유 없음"}
                      </span>
                    </span>
                    {open ? (
                      <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                    )}
                  </button>
                  {open ? (
                    <div className="border-t border-border px-3 py-3">
                      <PolicyTable
                        periodLabel={h.periodLabel}
                        rows={h.rows}
                        footnotes={h.footnotes}
                      />
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
