"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { OrgChartDiagram } from "@/components/hr-records/org-chart-diagram";
import { seedOrgChartRevisions } from "@/data/org-chart-seed";
import { useLocalList } from "@/hooks/use-local-list";
import type { OrgChartRevision, OrgChartUnit } from "@/lib/types";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "hr-dashboard-org-chart-v3";

function cloneItems(items: OrgChartRevision[]) {
  return JSON.parse(JSON.stringify(items)) as OrgChartRevision[];
}

function emptyForm() {
  return {
    effectiveDate: "",
    title: "",
    summary: "",
    note: "",
  };
}

function emptyUnit(): OrgChartUnit {
  return {
    id: `u-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    division: "",
    department: "",
    part: "",
    leader: "",
    note: "",
  };
}

function formatDateLabel(ymd: string) {
  if (!ymd || ymd.length < 10) return ymd || "—";
  const [y, m, d] = ymd.split("-");
  return `${y}년 ${Number(m)}월 ${Number(d)}일 부`;
}

function UnitsTable({
  units,
  editing,
  onChange,
  onAdd,
  onRemove,
}: {
  units: OrgChartUnit[];
  editing?: boolean;
  onChange?: (unitId: string, patch: Partial<OrgChartUnit>) => void;
  onAdd?: () => void;
  onRemove?: (unitId: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="gw-data-table w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="bg-dh-deep text-white">
              <th className="border border-dh-deep/40 px-2 py-2 text-center font-medium">
                상위부서
              </th>
              <th className="border border-dh-deep/40 px-2 py-2 text-center font-medium">
                부서
              </th>
              <th className="border border-dh-deep/40 px-2 py-2 text-center font-medium">
                파트
              </th>
              <th className="border border-dh-deep/40 px-2 py-2 text-center font-medium">
                직책자
              </th>
              <th className="border border-dh-deep/40 px-2 py-2 text-center font-medium">
                비고
              </th>
              {editing ? <th className="w-10 border border-dh-deep/40" /> : null}
            </tr>
          </thead>
          <tbody>
            {units.length === 0 ? (
              <tr>
                <td
                  colSpan={editing ? 6 : 5}
                  className="px-3 py-6 text-center text-muted-foreground"
                >
                  등록된 조직 단위가 없습니다.
                </td>
              </tr>
            ) : (
              units.map((u) => (
                <tr key={u.id} className="border-t border-border">
                  {(
                    [
                      ["division", u.division],
                      ["department", u.department],
                      ["part", u.part],
                      ["leader", u.leader ?? ""],
                      ["note", u.note],
                    ] as const
                  ).map(([key, v]) => (
                    <td
                      key={key}
                      className="border border-border px-1.5 py-1.5 text-center"
                    >
                      {editing && onChange ? (
                        <Input
                          className="h-8 px-1 text-center text-xs"
                          value={v}
                          onChange={(e) =>
                            onChange(u.id, { [key]: e.target.value })
                          }
                        />
                      ) : (
                        v || "—"
                      )}
                    </td>
                  ))}
                  {editing && onRemove ? (
                    <td className="border border-border px-1 text-center">
                      <button
                        type="button"
                        className="inline-flex rounded p-1 hover:text-dh-red"
                        onClick={() => onRemove(u.id)}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {editing && onAdd ? (
        <Button type="button" variant="outline" size="sm" onClick={onAdd}>
          <Plus data-icon="inline-start" />
          조직 단위 추가
        </Button>
      ) : null}
    </div>
  );
}

/** 인사 · 조직도 현황 (조직개편 이력) */
export function OrgChartPanel() {
  const list = useLocalList(STORAGE_KEY, seedOrgChartRevisions);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<OrgChartRevision[] | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    if (!editing) setDraft(null);
  }, [editing]);

  const working = editing && draft ? draft : list.items;
  const rows = useMemo(
    () =>
      [...working].sort((a, b) =>
        (b.effectiveDate || "").localeCompare(a.effectiveDate || ""),
      ),
    [working],
  );
  const latest = rows[0] ?? null;
  const latestId = latest?.id ?? null;

  useEffect(() => {
    if (list.hydrated && latestId) {
      setOpenId((prev) => prev ?? latestId);
    }
  }, [list.hydrated, latestId]);

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
    list.replaceAll(
      [...draft].sort((a, b) =>
        (b.effectiveDate || "").localeCompare(a.effectiveDate || ""),
      ),
    );
    setEditing(false);
    setDraft(null);
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 2000);
  }

  function addRevision() {
    if (!form.effectiveDate || !form.title.trim()) {
      window.alert("시행일과 제목은 필수입니다.");
      return;
    }
    const prevLatest = rows[0];
    const item: OrgChartRevision = {
      id: `org-${Date.now()}`,
      effectiveDate: form.effectiveDate,
      title: form.title.trim(),
      summary: form.summary.trim(),
      note: form.note.trim(),
      units: prevLatest
        ? cloneItems([prevLatest])[0].units.map((u) => ({
            ...u,
            id: `u-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          }))
        : [emptyUnit()],
    };
    if (editing) {
      setDraft((prev) => [...(prev ?? cloneItems(list.items)), item]);
    } else {
      list.upsert(item);
    }
    setForm(emptyForm());
    setOpenId(item.id);
  }

  function patchRevision(id: string, patch: Partial<OrgChartRevision>) {
    setDraft((prev) => {
      const base = prev ?? cloneItems(list.items);
      return base.map((row) => (row.id === id ? { ...row, ...patch } : row));
    });
  }

  function patchUnit(
    revId: string,
    unitId: string,
    patch: Partial<OrgChartUnit>,
  ) {
    setDraft((prev) => {
      const base = prev ?? cloneItems(list.items);
      return base.map((row) =>
        row.id === revId
          ? {
              ...row,
              units: row.units.map((u) =>
                u.id === unitId ? { ...u, ...patch } : u,
              ),
            }
          : row,
      );
    });
  }

  function addUnit(revId: string) {
    setDraft((prev) => {
      const base = prev ?? cloneItems(list.items);
      return base.map((row) =>
        row.id === revId
          ? { ...row, units: [...row.units, emptyUnit()] }
          : row,
      );
    });
  }

  function removeUnit(revId: string, unitId: string) {
    setDraft((prev) => {
      const base = prev ?? cloneItems(list.items);
      return base.map((row) =>
        row.id === revId
          ? { ...row, units: row.units.filter((u) => u.id !== unitId) }
          : row,
      );
    });
  }

  function removeRevision(id: string, title: string) {
    if (!editing) {
      window.alert("수정 모드에서 삭제할 수 있습니다.");
      return;
    }
    if (!window.confirm(`"${title}" 이력을 삭제할까요? (저장 시 반영)`)) {
      return;
    }
    setDraft((prev) =>
      (prev ?? cloneItems(list.items)).filter((r) => r.id !== id),
    );
    if (openId === id) setOpenId(null);
  }

  return (
    <section className="space-y-4 rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-heading text-lg font-semibold text-dh-deep dark:text-dh-light">
            조직도 현황
          </h2>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            조직개편 시행일별로 상위부서·부서·파트 구성을 남겨 이력을
            관리합니다. 새 개편 등록 시 직전 구성을 복사해 수정할 수 있습니다.
          </p>
          {editing ? (
            <p className="mt-1 text-xs font-medium text-dh-real">
              수정 모드 — 변경 후 [저장]을 눌러 주세요.
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

      <div className="grid gap-2 rounded-lg border border-border bg-muted/20 p-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="grid gap-1">
          <Label>시행일</Label>
          <Input
            type="date"
            value={form.effectiveDate}
            onChange={(e) =>
              setForm((f) => ({ ...f, effectiveDate: e.target.value }))
            }
          />
        </div>
        <div className="grid gap-1 sm:col-span-1 lg:col-span-2">
          <Label>개편 제목</Label>
          <Input
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="예: 2025년 상반기 조직개편"
          />
        </div>
        <div className="grid gap-1">
          <Label>비고</Label>
          <Input
            value={form.note}
            onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
          />
        </div>
        <div className="grid gap-1 sm:col-span-2 lg:col-span-3">
          <Label>개편 요약</Label>
          <Textarea
            value={form.summary}
            onChange={(e) =>
              setForm((f) => ({ ...f, summary: e.target.value }))
            }
            placeholder="신설·통폐합·명칭 변경 등"
            className="min-h-20"
          />
        </div>
        <div className="flex items-end">
          <Button className="w-full" onClick={addRevision}>
            <Plus data-icon="inline-start" />
            개편 이력 추가
          </Button>
        </div>
      </div>

      {list.hydrated && latest ? (
        <div className="space-y-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-sm font-semibold text-dh-deep dark:text-dh-light">
              현행 조직도
            </h3>
            <p className="text-xs text-muted-foreground">
              {formatDateLabel(latest.effectiveDate)} · {latest.title}
            </p>
          </div>
          <OrgChartDiagram units={latest.units} />
        </div>
      ) : null}

      {!list.hydrated ? (
        <p className="text-sm text-muted-foreground">불러오는 중…</p>
      ) : rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-3 py-8 text-center text-sm text-muted-foreground">
          등록된 조직개편 이력이 없습니다.
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((item) => {
            const open = openId === item.id;
            const isLatest = item.id === latestId;
            return (
              <li
                key={item.id}
                className={cn(
                  "rounded-lg border border-border bg-muted/15",
                  open && "ring-1 ring-dh-sea/40",
                )}
              >
                <div className="flex items-start gap-2 px-3 py-2.5">
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-start gap-2 text-left"
                    onClick={() =>
                      setOpenId((id) => (id === item.id ? null : item.id))
                    }
                  >
                    {open ? (
                      <ChevronDown className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    )}
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="text-sm font-medium text-foreground">
                          {formatDateLabel(item.effectiveDate)} · {item.title}
                        </span>
                        {isLatest ? (
                          <span className="rounded bg-dh-deep px-1.5 py-0.5 text-[10px] font-medium text-white">
                            현행
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-0.5 block line-clamp-1 text-xs text-muted-foreground">
                        {item.note ||
                          item.summary.split("\n").find((l) => l.trim()) ||
                          "요약 없음"}{" "}
                        · 조직 {item.units.length}개
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    className="inline-flex rounded p-1 hover:text-dh-red disabled:opacity-40"
                    disabled={!editing}
                    title={
                      editing ? "삭제" : "수정 모드에서 삭제할 수 있습니다"
                    }
                    onClick={() => removeRevision(item.id, item.title)}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
                {open ? (
                  <div className="space-y-3 border-t border-border px-3 py-3">
                    {editing ? (
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="grid gap-1">
                          <Label>시행일</Label>
                          <Input
                            type="date"
                            className="h-8 text-sm"
                            value={item.effectiveDate}
                            onChange={(e) =>
                              patchRevision(item.id, {
                                effectiveDate: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div className="grid gap-1">
                          <Label>제목</Label>
                          <Input
                            className="h-8 text-sm"
                            value={item.title}
                            onChange={(e) =>
                              patchRevision(item.id, {
                                title: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div className="grid gap-1 sm:col-span-2">
                          <Label>개편 요약</Label>
                          <Textarea
                            className="min-h-20 text-sm"
                            value={item.summary}
                            onChange={(e) =>
                              patchRevision(item.id, {
                                summary: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div className="grid gap-1 sm:col-span-2">
                          <Label>비고</Label>
                          <Input
                            className="h-8 text-sm"
                            value={item.note}
                            onChange={(e) =>
                              patchRevision(item.id, { note: e.target.value })
                            }
                          />
                        </div>
                      </div>
                    ) : (
                      <>
                        <OrgChartDiagram units={item.units} />
                        {item.summary ? (
                          <div className="rounded-lg border border-border bg-background px-3 py-2.5">
                            <p className="mb-1 text-xs font-semibold text-dh-deep dark:text-dh-light">
                              개편 요약
                            </p>
                            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                              {item.summary}
                            </p>
                          </div>
                        ) : null}
                      </>
                    )}

                    <div>
                      <p className="mb-1.5 text-xs font-semibold text-dh-deep dark:text-dh-light">
                        조직 구성 표{editing ? " (수정)" : ""}
                      </p>
                      <UnitsTable
                        units={item.units}
                        editing={editing}
                        onChange={
                          editing
                            ? (unitId, patch) =>
                                patchUnit(item.id, unitId, patch)
                            : undefined
                        }
                        onAdd={editing ? () => addUnit(item.id) : undefined}
                        onRemove={
                          editing
                            ? (unitId) => removeUnit(item.id, unitId)
                            : undefined
                        }
                      />
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
