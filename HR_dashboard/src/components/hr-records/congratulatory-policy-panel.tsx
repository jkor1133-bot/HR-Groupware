"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Pencil, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  CongratPolicyRow,
  CongratPolicySnapshot,
  CongratPolicyStore,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "hr-dashboard-congrats-group-exec-policy-v1";

const CELL_KEYS = [
  "congChair",
  "congCeo",
  "condChair",
  "condCeo",
] as const;

type CellKey = (typeof CELL_KEYS)[number];

function seedCompanyRows(): CongratPolicyRow[] {
  return [
    {
      id: "c1",
      group: "현직임원",
      groupSpan: 5,
      target: "본인",
      congChair: "",
      congCeo: "",
      condChair: "",
      condCeo: "",
    },
    {
      id: "c2",
      group: "현직임원",
      groupSpan: 0,
      target: "자녀",
      congChair: "300(500)",
      congCeo: "100",
      condChair: "",
      condCeo: "",
    },
    {
      id: "c3",
      group: "현직임원",
      groupSpan: 0,
      target: "부모",
      congChair: "",
      congCeo: "",
      condChair: "300(500)",
      condCeo: "100",
    },
    {
      id: "c4",
      group: "현직임원",
      groupSpan: 0,
      target: "처 부모",
      congChair: "",
      congCeo: "",
      condChair: "",
      condCeo: "100",
    },
    {
      id: "c5",
      group: "현직임원",
      groupSpan: 0,
      target: "형제자매",
      congChair: "",
      congCeo: "",
      condChair: "",
      condCeo: "50",
    },
    {
      id: "c6",
      group: "퇴직임원\n(고문포함)",
      groupSpan: 3,
      target: "본인",
      congChair: "",
      congCeo: "",
      condChair: "100",
      condCeo: "100",
    },
    {
      id: "c7",
      group: "퇴직임원\n(고문포함)",
      groupSpan: 0,
      target: "자녀",
      congChair: "100",
      congCeo: "100",
      condChair: "",
      condCeo: "",
    },
    {
      id: "c8",
      group: "퇴직임원\n(고문포함)",
      groupSpan: 0,
      target: "부모",
      congChair: "",
      congCeo: "",
      condChair: "100",
      condCeo: "100",
    },
  ];
}

function seedAffiliateRows(): CongratPolicyRow[] {
  return [
    {
      id: "a1",
      group: "현직임원",
      groupSpan: 3,
      target: "자녀",
      congChair: "",
      congCeo: "100",
      condChair: "",
      condCeo: "",
    },
    {
      id: "a2",
      group: "현직임원",
      groupSpan: 0,
      target: "본인",
      congChair: "",
      congCeo: "",
      condChair: "",
      condCeo: "100",
    },
    {
      id: "a3",
      group: "현직임원",
      groupSpan: 0,
      target: "부모/처 부모",
      congChair: "",
      congCeo: "",
      condChair: "",
      condCeo: "100",
    },
  ];
}

function seedSnapshot(): CongratPolicySnapshot {
  return {
    id: "current",
    effectiveDate: "2026-09-10",
    note: "최초 등록",
    description:
      "하기 지급기준은 제분, 사료, 싸이로, 바이탈피드, 우리와 총 5개사 적용",
    companyFootnote: "( )는 대표의 경우",
    companyRows: seedCompanyRows(),
    affiliateRows: seedAffiliateRows(),
  };
}

function seedStore(): CongratPolicyStore {
  return { current: seedSnapshot(), history: [] };
}

function cloneSnap(s: CongratPolicySnapshot): CongratPolicySnapshot {
  return JSON.parse(JSON.stringify(s)) as CongratPolicySnapshot;
}

function loadStore(): CongratPolicyStore {
  if (typeof window === "undefined") return seedStore();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedStore();
    const parsed = JSON.parse(raw) as CongratPolicyStore;
    if (!parsed?.current?.companyRows?.length) return seedStore();
    return {
      current: parsed.current,
      history: Array.isArray(parsed.history) ? parsed.history : [],
    };
  } catch {
    return seedStore();
  }
}

function saveStore(store: CongratPolicyStore) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function formatEffectiveLabel(ymd: string) {
  if (!ymd || ymd.length < 10) return ymd || "—";
  const [y, m, d] = ymd.split("-");
  return `${y}년 ${Number(m)}월 ${Number(d)}일 부`;
}

