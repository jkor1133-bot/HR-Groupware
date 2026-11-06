"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  CompanyVehiclePolicyRow,
  CompanyVehiclePolicySnapshot,
  CompanyVehiclePolicyStore,
} from "@/lib/types";

const STORAGE_KEY = "hr-dashboard-vehicle-policy-company-table-v2";

function seedCurrentRows(): CompanyVehiclePolicyRow[] {
  return [
    { id: "c1", rank: "영업팀장", model: "소나타" },
    { id: "c2", rank: "소장(차장 이상)", model: "소나타" },
    { id: "c3", rank: "소장(과장 이하)", model: "아반떼" },
    { id: "c4", rank: "팀원", model: "아반떼" },
  ];
}

function seedSnapshot(): CompanyVehiclePolicySnapshot {
  return {
    id: "current",
    periodLabel: "차종",
    effectiveDate: "2021-01-01",
    note: "현행 기준",
    rows: seedCurrentRows(),
    footnotes: [],
  };
}

function seedStore(): CompanyVehiclePolicyStore {
  return {
    current: seedSnapshot(),
    history: [],
  };
}

function cloneSnap(s: CompanyVehiclePolicySnapshot): CompanyVehiclePolicySnapshot {
  return JSON.parse(JSON.stringify(s)) as CompanyVehiclePolicySnapshot;
}

function loadStore(): CompanyVehiclePolicyStore {
  if (typeof window === "undefined") return seedStore();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedStore();
    const parsed = JSON.parse(raw) as CompanyVehiclePolicyStore;
    if (!parsed?.current?.rows?.length) return seedStore();
    return {
      current: parsed.current,
      history: Array.isArray(parsed.history) ? parsed.history : [],
    };
  } catch {
    return seedStore();
  }
}

function saveStore(store: CompanyVehiclePolicyStore) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function formatEffectiveLabel(ymd: string) {
  if (!ymd || ymd.length < 10) return ymd || "—";
  const [y, m, d] = ymd.split("-");
  return `${y}년 ${Number(m)}월 ${Number(d)}일 부`;
}

function PolicyTable({
  rows,
  footnotes,
  editing,
  onChangeRow,
  onChangeFootnote,
  onAddFootnote,
  onRemoveFootnote,
}: {
  rows: CompanyVehiclePolicyRow[];
  footnotes: string[];
  editing?: boolean;
  onChangeRow?: (
    rowId: string,
    key: "rank" | "model",
    value: string,
  ) => void;
  onChangeFootnote?: (index: number, value: string) => void;
  onAddFootnote?: () => void;
  onRemoveFootnote?: (index: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="gw-data-table w-full min-w-[320px] border-collapse text-sm">
          <thead>
            <tr className="bg-dh-deep text-white">
              <th className="border border-dh-deep/40 px-2 py-2 text-center align-middle font-medium">
                구분
              </th>
              <th className="border border-dh-deep/40 px-2 py-2 text-center align-middle font-medium">
                차종
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
                  ] as const
                ).map(([key, v]) => (
                  <td
                    key={key}
                    className="border border-border px-1.5 py-1.5 text-center"
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
      {footnotes.length > 0 || editing ? (
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
          {editing && onAddFootnote ? (
            <li>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onAddFootnote}
              >
                <Plus data-icon="inline-start" />
                비고 추가
              </Button>
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}

/** 당사 차량 지급 기준 (표 + 이력) */
export function CompanyVehiclePolicyPanel() {
  const [store, setStore] = useState<CompanyVehiclePolicyStore>(seedStore);
  const [hydrated, setHydrated] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<CompanyVehiclePolicySnapshot | null>(null);
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

    const nextCurrent: CompanyVehiclePolicySnapshot = {
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

    const nextStore: CompanyVehiclePolicyStore = {
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

  function patchMeta(patch: Partial<CompanyVehiclePolicySnapshot>) {
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  function changeRow(
    rowId: string,
    key: "rank" | "model",
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
            당사 차량 지급 기준
          </h2>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            직책·직급별 차종 기준입니다. 수정 저장 시 이전 기준은 이력으로
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
          <div className="grid gap-1 sm:col-span-2">
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
              placeholder="예: 차종 조정"
            />
          </div>
        </div>
      ) : null}

      <PolicyTable
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
                        {h.periodLabel}
                        {h.effectiveDate
                          ? ` · 시행일 ${formatEffectiveLabel(h.effectiveDate)}`
                          : ""}
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
