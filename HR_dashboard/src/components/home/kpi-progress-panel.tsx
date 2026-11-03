"use client";

import { useEffect, useMemo, useState } from "react";
import { CopyPlus, Pencil, Plus, Save, Target, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useLocalList } from "@/hooks/use-local-list";
import {
  TEAM_KPI_STORAGE_KEY,
  TRAFFIC_META,
  blankKpiRow,
  buildYtdProgressFromMonths,
  copyKpisToYear,
  sanitizeTeamKpi,
  scopeSortIndex,
  yearsFromKpis,
} from "@/lib/team-kpi";
import {
  TEAM_KPI_SCOPES,
  type TeamAnnualKpi,
  type TeamKpiScope,
  type TeamKpiTraffic,
} from "@/lib/types";
import { cn } from "@/lib/utils";

type KpiTab = "catalog" | "progress";

function seedAll() {
  return [] as TeamAnnualKpi[];
}

const cellInput =
  "min-h-[4.5rem] w-full resize-y rounded-md border border-border bg-background px-2 py-1.5 text-center text-xs leading-snug";

function sortYearRows(items: TeamAnnualKpi[]) {
  return [...items].sort((a, b) => {
    const s = scopeSortIndex(a.scope) - scopeSortIndex(b.scope);
    if (s !== 0) return s;
    return (a.title || "").localeCompare(b.title || "", "ko");
  });
}

