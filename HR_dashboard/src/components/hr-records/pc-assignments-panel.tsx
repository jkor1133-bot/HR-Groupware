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
import { EmployeePicker } from "@/components/employees/employee-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { seedPcAssignments } from "@/data/hr-records-seed";
import { useLocalList } from "@/hooks/use-local-list";
import {
  cellDate,
  cellStr,
  downloadRowsAsExcel,
  readExcelFile,
} from "@/lib/excel";
import type { PcAssignmentRecord } from "@/lib/types";

const STORAGE_KEY = "hr-dashboard-pcs-v1";
/** 이 날짜 이후 지급 기록을 기준으로 동일 인원 재지급 시 이전 이력 정리 */
const PC_RECORD_FROM = "2020-11-01";

function cloneItems(items: PcAssignmentRecord[]) {
  return JSON.parse(JSON.stringify(items)) as PcAssignmentRecord[];
}

function emptyForm() {
  return {
    employeeName: "",
    team: "",
    assetTag: "",
    model: "",
    assignedDate: "",
    note: "",
  };
}

function normName(name: string) {
  return name.trim().replace(/\s+/g, "");
}

/** 지급일 최신순 → 성명 */
function sortByAssignedDate(items: PcAssignmentRecord[]) {
  return [...items].sort((a, b) => {
    const byDate = (b.assignedDate || "").localeCompare(a.assignedDate || "");
    if (byDate !== 0) return byDate;
    return (a.employeeName || "").localeCompare(b.employeeName || "", "ko");
  });
}

/** 비고에 이전 지급일 문구 합치기 */
function mergePrevAssignNote(note: string, prevDate: string) {
  const base = note.trim();
  const tag = `이전지급 ${prevDate}`;
  if (!prevDate) return base;
  if (base.includes(tag) || base.includes(`이전지급 ${prevDate}`)) return base;
  return base ? `${base} · ${tag}` : tag;
}