function PolicyTable({
  title,
  rows,
  footnote,
  editing,
  onChangeCell,
}: {
  title: string;
  rows: CongratPolicyRow[];
  footnote?: string;
  editing: boolean;
  onChangeCell?: (rowId: string, key: CellKey, value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-dh-deep dark:text-dh-light">
          * {title}
        </h3>
        <span className="text-xs text-muted-foreground">단위: 만원</span>
      </div>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="gw-data-table w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr className="bg-dh-deep text-white">
              <th rowSpan={2} className="border border-dh-deep/40 px-2 py-2">
                구분
              </th>
              <th rowSpan={2} className="border border-dh-deep/40 px-2 py-2">
                대상
              </th>
              <th colSpan={2} className="border border-dh-deep/40 px-2 py-1.5">
                경사
              </th>
              <th colSpan={2} className="border border-dh-deep/40 px-2 py-1.5">
                조사
              </th>
            </tr>
            <tr className="bg-dh-deep text-white">
              <th className="border border-dh-deep/40 px-2 py-1.5 font-medium">
                회장 명
              </th>
              <th className="border border-dh-deep/40 px-2 py-1.5 font-medium">
                대표이사 명
              </th>
              <th className="border border-dh-deep/40 px-2 py-1.5 font-medium">
                회장 명
              </th>
              <th className="border border-dh-deep/40 px-2 py-1.5 font-medium">
                대표이사 명
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-border">
                {row.groupSpan > 0 ? (
                  <td
                    rowSpan={row.groupSpan}
                    className="border border-border px-2 py-2 text-center text-xs font-medium whitespace-pre-line align-middle"
                  >
                    {row.group}
                  </td>
                ) : null}
                <td className="border border-border px-2 py-2 text-center">
                  {row.target}
                </td>
                {CELL_KEYS.map((key) => {
                  const v = row[key];
                  return (
                    <td
                      key={key}
                      className={cn(
                        "border border-border px-1.5 py-1.5 text-center tabular-nums",
                        !v && !editing && "text-muted-foreground/40",
                      )}
                    >
                      {editing && onChangeCell ? (
                        <Input
                          className="h-8 px-1 text-center text-xs tabular-nums"
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
      {footnote ? (
        <p className="text-xs font-medium text-dh-red">{footnote}</p>
      ) : null}
    </div>
  );
}

function SnapshotView({
  snap,
  editing,
  onPatchMeta,
  onChangeCell,
}: {
  snap: CongratPolicySnapshot;
  editing?: boolean;
  onPatchMeta?: (patch: Partial<CongratPolicySnapshot>) => void;
  onChangeCell?: (
    section: "company" | "affiliate",
    rowId: string,
    key: CellKey,
    value: string,
  ) => void;
}) {
  return (
    <div className="space-y-5">
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
              placeholder="예: 지급액 조정"
            />
          </div>
          <div className="grid gap-1 sm:col-span-2">
            <Label>안내 문구</Label>
            <Input
              value={snap.description}
              onChange={(e) => onPatchMeta({ description: e.target.value })}
            />
          </div>
        </div>
      ) : null}

      <PolicyTable
        title="당사"
        rows={snap.companyRows}
        footnote={snap.companyFootnote}
        editing={Boolean(editing)}
        onChangeCell={
          onChangeCell
            ? (rowId, key, value) =>
                onChangeCell("company", rowId, key, value)
            : undefined
        }
      />
      <PolicyTable
        title="계열사"
        rows={snap.affiliateRows}
        editing={Boolean(editing)}
        onChangeCell={
          onChangeCell
            ? (rowId, key, value) =>
                onChangeCell("affiliate", rowId, key, value)
            : undefined
        }
      />
      <p className="text-right text-sm font-semibold text-dh-red">
        시행일 : {formatEffectiveLabel(snap.effectiveDate)}
      </p>
    </div>
  );
}

/** 그룹사 임원 경조사 지급 기준표 — 금액 수정 · 변경 이력 */
export function CongratulatoryPolicyPanel() {
  const [store, setStore] = useState<CongratPolicyStore>(seedStore);
  const [hydrated, setHydrated] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<CongratPolicySnapshot | null>(null);
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
        companyRows: prev.companyRows,
        affiliateRows: prev.affiliateRows,
        effectiveDate: prev.effectiveDate,
        description: prev.description,
        companyFootnote: prev.companyFootnote,
      }) !==
      JSON.stringify({
        companyRows: draft.companyRows,
        affiliateRows: draft.affiliateRows,
        effectiveDate: draft.effectiveDate,
        description: draft.description,
        companyFootnote: draft.companyFootnote,
      });

    const nextCurrent: CongratPolicySnapshot = {
      ...draft,
      id: "current",
      archivedAt: undefined,
    };

    let nextHistory = store.history;
    if (changed) {
      const archived: CongratPolicySnapshot = {
        ...prev,
        id: `hist-${Date.now()}`,
        archivedAt: new Date().toISOString(),
      };
      nextHistory = [archived, ...store.history];
    }

    const nextStore: CongratPolicyStore = {
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

  function patchMeta(patch: Partial<CongratPolicySnapshot>) {
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  function changeCell(
    section: "company" | "affiliate",
    rowId: string,
    key: CellKey,
    value: string,
  ) {
    setDraft((prev) => {
      if (!prev) return prev;
      const listKey =
        section === "company" ? "companyRows" : "affiliateRows";
      return {
        ...prev,
        [listKey]: prev[listKey].map((r) =>
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
            그룹사 임원 경조사 기준표
          </h2>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            {working.description}
          </p>
          {editing ? (
            <p className="mt-1 text-xs font-medium text-dh-real">
              수정 모드 — 금액을 바꾼 뒤 [저장]하면 이전 내용은 이력으로
              남습니다.
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
                    onClick={() =>
                      setOpenHistoryId(open ? null : h.id)
                    }
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
                      <p className="mb-3 text-xs text-muted-foreground">
                        {h.description}
                      </p>
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