function KpiModeTabs({
  tab,
  onChange,
  disabled,
}: {
  tab: KpiTab;
  onChange: (t: KpiTab) => void;
  disabled?: boolean;
}) {
  return (
    <div className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5">
      {(
        [
          ["catalog", "당해년도 KPI"],
          ["progress", "진척사항"],
        ] as const
      ).map(([id, label]) => (
        <button
          key={id}
          type="button"
          disabled={disabled}
          onClick={() => onChange(id)}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50",
            tab === id
              ? "bg-dh-sky/30 text-dh-deep shadow-sm dark:bg-dh-real dark:text-dh-light"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function KpiProgressSection() {
  const list = useLocalList(TEAM_KPI_STORAGE_KEY, seedAll);
  const [tab, setTab] = useState<KpiTab>("progress");
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth() + 1);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<TeamAnnualKpi[] | null>(null);

  useEffect(() => {
    if (!editing) setDraft(null);
  }, [editing]);

  const years = useMemo(() => yearsFromKpis(list.items), [list.items]);

  const yearItems = useMemo(() => {
    const source = editing && draft ? draft : list.items;
    return sortYearRows(
      source.filter((k) => k.year === year).map(sanitizeTeamKpi),
    );
  }, [list.items, draft, editing, year]);

  const monthIndex = Math.max(0, Math.min(11, month - 1));
  const monthLabel = `${String(year).slice(2)}년 ${month}월`;
  const hasPrevYear = list.items.some((k) => k.year === year - 1);

  function switchTab(next: KpiTab) {
    if (editing) return;
    setTab(next);
  }

  function startEdit() {
    if (tab === "catalog") {
      const base =
        yearItems.length > 0
          ? yearItems
          : [blankKpiRow(year, 1)];
      setDraft(base.map((k) => sanitizeTeamKpi({ ...k })));
    } else {
      if (yearItems.length === 0) return;
      setDraft(yearItems.map((k) => sanitizeTeamKpi({ ...k })));
    }
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setDraft(null);
  }

  function saveCatalog() {
    if (!draft) return;
    const prevById = new Map(
      list.items.filter((k) => k.year === year).map((k) => [k.id, k]),
    );
    const saved = draft.map((k) => {
      const row = sanitizeTeamKpi(k);
      const prev = prevById.get(row.id);
      return sanitizeTeamKpi({
        ...row,
        monthValues: prev?.monthValues ?? row.monthValues,
        monthWorkNotes: prev?.monthWorkNotes ?? row.monthWorkNotes,
        ytdProgressNotes: prev?.ytdProgressNotes ?? row.ytdProgressNotes,
        monthTraffic: prev?.monthTraffic ?? row.monthTraffic,
      });
    });
    list.replaceAll([
      ...list.items.filter((k) => k.year !== year),
      ...saved,
    ]);
    setEditing(false);
    setDraft(null);
  }

  function saveProgress() {
    if (!draft) return;
    const others = list.items.filter((k) => k.year !== year);
    const saved = draft.map((k) => {
      const row = sanitizeTeamKpi(k);
      const ytdProgressNotes = [...row.ytdProgressNotes];
      ytdProgressNotes[monthIndex] = buildYtdProgressFromMonths(
        row.monthWorkNotes,
        monthIndex,
      );
      return sanitizeTeamKpi({ ...row, ytdProgressNotes });
    });
    list.replaceAll([...others, ...saved]);
    setEditing(false);
    setDraft(null);
  }

  function saveEdit() {
    if (tab === "catalog") saveCatalog();
    else saveProgress();
  }

  function patchRow(id: string, patch: Partial<TeamAnnualKpi>) {
    setDraft((prev) =>
      (prev ?? []).map((k) =>
        k.id === id ? sanitizeTeamKpi({ ...k, ...patch }) : k,
      ),
    );
  }

  function patchMonthWork(id: string, value: string) {
    setDraft((prev) =>
      (prev ?? []).map((k) => {
        if (k.id !== id) return k;
        const monthWorkNotes = [
          ...(k.monthWorkNotes ?? Array.from({ length: 12 }, () => "")),
        ];
        monthWorkNotes[monthIndex] = value;
        const ytdProgressNotes = [
          ...(k.ytdProgressNotes ?? Array.from({ length: 12 }, () => "")),
        ];
        ytdProgressNotes[monthIndex] = buildYtdProgressFromMonths(
          monthWorkNotes,
          monthIndex,
        );
        return sanitizeTeamKpi({ ...k, monthWorkNotes, ytdProgressNotes });
      }),
    );
  }

  function patchTraffic(id: string, value: TeamKpiTraffic) {
    setDraft((prev) =>
      (prev ?? []).map((k) => {
        if (k.id !== id) return k;
        const monthTraffic = [...(k.monthTraffic ?? [])] as TeamKpiTraffic[];
        while (monthTraffic.length < 12) monthTraffic.push("");
        monthTraffic[monthIndex] = value;
        return sanitizeTeamKpi({ ...k, monthTraffic });
      }),
    );
  }

  function addRow() {
    setDraft((prev) => {
      const base = prev ?? yearItems.map((k) => sanitizeTeamKpi({ ...k }));
      return [...base, blankKpiRow(year, base.length + 1)];
    });
    setEditing(true);
  }

  function removeRow(id: string) {
    setDraft((prev) => (prev ?? []).filter((k) => k.id !== id));
  }

  function importPrevYear() {
    if (
      yearItems.length > 0 &&
      !window.confirm(
        `${year}년에 이미 등록된 KPI가 있습니다. 전년(${year - 1}) 내용으로 덮어쓸까요?`,
      )
    ) {
      return;
    }
    if (!hasPrevYear) {
      window.alert(`${year - 1}년 KPI가 없습니다. 행 추가로 직접 등록하세요.`);
      return;
    }
    const copied = copyKpisToYear(list.items, year - 1, year);
    list.replaceAll([
      ...list.items.filter((k) => k.year !== year),
      ...copied,
    ]);
  }

  const rows = editing && draft ? sortYearRows(draft.map(sanitizeTeamKpi)) : yearItems;
  const catalogEditing = editing && tab === "catalog";
  const progressEditing = editing && tab === "progress";

  return (
    <section className="flex h-full min-h-0 flex-col rounded-xl border border-border bg-card shadow-sm">
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-2 border-b border-border px-4 py-3 sm:px-5">
        <div>
          <h2 className="flex items-center gap-2 font-heading text-base font-semibold text-dh-deep dark:text-dh-light">
            <Target className="size-4 text-dh-sea" />
            KPI
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {tab === "catalog"
              ? "당해 연도 KPI(구분·과제·비중·연간 목표)를 등록·관리합니다."
              : "등록된 KPI를 기준으로 당월 진행·달성을 입력합니다. 누계는 1~기준월 당월 내용을 자동 합산합니다."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {editing ? (
            <>
              {tab === "catalog" ? (
                <Button variant="outline" size="sm" onClick={addRow}>
                  <Plus data-icon="inline-start" />
                  행 추가
                </Button>
              ) : null}
              <Button variant="outline" size="sm" onClick={cancelEdit}>
                <X data-icon="inline-start" />
                취소
              </Button>
              <Button size="sm" onClick={saveEdit}>
                <Save data-icon="inline-start" />
                저장
              </Button>
            </>
          ) : tab === "catalog" ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={importPrevYear}
                disabled={!list.hydrated || !hasPrevYear}
              >
                <CopyPlus data-icon="inline-start" />
                전년 KPI 불러오기
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={startEdit}
                disabled={!list.hydrated}
              >
                <Pencil data-icon="inline-start" />
                등록·수정
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={startEdit}
              disabled={!list.hydrated || yearItems.length === 0}
            >
              <Pencil data-icon="inline-start" />
              입력·수정
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3 border-b border-border px-4 py-2.5 sm:px-5">
        <KpiModeTabs tab={tab} onChange={switchTab} disabled={editing} />
        <label className="grid gap-1 text-xs">
          <span className="text-muted-foreground">연도</span>
          <select
            className="h-8 rounded-md border border-border bg-background px-2 text-sm"
            value={year}
            disabled={editing}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}년
              </option>
            ))}
          </select>
        </label>
        {tab === "progress" ? (
          <label className="grid gap-1 text-xs">
            <span className="text-muted-foreground">기준월</span>
            <input
              type="month"
              className="h-8 rounded-md border border-border bg-background px-2 text-sm"
              value={`${year}-${String(month).padStart(2, "0")}`}
              disabled={editing}
              onChange={(e) => {
                const [y, m] = e.target.value.split("-").map(Number);
                if (y) setYear(y);
                if (m) setMonth(m);
              }}
            />
          </label>
        ) : null}
        {tab === "progress" ? (
          <div className="ml-auto flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            <span>달성률</span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-flex size-4 items-center justify-center rounded-full bg-emerald-500 text-[9px] font-bold text-white">
                G
              </span>
              100%↑
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-flex size-4 items-center justify-center rounded-full bg-amber-400 text-[9px] font-bold text-dh-deep">
                Y
              </span>
              90%↑
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-flex size-4 items-center justify-center rounded-full bg-dh-red text-[9px] font-bold text-white">
                R
              </span>
              90%↓
            </span>
          </div>
        ) : null}
      </div>

      {!list.hydrated ? (
        <p className="p-5 text-sm text-muted-foreground">불러오는 중…</p>
      ) : rows.length === 0 ? (
        <div className="m-4 rounded-lg border border-dashed border-border px-3 py-10 text-center text-sm text-muted-foreground sm:m-5">
          {tab === "catalog" ? (
            <>
              {year}년 KPI가 아직 없습니다.
              <br />
              [등록·수정]으로 행을 추가하거나, 전년 KPI를 불러오세요.
            </>
          ) : (
            <>
              {year}년 KPI가 등록되어 있지 않습니다.
              <br />
              [당해년도 KPI] 탭에서 먼저 등록하세요.
            </>
          )}
        </div>
      ) : tab === "catalog" ? (
        <div className="min-h-0 flex-1 overflow-auto p-3 sm:p-4">
          <table className="w-full min-w-[720px] border-collapse text-center text-sm">
            <thead>
              <tr className="bg-dh-deep text-white">
                <th className="border border-dh-deep/80 px-2 py-2.5 text-center text-xs font-semibold">
                  구분
                </th>
                <th className="border border-dh-deep/80 px-2 py-2.5 text-center text-xs font-semibold">
                  KPI
                </th>
                <th className="w-16 border border-dh-deep/80 px-2 py-2.5 text-center text-xs font-semibold">
                  비중
                  <br />
                  (%)
                </th>
                <th className="border border-dh-deep/80 px-2 py-2.5 text-center text-xs font-semibold">
                  연간 목표
                </th>
                {catalogEditing ? (
                  <th className="w-12 border border-dh-deep/80 px-1 py-2.5" />
                ) : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="align-middle odd:bg-muted/20">
                  <td className="border border-border px-2 py-2 text-center text-xs">
                    {catalogEditing ? (
                      <select
                        className="h-8 w-full rounded-md border border-border bg-background px-1 text-center text-xs"
                        value={row.scope}
                        onChange={(e) =>
                          patchRow(row.id, {
                            scope: e.target.value as TeamKpiScope,
                          })
                        }
                      >
                        {TEAM_KPI_SCOPES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="font-medium text-dh-deep dark:text-dh-light">
                        {row.scope}
                      </span>
                    )}
                  </td>
                  <td className="border border-border px-2 py-2 text-center">
                    {catalogEditing ? (
                      <div className="space-y-1">
                        <Input
                          className="h-8 text-center text-xs"
                          placeholder="상위 KPI (선택)"
                          value={row.parentKpi}
                          onChange={(e) =>
                            patchRow(row.id, { parentKpi: e.target.value })
                          }
                        />
                        <Input
                          className="h-8 text-center text-xs"
                          placeholder="KPI 과제명"
                          value={row.title}
                          onChange={(e) =>
                            patchRow(row.id, { title: e.target.value })
                          }
                        />
                      </div>
                    ) : (
                      <div>
                        {row.parentKpi ? (
                          <p className="text-center text-[11px] text-muted-foreground">
                            {row.parentKpi}
                          </p>
                        ) : null}
                        <p className="text-center font-medium text-foreground">
                          {row.title || "—"}
                        </p>
                      </div>
                    )}
                  </td>
                  <td className="border border-border px-2 py-2 text-center tabular-nums">
                    {catalogEditing ? (
                      <Input
                        type="number"
                        min={0}
                        className="mx-auto h-8 w-14 px-1 text-center text-xs"
                        value={row.weight || ""}
                        onChange={(e) =>
                          patchRow(row.id, {
                            weight: Number(e.target.value) || 0,
                          })
                        }
                      />
                    ) : (
                      row.weight || "—"
                    )}
                  </td>
                  <td className="border border-border px-2 py-2 text-center">
                    {catalogEditing ? (
                      <Textarea
                        className={cellInput}
                        placeholder="연간 목표"
                        value={row.annualGoal}
                        onChange={(e) =>
                          patchRow(row.id, { annualGoal: e.target.value })
                        }
                      />
                    ) : (
                      <p className="whitespace-pre-wrap text-center text-xs text-muted-foreground">
                        {row.annualGoal || "—"}
                      </p>
                    )}
                  </td>
                  {catalogEditing ? (
                    <td className="border border-border px-1 py-2 text-center">
                      <button
                        type="button"
                        className="rounded p-1 text-muted-foreground hover:text-dh-red"
                        title="행 삭제"
                        onClick={() => removeRow(row.id)}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto p-3 sm:p-4">
          <table className="w-full min-w-[960px] border-collapse text-center text-sm">
            <thead>
              <tr className="bg-dh-deep text-white">
                <th className="border border-dh-deep/80 px-2 py-2.5 text-center text-xs font-semibold">
                  구분
                </th>
                <th className="border border-dh-deep/80 px-2 py-2.5 text-center text-xs font-semibold">
                  KPI
                </th>
                <th className="w-16 border border-dh-deep/80 px-2 py-2.5 text-center text-xs font-semibold">
                  비중
                  <br />
                  (%)
                </th>
                <th className="border border-dh-deep/80 px-2 py-2.5 text-center text-xs font-semibold">
                  연간 목표
                </th>
                <th className="min-w-[10rem] border border-dh-deep/80 px-2 py-2.5 text-center text-xs font-semibold">
                  {monthLabel} 당월 진행
                </th>
                <th className="min-w-[10rem] border border-dh-deep/80 px-2 py-2.5 text-center text-xs font-semibold">
                  {monthLabel} 누계 진행
                  <span className="mt-0.5 block text-[10px] font-normal text-white/75">
                    (당월 자동 합산)
                  </span>
                </th>
                <th className="w-16 border border-dh-deep/80 px-2 py-2.5 text-center text-xs font-semibold">
                  달성
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const traffic = row.monthTraffic?.[monthIndex] || "";
                const ytdText = buildYtdProgressFromMonths(
                  row.monthWorkNotes,
                  monthIndex,
                );
                return (
                  <tr key={row.id} className="align-middle odd:bg-muted/20">
                    <td className="border border-border px-2 py-2 text-center text-xs">
                      <span className="font-medium text-dh-deep dark:text-dh-light">
                        {row.scope}
                      </span>
                    </td>
                    <td className="border border-border px-2 py-2 text-center">
                      <div>
                        {row.parentKpi ? (
                          <p className="text-center text-[11px] text-muted-foreground">
                            {row.parentKpi}
                          </p>
                        ) : null}
                        <p className="text-center font-medium text-foreground">
                          {row.title || "—"}
                        </p>
                      </div>
                    </td>
                    <td className="border border-border px-2 py-2 text-center tabular-nums">
                      {row.weight || "—"}
                    </td>
                    <td className="border border-border bg-muted/20 px-2 py-2 text-center">
                      <p className="whitespace-pre-wrap text-center text-xs text-muted-foreground">
                        {row.annualGoal || "—"}
                      </p>
                    </td>
                    <td className="border border-border px-2 py-2 text-center">
                      {progressEditing ? (
                        <Textarea
                          className={cellInput}
                          placeholder="당월에 한 내용"
                          value={row.monthWorkNotes[monthIndex] ?? ""}
                          onChange={(e) =>
                            patchMonthWork(row.id, e.target.value)
                          }
                        />
                      ) : (
                        <p className="whitespace-pre-wrap text-center text-xs text-foreground">
                          {row.monthWorkNotes[monthIndex] || "—"}
                        </p>
                      )}
                    </td>
                    <td className="border border-border bg-muted/30 px-2 py-2 text-center">
                      <p className="whitespace-pre-wrap text-center text-xs text-foreground">
                        {ytdText || "—"}
                      </p>
                      {progressEditing ? (
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          자동 · 1~{month}월 당월 합산
                        </p>
                      ) : null}
                    </td>
                    <td className="border border-border px-2 py-2 text-center">
                      {progressEditing ? (
                        <select
                          className="h-8 rounded-md border border-border bg-background px-1 text-center text-xs"
                          value={traffic}
                          onChange={(e) =>
                            patchTraffic(
                              row.id,
                              e.target.value as TeamKpiTraffic,
                            )
                          }
                          title={
                            traffic
                              ? TRAFFIC_META[traffic].label
                              : "달성률 선택"
                          }
                        >
                          <option value="">—</option>
                          <option value="G">G</option>
                          <option value="Y">Y</option>
                          <option value="R">R</option>
                        </select>
                      ) : traffic ? (
                        <span
                          className={cn(
                            "inline-flex size-6 items-center justify-center rounded-full text-[11px] font-bold",
                            TRAFFIC_META[traffic].className,
                          )}
                          title={TRAFFIC_META[traffic].label}
                        >
                          {traffic}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function KpiProgressPanel() {
  return <KpiProgressSection />;
}