export function PcAssignmentsPanel() {
  const list = useLocalList(STORAGE_KEY, seedPcAssignments);
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<PcAssignmentRecord[] | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!editing) setDraft(null);
  }, [editing]);

  const working = useMemo(() => {
    const source = editing && draft ? draft : list.items;
    return sortByAssignedDate(source);
  }, [editing, draft, list.items]);

  const rows = working;

  function startEdit() {
    setDraft(sortByAssignedDate(cloneItems(list.items)));
    setEditing(true);
  }

  function cancelEdit() {
    setDraft(null);
    setEditing(false);
  }

  function saveEdit() {
    if (!draft) return;
    list.replaceAll(sortByAssignedDate(draft));
    setEditing(false);
    setDraft(null);
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 2000);
  }

  /**
   * 동일 성명 기존 건을 제거하고, 가장 최근 이전 지급일을 비고에 남긴 뒤 신규 추가.
   * 결과는 항상 지급일 최신순으로 정렬.
   */
  function applyAddWithReplace(
    source: PcAssignmentRecord[],
    item: PcAssignmentRecord,
  ): PcAssignmentRecord[] {
    const key = normName(item.employeeName);
    const previous = source
      .filter((r) => normName(r.employeeName) === key)
      .sort((a, b) =>
        (b.assignedDate || "").localeCompare(a.assignedDate || ""),
      );
    const prevDate = previous[0]?.assignedDate ?? "";
    const note =
      prevDate && prevDate !== item.assignedDate
        ? mergePrevAssignNote(item.note, prevDate)
        : item.note;
    const nextItem = { ...item, note };
    const kept = source.filter((r) => normName(r.employeeName) !== key);
    return sortByAssignedDate([...kept, nextItem]);
  }

  function addRow() {
    setFormError(null);
    if (!form.employeeName.trim()) {
      setFormError("성명을 입력해 주세요.");
      return;
    }
    if (!form.team.trim()) {
      setFormError("소속을 입력해 주세요.");
      return;
    }
    if (!form.assignedDate) {
      setFormError("지급일을 입력해 주세요.");
      return;
    }
    if (form.assignedDate < PC_RECORD_FROM) {
      setFormError(
        `지급일은 ${PC_RECORD_FROM} 이후로 등록해 주세요.`,
      );
      return;
    }

    const item: PcAssignmentRecord = {
      id: `pc-${Date.now()}`,
      employeeName: form.employeeName.trim(),
      team: form.team.trim(),
      assetTag: form.assetTag.trim(),
      model: form.model.trim(),
      assignedDate: form.assignedDate,
      note: form.note.trim(),
    };

    if (editing) {
      setDraft((prev) =>
        applyAddWithReplace(prev ?? cloneItems(list.items), item),
      );
    } else {
      list.replaceAll(applyAddWithReplace(list.items, item));
    }
    setForm(emptyForm());
  }

  function patchRow(id: string, patch: Partial<PcAssignmentRecord>) {
    setDraft((prev) => {
      const base = prev ?? cloneItems(list.items);
      const updated = base.map((row) =>
        row.id === id ? { ...row, ...patch } : row,
      );
      return patch.assignedDate != null
        ? sortByAssignedDate(updated)
        : updated;
    });
  }

  function removeRow(id: string, name: string) {
    if (!editing) {
      window.alert("수정 모드에서 삭제할 수 있습니다.");
      return;
    }
    if (!window.confirm(`"${name}" 지급 이력을 삭제할까요? (저장 시 반영)`)) {
      return;
    }
    setDraft((prev) =>
      (prev ?? cloneItems(list.items)).filter((r) => r.id !== id),
    );
  }

  async function upload(file?: File) {
    if (!file) return;
    if (!editing) {
      window.alert("먼저 [수정]을 누른 뒤 업로드하고 [저장]하세요.");
      return;
    }
    const excelRows = await readExcelFile(file);
    let next = excelRows
      .map((row, i) => ({
        id: `pc-up-${Date.now()}-${i}`,
        employeeName: cellStr(row, "성명", "employeeName"),
        team: cellStr(row, "소속", "team"),
        assetTag: cellStr(row, "자산번호", "assetTag"),
        model: cellStr(row, "모델", "model"),
        assignedDate: cellDate(row, "지급일", "assignedDate"),
        note: cellStr(row, "비고", "note"),
      }))
      .filter(
        (r) =>
          r.employeeName &&
          r.team &&
          r.assignedDate &&
          r.assignedDate >= PC_RECORD_FROM,
      );

    // 동일 성명은 최신 지급일만 남기고 이전 지급일을 비고에 반영
    const byName = new Map<string, PcAssignmentRecord[]>();
    for (const r of next) {
      const k = normName(r.employeeName);
      const group = byName.get(k);
      if (group) group.push(r);
      else byName.set(k, [r]);
    }
    next = [];
    for (const group of byName.values()) {
      group.sort((a, b) =>
        (b.assignedDate || "").localeCompare(a.assignedDate || ""),
      );
      const latest = group[0]!;
      if (group.length > 1) {
        const prevDate = group[1]!.assignedDate;
        latest.note = mergePrevAssignNote(latest.note, prevDate);
      }
      next.push(latest);
    }

    if (next.length) setDraft(sortByAssignedDate(next));
  }

  function exportExcel() {
    downloadRowsAsExcel(
      rows.map((r) => ({
        성명: r.employeeName,
        소속: r.team,
        자산번호: r.assetTag,
        모델: r.model,
        지급일: r.assignedDate,
        비고: r.note,
      })),
      "PC지급현황.xlsx",
    );
  }

  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-heading text-lg font-semibold text-dh-deep dark:text-dh-light">
            PC 지급 현황
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {PC_RECORD_FROM} 이후 지급 이력을 등록합니다. 목록은 지급일 최신순이며
            추가·저장 후에도 유지됩니다. 동일 성명을 다시 등록하면 이전 건은
            삭제되고, 비고에 「이전지급 YYYY-MM-DD」가 붙습니다. 자산번호·모델은
            선택 입력입니다.
          </p>
          {editing ? (
            <p className="mt-1 text-xs font-medium text-dh-real">
              수정 모드 — 내용을 바꾼 뒤 [저장]을 눌러 주세요.
            </p>
          ) : null}
          {savedFlash ? (
            <p className="mt-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
              저장되었습니다.
            </p>
          ) : null}
          {formError ? (
            <p className="mt-1 text-xs font-medium text-dh-red">{formError}</p>
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

      <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <div className="grid gap-1">
          <Label>성명</Label>
          <EmployeePicker
            value={form.employeeName}
            onChange={(name, emp) =>
              setForm((prev) => ({
                ...prev,
                employeeName: name,
                team: emp?.department || emp?.division || prev.team,
              }))
            }
          />
        </div>
        <div className="grid gap-1">
          <Label>소속</Label>
          <Input
            value={form.team}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, team: e.target.value }))
            }
          />
        </div>
        <div className="grid gap-1">
          <Label>자산번호 (선택)</Label>
          <Input
            value={form.assetTag}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, assetTag: e.target.value }))
            }
          />
        </div>
        <div className="grid gap-1">
          <Label>모델 (선택)</Label>
          <Input
            value={form.model}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, model: e.target.value }))
            }
          />
        </div>
        <div className="grid gap-1">
          <Label>지급일</Label>
          <Input
            type="date"
            min={PC_RECORD_FROM}
            value={form.assignedDate}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, assignedDate: e.target.value }))
            }
          />
        </div>
        <div className="grid gap-1">
          <Label>비고</Label>
          <Input
            value={form.note}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, note: e.target.value }))
            }
          />
        </div>
        <div className="flex items-end">
          <Button className="w-full" onClick={addRow}>
            <Plus data-icon="inline-start" />
            추가
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="gw-data-table w-full min-w-[720px] text-sm">
          <thead>
            <tr className="bg-dh-deep text-white">
              <th className="px-3 py-2">성명</th>
              <th className="px-3 py-2">소속</th>
              <th className="px-3 py-2">자산번호</th>
              <th className="px-3 py-2">모델</th>
              <th className="px-3 py-2">지급일</th>
              <th className="px-3 py-2">비고</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-3 py-8 text-center text-muted-foreground"
                >
                  등록된 항목이 없습니다.
                </td>
              </tr>
            ) : (
              rows.map((item) => (
                <tr key={item.id} className="border-t border-border">
                  <td className="px-2 py-1.5">
                    {editing ? (
                      <EmployeePicker
                        value={item.employeeName}
                        onChange={(name, emp) =>
                          patchRow(item.id, {
                            employeeName: name,
                            ...(emp
                              ? {
                                  team:
                                    emp.department ||
                                    emp.division ||
                                    item.team,
                                }
                              : {}),
                          })
                        }
                      />
                    ) : (
                      <span className="font-medium">{item.employeeName}</span>
                    )}
                  </td>
                  <td className="px-2 py-1.5">
                    {editing ? (
                      <Input
                        className="h-8 min-w-[5rem] px-2 text-sm"
                        value={item.team}
                        onChange={(e) =>
                          patchRow(item.id, { team: e.target.value })
                        }
                      />
                    ) : (
                      item.team
                    )}
                  </td>
                  <td className="px-2 py-1.5">
                    {editing ? (
                      <Input
                        className="h-8 min-w-[5rem] px-2 text-sm"
                        value={item.assetTag}
                        onChange={(e) =>
                          patchRow(item.id, { assetTag: e.target.value })
                        }
                      />
                    ) : (
                      item.assetTag || "—"
                    )}
                  </td>
                  <td className="px-2 py-1.5">
                    {editing ? (
                      <Input
                        className="h-8 min-w-[5rem] px-2 text-sm"
                        value={item.model}
                        onChange={(e) =>
                          patchRow(item.id, { model: e.target.value })
                        }
                      />
                    ) : (
                      item.model || "—"
                    )}
                  </td>
                  <td className="px-2 py-1.5">
                    {editing ? (
                      <Input
                        type="date"
                        min={PC_RECORD_FROM}
                        className="h-8 min-w-[8.5rem] px-2 text-sm"
                        value={item.assignedDate}
                        onChange={(e) =>
                          patchRow(item.id, {
                            assignedDate: e.target.value,
                          })
                        }
                      />
                    ) : (
                      <span className="tabular-nums">{item.assignedDate}</span>
                    )}
                  </td>
                  <td className="px-2 py-1.5">
                    {editing ? (
                      <Input
                        className="h-8 min-w-[8rem] px-2 text-sm"
                        value={item.note}
                        onChange={(e) =>
                          patchRow(item.id, { note: e.target.value })
                        }
                      />
                    ) : (
                      <span className="text-muted-foreground">
                        {item.note || "—"}
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-1.5">
                    <button
                      type="button"
                      className="inline-flex rounded p-1 hover:text-dh-red disabled:opacity-40"
                      disabled={!editing}
                      title={
                        editing
                          ? "삭제"
                          : "수정 모드에서 삭제할 수 있습니다"
                      }
                      onClick={() => removeRow(item.id, item.employeeName)}
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
