"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Pencil, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  StaffCongratPolicyRow,
  StaffCongratPolicySnapshot,
  StaffCongratPolicyStore,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "hr-dashboard-congrats-staff-policy-v1";

const EDIT_KEYS = [
  "allowance",
  "leaveDays",
  "wreath",
  "funeralGoods",
  "note",
] as const;

type EditKey = (typeof EDIT_KEYS)[number];

function seedRows(): StaffCongratPolicyRow[] {
  return [
    {
      id: "s1",
      category: "결혼",
      categorySpan: 3,
      target: "본인",
      allowance: "1,000,000",
      leaveDays: "5",
      wreath: "O",
      funeralGoods: "",
      note: "",
    },
    {
      id: "s2",
      category: "결혼",
      categorySpan: 0,
      target: "자녀",
      allowance: "500,000",
      leaveDays: "2",
      wreath: "O",
      funeralGoods: "",
      note: "",
    },
    {
      id: "s3",
      category: "결혼",
      categorySpan: 0,
      target: "형제자매",
      allowance: "100,000",
      leaveDays: "1",
      wreath: "",
      funeralGoods: "",
      note: "",
    },
    {
      id: "s4",
      category: "사망",
      categorySpan: 12,
      target: "본인",
      allowance: "2,000,000",
      leaveDays: "",
      wreath: "O",
      funeralGoods: "O",
      note: "",
    },
    {
      id: "s5",
      category: "사망",
      categorySpan: 0,
      target: "배우자",
      allowance: "1,000,000",
      leaveDays: "5",
      wreath: "O",
      funeralGoods: "O",
      note: "",
    },
    {
      id: "s6",
      category: "사망",
      categorySpan: 0,
      target: "부모",
      allowance: "500,000",
      leaveDays: "5",
      wreath: "O",
      funeralGoods: "O",
      note: "",
    },
    {
      id: "s7",
      category: "사망",
      categorySpan: 0,
      target: "배우자 부모",
      allowance: "500,000",
      leaveDays: "5",
      wreath: "O",
      funeralGoods: "O",
      note: "",
    },
    {
      id: "s8",
      category: "사망",
      categorySpan: 0,
      target: "자녀",
      allowance: "500,000",
      leaveDays: "5",
      wreath: "O",
      funeralGoods: "O",
      note: "",
    },
    {
      id: "s9",
      category: "사망",
      categorySpan: 0,
      target: "조부모",
      allowance: "100,000",
      leaveDays: "3",
      wreath: "",
      funeralGoods: "O",
      note: "",
    },
    {
      id: "s10",
      category: "사망",
      categorySpan: 0,
      target: "외조부모",
      allowance: "100,000",
      leaveDays: "1",
      wreath: "",
      funeralGoods: "O",
      note: "",
    },
    {
      id: "s11",
      category: "사망",
      categorySpan: 0,
      target: "백숙부모",
      allowance: "",
      leaveDays: "3",
      wreath: "",
      funeralGoods: "",
      note: "",
    },
    {
      id: "s12",
      category: "사망",
      categorySpan: 0,
      target: "형제자매",
      allowance: "100,000",
      leaveDays: "3",
      wreath: "",
      funeralGoods: "O",
      note: "",
    },
    {
      id: "s13",
      category: "사망",
      categorySpan: 0,
      target: "배우자 형제자매",
      allowance: "100,000",
      leaveDays: "3",
      wreath: "",
      funeralGoods: "O",
      note: "",
    },
    {
      id: "s14",
      category: "사망",
      categorySpan: 0,
      target: "형수/제수",
      allowance: "",
      leaveDays: "1",
      wreath: "",
      funeralGoods: "",
      note: "",
    },
    {
      id: "s15",
      category: "사망",
      categorySpan: 0,
      target: "탈상(부모,배우자부모)",
      allowance: "",
      leaveDays: "1",
      wreath: "",
      funeralGoods: "",
      note: "1년이내 1일 부여",
    },
    {
      id: "s16",
      category: "출산",
      categorySpan: 1,
      target: "자녀 출산",
      allowance: "500,000",
      leaveDays: "10",
      wreath: "",
      funeralGoods: "",
      note: "",
    },
    {
      id: "s17",
      category: "고희",
      categorySpan: 2,
      target: "부모",
      allowance: "300,000",
      leaveDays: "1",
      wreath: "",
      funeralGoods: "",
      note: "만 70세",
    },
    {
      id: "s18",
      category: "고희",
      categorySpan: 0,
      target: "배우자 부모",
      allowance: "300,000",
      leaveDays: "1",
      wreath: "",
      funeralGoods: "",
      note: "",
    },
    {
      id: "s19",
      category: "기타",
      categorySpan: 2,
      target: "본인생일",
      allowance: "",
      leaveDays: "1",
      wreath: "",
      funeralGoods: "",
      note: "",
    },
    {
      id: "s20",
      category: "기타",
      categorySpan: 0,
      target: "주거이동",
      allowance: "",
      leaveDays: "1",
      wreath: "",
      funeralGoods: "",
      note: "",
    },
  ];
}

function seedSnapshot(): StaffCongratPolicySnapshot {
  return {
    id: "current",
    effectiveDate: "2024-09-01",
    note: "최초 등록",
    description: "경조휴가 및 경조금 지급 기준을 등록·관리합니다.",
    rows: seedRows(),
  };
}

function seedStore(): StaffCongratPolicyStore {
  return { current: seedSnapshot(), history: [] };
}

function cloneSnap(s: StaffCongratPolicySnapshot): StaffCongratPolicySnapshot {
  return JSON.parse(JSON.stringify(s)) as StaffCongratPolicySnapshot;
}

