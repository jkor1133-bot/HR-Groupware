"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Download,
  Pencil,
  Plus,
  Save,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ORG_TEAMS } from "@/data/org";
import {
  cellNum,
  cellStr,
  downloadRowsAsExcel,
  readExcelFile,
} from "@/lib/excel";
import { currentYearMonth } from "@/lib/period";
import type { OrgTeam, TeamPeriodMetric } from "@/lib/types";
import { cn } from "@/lib/utils";

type ListApi = {
  items: TeamPeriodMetric[];
  replaceAll: (next: TeamPeriodMetric[]) => void;
};

type Props = {
  title: string;
  description?: string;
  list: ListApi;
  excelFileName: string;
  /** 금액(원) 또는 시간 */
  valueKind: "won" | "hours";
  /** 외부에서 고른 기준월 — 표 기본 필터 */
  focusMonth?: string;
};

function cloneItems(items: TeamPeriodMetric[]) {
  return JSON.parse(JSON.stringify(items)) as TeamPeriodMetric[];
}

function formatValue(n: number, kind: "won" | "hours") {
  if (kind === "won") {
    return Math.round(n).toLocaleString("ko-KR");
  }
  return Math.round(n).toLocaleString("ko-KR");
}

export function TeamPeriodMetricsEditor({
  title,
  description,
  list,
  excelFileName,
  valueKind,
  focusMonth,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<TeamPeriodMetric[] | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [filterMonth, setFilterMonth] = useState(
    () => focusMonth || currentYearMonth(),
  );
  const [form, setForm] = useState({
    yearMonth: focusMonth || currentYearMonth(),
    team: "인사총무팀" as OrgTeam,
    plan: "",
    actual: "",
  });

  useEffect(() => {
    if (focusMonth) {
      setFilterMonth(focusMonth);
      setForm((f) => ({ ...f, yearMonth: focusMonth }));
    }
  }, [focusMonth]);

  useEffect(() => {
    if (!editing) setDraft(null);
  }, [editing]);

  const working = editing && draft ? draft : list.items;

  const months = useMemo(() => {
    const set = new Set(working.map((r) => r.yearMonth));
    if (filterMonth) set.add(filterMonth);
    return [...set].sort();
  }, [working, filterMonth]);

  const visible = useMemo(
    () =>
      working
        .filter((r) => r.yearMonth === filterMonth)
        .sort((a, b) => a.team.localeCompare(b.team, "ko")),
    [working, filterMonth],
  );

  function startEdit() {
    setDraft(cloneItems(list.items));
    setEditing(true);
  }

  function cancelEdit() {
    setDraft(null);
    setEditing(false);
  }

  function saveEdit() {
    if (!draft) return;
    list.replaceAll(draft);
    setEditing(false);
    setDraft(null);
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 2000);
  }

  function patchRow(id: string, patch: Partial<TeamPeriodMetric>) {
    setDraft((prev) => {
      const base = prev ?? cloneItems(list.items);
      return base.map((r) => (r.id === id ? { ...r, ...patch } : r));
    });
  }

  function removeRow(id: string) {
    if (!editing) {
      window.alert("먼저 [수정]을 누른 뒤 삭제하고 [저장]하세요.");
      return;
    }
    if (!window.confirm("이 행을 삭제할까요? (저장 시 반영)")) return;
    setDraft((prev) =>
      (prev ?? cloneItems(list.items)).filter((r) => r.id !== id),
    );
  }

  function addRow() {
    if (!editing) {
      window.alert("먼저 [수정]을 누른 뒤 행을 추가하고 [저장]하세요.");
      return;
    }
    const yearMonth = form.yearMonth.slice(0, 7);
    if (!yearMonth || yearMonth.length < 7) return;
    const plan = Number(form.plan) || 0;
    const actual = Number(form.actual) || 0;
    const item: TeamPeriodMetric = {
      id: `tpm-${Date.now()}`,
      yearMonth,
      team: form.team,
      plan,
      actual,
    };
    setDraft((prev) => {
      const base = prev ?? cloneItems(list.items);
      const idx = base.findIndex(
        (r) => r.yearMonth === yearMonth && r.team === form.team,
      );
      if (idx >= 0) {
        const next = [...base];
        next[idx] = { ...next[idx]!, plan, actual };
        return next;
      }
      return [...base, item];
    });
    setFilterMonth(yearMonth);
    setForm((f) => ({ ...f, plan: "", actual: "" }));
  }

  async function upload(file?: File) {
    if (!file) return;
    if (!editing) {
      window.alert("먼저 [수정]을 누른 뒤 업로드하고 [저장]하세요.");
      return;
    }
    const rows = await readExcelFile(file);
    const next: TeamPeriodMetric[] = rows
      .map((row, i) => {
        const teamRaw = cellStr(row, "팀", "team") as OrgTeam;
        return {
          id: `tpm-up-${Date.now()}-${i}`,
          yearMonth: cellStr(row, "연월", "yearMonth", "년월").slice(0, 7),
          team: ORG_TEAMS.includes(teamRaw) ? teamRaw : ("인사총무팀" as OrgTeam),
          plan: cellNum(row, "계획", "plan"),
          actual: cellNum(row, "실적", "actual"),
        };
      })
      .filter((r) => r.yearMonth.length === 7);
    if (!next.length) {
      window.alert("연월·팀·계획·실적 컬럼이 있는 엑셀인지 확인하세요.");
      return;
    }
    setDraft(next);
    const first = next[0]?.yearMonth;
    if (first) setFilterMonth(first);
  }

  function exportExcel() {
    downloadRowsAsExcel(
      working.map((r) => ({
        연월: r.yearMonth,
        팀: r.team,
        계획: r.plan,
        실적: r.actual,
      })),
      excelFileName,
    );
  }

  const unitHint = valueKind === "won" ? "원" : "시간";

  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-heading text-base font-semibold text-dh-deep dark:text-dh-light">
            {title}
          </h3>
          {description ? (
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">
              연월별 팀 계획·실적({unitHint}). 여러 달을 올려 두면 기준월만 바꿔도
              대시보드 숫자가 바뀝니다.
            </p>
          )}
          {editing ? (
            <p className="mt-1 text-xs font-medium text-dh-real">
              수정 모드 — 편집 후 [저장]으로 마감하세요.
            </p>
          ) : null}
          {savedFlash ? (
            <p className="mt-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
              저장되었습니다.
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={exportExcel}>
            <Download data-icon="inline-start" />
            엑셀
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!editing}
            onClick={() => fileRef.current?.click()}
          >
            <Upload data-icon="inline-start" />
            업로드
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => {
              void upload(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
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

      <div className="mb-3 flex flex-wrap items-end gap-2">
        <div className="grid gap-1">
          <Label>표시 연월</Label>
          <Input
            type="month"
            className="h-8 w-[10rem]"
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
          />
        </div>
        <p className="pb-1.5 text-[11px] text-muted-foreground">
          등록 연월 {months.length}개 · 이 달 {visible.length}행
        </p>
      </div>

      <div className="mb-3 grid gap-2 @md/app:grid-cols-5">
        <div className="grid gap-1">
          <Label>연월</Label>
          <Input
            type="month"
            value={form.yearMonth}
            disabled={!editing}
            onChange={(e) => setForm({ ...form, yearMonth: e.target.value })}
          />
        </div>
        <div className="grid gap-1">
          <Label>팀</Label>
          <select
            className="h-8 rounded-md border border-border bg-background px-2 text-sm disabled:opacity-70"
            value={form.team}
            disabled={!editing}
            onChange={(e) =>
              setForm({ ...form, team: e.target.value as OrgTeam })
            }
          >
            {ORG_TEAMS.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className="grid gap-1">
          <Label>계획 ({unitHint})</Label>
          <Input
            type="number"
            value={form.plan}
            disabled={!editing}
            onChange={(e) => setForm({ ...form, plan: e.target.value })}
          />
        </div>
        <div className="grid gap-1">
          <Label>실적 ({unitHint})</Label>
          <Input
            type="number"
            value={form.actual}
            disabled={!editing}
            onChange={(e) => setForm({ ...form, actual: e.target.value })}
          />
        </div>
        <div className="flex items-end gap-2">
          <Button className="flex-1" disabled={!editing} onClick={addRow}>
            <Plus data-icon="inline-start" />
            행 추가
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="gw-data-table w-full min-w-[32rem] text-sm">
          <thead>
            <tr className="bg-dh-deep text-white">
              <th className="px-3 py-2">연월</th>
              <th className="px-3 py-2">팀</th>
              <th className="px-3 py-2">계획</th>
              <th className="px-3 py-2">실적</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-3 py-8 text-center text-muted-foreground"
                >
                  {filterMonth} 데이터가 없습니다. 수정 후 행 추가 또는 엑셀
                  업로드하세요.
                </td>
              </tr>
            ) : (
              visible.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="px-2 py-1.5">
                    {editing ? (
                      <Input
                        type="month"
                        className="h-8 mx-auto w-[9.5rem] px-2 text-sm"
                        value={r.yearMonth}
                        onChange={(e) =>
                          patchRow(r.id, {
                            yearMonth: e.target.value.slice(0, 7),
                          })
                        }
                      />
                    ) : (
                      r.yearMonth
                    )}
                  </td>
                  <td className="px-2 py-1.5">
                    {editing ? (
                      <select
                        className="h-8 rounded-md border border-border bg-background px-2 text-sm"
                        value={r.team}
                        onChange={(e) =>
                          patchRow(r.id, {
                            team: e.target.value as OrgTeam,
                          })
                        }
                      >
                        {ORG_TEAMS.map((t) => (
                          <option key={t}>{t}</option>
                        ))}
                      </select>
                    ) : (
                      r.team
                    )}
                  </td>
                  <td className="px-2 py-1.5">
                    {editing ? (
                      <Input
                        type="number"
                        className="h-8 w-28 px-2 text-sm"
                        value={r.plan}
                        onChange={(e) =>
                          patchRow(r.id, {
                            plan: Number(e.target.value) || 0,
                          })
                        }
                      />
                    ) : (
                      <span className="tabular-nums">
                        {formatValue(r.plan, valueKind)}
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-1.5">
                    {editing ? (
                      <Input
                        type="number"
                        className="h-8 w-28 px-2 text-sm"
                        value={r.actual}
                        onChange={(e) =>
                          patchRow(r.id, {
                            actual: Number(e.target.value) || 0,
                          })
                        }
                      />
                    ) : (
                      <span className="tabular-nums">
                        {formatValue(r.actual, valueKind)}
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-1.5">
                    <button
                      type="button"
                      className={cn(
                        "inline-flex rounded p-1 hover:text-dh-red disabled:opacity-40",
                      )}
                      disabled={!editing}
                      onClick={() => removeRow(r.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
