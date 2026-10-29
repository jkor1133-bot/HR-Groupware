"use client";

import { useEffect, useRef, useState } from "react";
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
import { useLocalList } from "@/hooks/use-local-list";
import {
  cellDate,
  cellStr,
  downloadRowsAsExcel,
  readExcelFile,
} from "@/lib/excel";
import {
  PERMITS_STORAGE_KEY,
  loadPermits,
  normalizePermit,
} from "@/lib/hr-ops-storage";
import type { PermitRecord } from "@/lib/types";

type Props = {
  statusView?: boolean;
  title?: string;
  description?: string;
};

const emptyForm = () => ({
  name: "",
  authority: "",
  initialDate: "",
  startDate: "",
  endDate: "",
  note: "",
});

function cloneItems(items: PermitRecord[]) {
  return JSON.parse(JSON.stringify(items)) as PermitRecord[];
}

function daysLeft(endDate: string) {
  const end = new Date(`${endDate}T00:00:00`).getTime();
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((end - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function PermitsDbPanel({
  statusView = false,
  title = "인허가 DB 등록",
  description = "웹에서 직접 입력하거나 엑셀로 일괄 업로드할 수 있습니다. 홈 화면에는 종료 1개월 전 항목이 알림으로 표시됩니다.",
}: Props) {
  const permits = useLocalList(PERMITS_STORAGE_KEY, loadPermits);
  const permitFileRef = useRef<HTMLInputElement>(null);
  const [pForm, setPForm] = useState(emptyForm);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<PermitRecord[] | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    if (!editing) setDraft(null);
  }, [editing]);

  const working = editing && draft ? draft : permits.items;

  function startEdit() {
    setDraft(cloneItems(permits.items.map(normalizePermit)));
    setEditing(true);
  }

  function cancelEdit() {
    setDraft(null);
    setEditing(false);
  }

  function saveEdit() {
    if (!draft) return;
    permits.replaceAll(draft.map(normalizePermit));
    setEditing(false);
    setDraft(null);
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 2000);
  }

  function savePermit() {
    if (!pForm.name || !pForm.endDate) return;
    const item = normalizePermit({
      id: `pm-${Date.now()}`,
      ...pForm,
      initialDate: pForm.initialDate || pForm.startDate,
    });
    if (editing) {
      setDraft((prev) => [...(prev ?? cloneItems(permits.items)), item]);
    } else {
      permits.upsert(item);
    }
    setPForm(emptyForm());
  }

  function patchRow(id: string, patch: Partial<PermitRecord>) {
    setDraft((prev) => {
      const base = prev ?? cloneItems(permits.items);
      return base.map((row) => (row.id === id ? { ...row, ...patch } : row));
    });
  }

  function removeRow(id: string) {
    if (!editing) {
      window.alert("먼저 [수정]을 누른 뒤 삭제하고 [저장]하세요.");
      return;
    }
    if (!window.confirm("이 행을 삭제할까요? (저장 시 반영)")) return;
    setDraft((prev) =>
      (prev ?? cloneItems(permits.items)).filter((r) => r.id !== id),
    );
  }

  async function uploadPermits(file?: File) {
    if (!file) return;
    if (!editing) {
      window.alert("먼저 [수정]을 누른 뒤 업로드하고 [저장]하세요.");
      return;
    }
    const rows = await readExcelFile(file);
    const next = rows
      .map((row, i) => {
        const startDate = cellDate(row, "시작일", "startDate");
        return normalizePermit({
          id: `pm-up-${Date.now()}-${i}`,
          name: cellStr(row, "인허가명", "명칭", "name"),
          authority: cellStr(row, "관청", "authority"),
          initialDate: cellDate(
            row,
            "최초인허가일",
            "최초 인허가일",
            "initialDate",
          ),
          startDate,
          endDate: cellDate(row, "종료일", "endDate"),
          note: cellStr(row, "비고", "note"),
        });
      })
      .filter((r) => r.name && r.endDate);
    if (next.length) setDraft(next);
  }

  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-heading text-lg font-semibold text-dh-deep dark:text-dh-light">
            {title}
          </h2>
          {description ? (
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          ) : null}
          {editing ? (
            <p className="mt-1 text-xs font-medium text-dh-real">
              수정 모드 — 행 추가·표 편집 후 [저장]으로 마감하세요.
            </p>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">
              [수정] → 행 추가·표 수정 → [저장] 순으로 반영합니다.
            </p>
          )}
          {savedFlash ? (
            <p className="mt-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
              저장되었습니다.
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              downloadRowsAsExcel(
                working.map((p) => ({
                  인허가명: p.name,
                  관청: p.authority,
                  최초인허가일: p.initialDate,
                  시작일: p.startDate,
                  종료일: p.endDate,
                  비고: p.note,
                })),
                statusView ? "인허가현황.xlsx" : "인허가.xlsx",
              )
            }
          >
            <Download data-icon="inline-start" />
            엑셀
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!editing}
            title={editing ? "엑셀 업로드" : "수정 모드에서 업로드할 수 있습니다"}
            onClick={() => permitFileRef.current?.click()}
          >
            <Upload data-icon="inline-start" />
            업로드
          </Button>
          <input
            ref={permitFileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => {
              void uploadPermits(e.target.files?.[0]);
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

      <div className="mb-4 grid gap-2 @md/app:grid-cols-3 @4xl/app:grid-cols-4 @6xl/app:grid-cols-7">
        <div className="grid gap-1 @4xl/app:col-span-2">
          <Label>인허가명</Label>
          <Input
            value={pForm.name}
            disabled={!editing}
            onChange={(e) => setPForm({ ...pForm, name: e.target.value })}
          />
        </div>
        <div className="grid gap-1">
          <Label>관청</Label>
          <Input
            value={pForm.authority}
            disabled={!editing}
            onChange={(e) =>
              setPForm({ ...pForm, authority: e.target.value })
            }
          />
        </div>
        <div className="grid gap-1">
          <Label>최초 인허가일</Label>
          <Input
            type="date"
            value={pForm.initialDate}
            disabled={!editing}
            onChange={(e) =>
              setPForm({ ...pForm, initialDate: e.target.value })
            }
          />
        </div>
        <div className="grid gap-1">
          <Label>시작일</Label>
          <Input
            type="date"
            value={pForm.startDate}
            disabled={!editing}
            onChange={(e) =>
              setPForm({ ...pForm, startDate: e.target.value })
            }
          />
        </div>
        <div className="grid gap-1">
          <Label>종료일</Label>
          <Input
            type="date"
            value={pForm.endDate}
            disabled={!editing}
            onChange={(e) => setPForm({ ...pForm, endDate: e.target.value })}
          />
        </div>
        <div className="flex items-end gap-2">
          <Button
            className="flex-1"
            disabled={!editing}
            onClick={savePermit}
          >
            <Plus data-icon="inline-start" />
            행 추가
          </Button>
          {!editing ? (
            <Button onClick={startEdit}>
              <Pencil data-icon="inline-start" />
              수정
            </Button>
          ) : (
            <Button onClick={saveEdit}>
              <Save data-icon="inline-start" />
              저장
            </Button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="gw-data-table w-full min-w-[760px] text-sm">
          <thead>
            <tr className="bg-dh-deep text-white">
              <th className="px-3 py-2">인허가명</th>
              <th className="px-3 py-2">관청</th>
              <th className="px-3 py-2">최초 인허가</th>
              <th className="px-3 py-2">시작</th>
              <th className="px-3 py-2">종료</th>
              {statusView ? <th className="px-3 py-2">잔여</th> : null}
              <th className="px-3 py-2">비고</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {working.length === 0 ? (
              <tr>
                <td
                  colSpan={statusView ? 8 : 7}
                  className="px-3 py-8 text-center text-muted-foreground"
                >
                  등록된 항목이 없습니다.
                </td>
              </tr>
            ) : (
              working.map((p) => {
                const left = daysLeft(p.endDate);
                return (
                  <tr key={p.id} className="border-t border-border">
                    <td className="px-2 py-1.5">
                      {editing ? (
                        <Input
                          className="h-8 min-w-[8rem] px-2 text-sm"
                          value={p.name}
                          onChange={(e) =>
                            patchRow(p.id, { name: e.target.value })
                          }
                        />
                      ) : (
                        p.name
                      )}
                    </td>
                    <td className="px-2 py-1.5">
                      {editing ? (
                        <Input
                          className="h-8 min-w-[5rem] px-2 text-sm"
                          value={p.authority}
                          onChange={(e) =>
                            patchRow(p.id, { authority: e.target.value })
                          }
                        />
                      ) : (
                        p.authority
                      )}
                    </td>
                    <td className="px-2 py-1.5">
                      {editing ? (
                        <Input
                          type="date"
                          className="h-8 min-w-[8.5rem] px-2 text-sm"
                          value={p.initialDate}
                          onChange={(e) =>
                            patchRow(p.id, { initialDate: e.target.value })
                          }
                        />
                      ) : (
                        p.initialDate
                      )}
                    </td>
                    <td className="px-2 py-1.5">
                      {editing ? (
                        <Input
                          type="date"
                          className="h-8 min-w-[8.5rem] px-2 text-sm"
                          value={p.startDate}
                          onChange={(e) =>
                            patchRow(p.id, { startDate: e.target.value })
                          }
                        />
                      ) : (
                        p.startDate
                      )}
                    </td>
                    <td className="px-2 py-1.5">
                      {editing ? (
                        <Input
                          type="date"
                          className="h-8 min-w-[8.5rem] px-2 text-sm"
                          value={p.endDate}
                          onChange={(e) =>
                            patchRow(p.id, { endDate: e.target.value })
                          }
                        />
                      ) : (
                        <span className="font-medium text-amber-700 dark:text-amber-300">
                          {p.endDate}
                        </span>
                      )}
                    </td>
                    {statusView ? (
                      <td className="px-3 py-2">
                        <span
                          className={
                            left <= 30
                              ? "font-medium text-dh-red"
                              : "text-muted-foreground"
                          }
                        >
                          {left < 0 ? `만료 ${-left}일` : `D-${left}`}
                        </span>
                      </td>
                    ) : null}
                    <td className="px-2 py-1.5">
                      {editing ? (
                        <Input
                          className="h-8 min-w-[6rem] px-2 text-sm"
                          value={p.note}
                          onChange={(e) =>
                            patchRow(p.id, { note: e.target.value })
                          }
                        />
                      ) : (
                        <span className="text-muted-foreground">{p.note}</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        className="inline-flex rounded p-1 hover:text-dh-red disabled:opacity-40"
                        disabled={!editing}
                        title={
                          editing
                            ? "삭제"
                            : "수정 모드에서 삭제할 수 있습니다"
                        }
                        onClick={() => removeRow(p.id)}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