function loadStore(): StaffCongratPolicyStore {
  if (typeof window === "undefined") return seedStore();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedStore();
    const parsed = JSON.parse(raw) as StaffCongratPolicyStore;
    if (!parsed?.current?.rows?.length) return seedStore();
    return {
      current: parsed.current,
      history: Array.isArray(parsed.history) ? parsed.history : [],
    };
  } catch {
    return seedStore();
  }
}

function saveStore(store: StaffCongratPolicyStore) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function formatEffectiveLabel(ymd: string) {
  if (!ymd || ymd.length < 10) return ymd || "—";
  const [y, m, d] = ymd.split("-");
  return `${y}년 ${Number(m)}월 ${Number(d)}일 부`;
}

function PolicyTable({
  rows,
  editing,
  onChangeCell,
}: {
  rows: StaffCongratPolicyRow[];
  editing: boolean;
  onChangeCell?: (rowId: string, key: EditKey, value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <span className="text-xs text-muted-foreground">(단위 : 일 / 원)</span>
      </div>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="gw-data-table w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="bg-dh-deep text-white">
              <th
                colSpan={2}
                className="border border-dh-deep/40 px-2 py-2 font-medium"
              >
                구분
              </th>
              <th className="border border-dh-deep/40 px-2 py-2 font-medium">
                경조금
              </th>
              <th className="border border-dh-deep/40 px-2 py-2 font-medium">
                휴가일
              </th>
              <th className="border border-dh-deep/40 px-2 py-2 font-medium">
                경조화환
              </th>
              <th className="border border-dh-deep/40 px-2 py-2 font-medium">
                상조용품
              </th>
              <th className="border border-dh-deep/40 px-2 py-2 font-medium">
                비고
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-border">
                {row.categorySpan > 0 ? (
                  <td
                    rowSpan={row.categorySpan}
                    className="border border-border px-2 py-2 text-center text-sm font-medium align-middle"
                  >
                    {row.category}
                  </td>
                ) : null}
                <td className="border border-border px-2 py-2 text-center">
                  {row.target}
                </td>
                {EDIT_KEYS.map((key) => {
                  const v = row[key];
                  return (
                    <td
                      key={key}
                      className={cn(
                        "border border-border px-1.5 py-1.5 text-center",
                        key === "allowance" && "tabular-nums",
                        !v && !editing && "text-muted-foreground/40",
                      )}
                    >
                      {editing && onChangeCell ? (
                        <Input
                          className="h-8 px-1 text-center text-xs"
                          value={v}
                          placeholder="—"
                          onChange={(e) =>
                            onChangeCell(row.id, key, e.target.value)
                          }
                        />
                      ) : (
                        v || ""
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SnapshotView({
  snap,
  editing,
  onPatchMeta,
  onChangeCell,
}: {
  snap: StaffCongratPolicySnapshot;
  editing?: boolean;
  onPatchMeta?: (patch: Partial<StaffCongratPolicySnapshot>) => void;
  onChangeCell?: (rowId: string, key: EditKey, value: string) => void;
}) {
  return (
    <div className="space-y-4">
      {editing && onPatchMeta ? (
        <div className="grid gap-3 rounded-lg border border-border bg-muted/20 p-3 sm:grid-cols-2">
          <div className="grid gap-1">
            <Label>시행일</Label>
            <Input
              type="date"
              value={snap.effectiveDate}
              onChange={(e) => onPatchMeta({ effectiveDate: e.target.value })}
            />
          </div>
          <div className="grid gap-1">
            <Label>변경 사유 · 비고</Label>
            <Input
              value={snap.note}
              onChange={(e) => onPatchMeta({ note: e.target.value })}
              placeholder="예: 경조금 조정"
            />
          </div>
        </div>
      ) : null}

      <PolicyTable
        rows={snap.rows}
        editing={Boolean(editing)}
        onChangeCell={onChangeCell}
      />

      <p className="text-right text-sm font-semibold text-dh-red">
        시행일 : {formatEffectiveLabel(snap.effectiveDate)}
      </p>
    </div>
  );
}

/** 직원 경조휴가·경조금 지급 기준표 */
export function StaffCongratulatoryPolicyPanel() {
  const [store, setStore] = useState<StaffCongratPolicyStore>(seedStore);
  const [hydrated, setHydrated] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<StaffCongratPolicySnapshot | null>(null);
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
        effectiveDate: prev.effectiveDate,
      }) !==
      JSON.stringify({
        rows: draft.rows,
        effectiveDate: draft.effectiveDate,
      });

    const nextCurrent: StaffCongratPolicySnapshot = {
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

    const nextStore: StaffCongratPolicyStore = {
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

  function patchMeta(patch: Partial<StaffCongratPolicySnapshot>) {
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  function changeCell(rowId: string, key: EditKey, value: string) {
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
            경조휴가 및 경조금 지급기준표
          </h2>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            {working.description}
          </p>
          {editing ? (
            <p className="mt-1 text-xs font-medium text-dh-real">
              수정 모드 — 값을 바꾼 뒤 [저장]하면 이전 내용은 이력으로 남습니다.
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

      <SnapshotView
        snap={working}
        editing={editing}
        onPatchMeta={editing ? patchMeta : undefined}
        onChangeCell={editing ? changeCell : undefined}
      />

      <div className="border-t border-border pt-4">
        <h3 className="mb-2 text-sm font-semibold text-dh-deep dark:text-dh-light">
          변경 이력
        </h3>
        {historySorted.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            아직 변경 이력이 없습니다. 수정 후 저장하면 이전 기준이 여기에
            쌓입니다.
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
                        시행일 {formatEffectiveLabel(h.effectiveDate)}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {h.note || "사유 없음"}
                        {h.archivedAt
                          ? ` · 보관 ${h.archivedAt.slice(0, 10)}`
                          : ""}
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
                      <SnapshotView snap={h} />
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
