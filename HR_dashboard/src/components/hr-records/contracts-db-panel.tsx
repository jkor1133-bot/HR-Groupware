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
import { useLocalList } from "@/hooks/use-local-list";
import {
  cellDate,
  cellStr,
  downloadRowsAsExcel,
  readExcelFile,
} from "@/lib/excel";
import {
  CONTRACTS_STORAGE_KEY,
  loadContracts,
  normalizeContract,
} from "@/lib/hr-ops-storage";
import type { ContractRecord, JobTrack } from "@/lib/types";

const TRACKS: JobTrack[] = [
  "일반직",
  "지원직",
  "현장직",
  "별정직",
  "계약직",
];

type Props = {
  contractTrackOnly?: boolean;
  title?: string;
  description?: string;
};

const emptyForm = (contractTrackOnly: boolean) => ({
  employeeName: "",
  jobTrack: (contractTrackOnly ? "계약직" : "현장직") as JobTrack,
  contractType: "기간제",
  initialDate: "",
  startDate: "",
  endDate: "",
  note: "",
});

function cloneItems(items: ContractRecord[]) {
  return JSON.parse(JSON.stringify(items)) as ContractRecord[];
}

function daysLeft(endDate: string) {
  const end = new Date(`${endDate}T00:00:00`).getTime();
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((end - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function ContractsDbPanel({
  contractTrackOnly = false,
  title = "근로계약 DB 등록",
  description = "웹에서 직접 입력하거나 엑셀로 일괄 업로드할 수 있습니다. 홈 화면에는 종료 1개월 전 항목이 알림으로 표시됩니다.",
}: Props) {
  const contracts = useLocalList(CONTRACTS_STORAGE_KEY, loadContracts);
  const contractFileRef = useRef<HTMLInputElement>(null);
  const [cForm, setCForm] = useState(() => emptyForm(contractTrackOnly));
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ContractRecord[] | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    if (!editing) setDraft(null);
  }, [editing]);

  const baseItems = useMemo(
    () =>
      contractTrackOnly
        ? contracts.items.filter((c) => c.jobTrack === "계약직")
        : contracts.items,
    [contracts.items, contractTrackOnly],
  );

  const working =
    editing && draft
      ? contractTrackOnly
        ? draft.filter((c) => c.jobTrack === "계약직")
        : draft
      : baseItems;

  function startEdit() {
    setDraft(cloneItems(contracts.items.map(normalizeContract)));
    setEditing(true);
  }

  function cancelEdit() {
    setDraft(null);
    setEditing(false);
  }

  function saveEdit() {
    if (!draft) return;
    contracts.replaceAll(draft.map(normalizeContract));
    setEditing(false);
    setDraft(null);
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 2000);
  }

  function saveContract() {
    if (!cForm.employeeName || !cForm.endDate) return;
    const startDate = cForm.startDate;
    const item = normalizeContract({
      id: `ct-${Date.now()}`,
      ...cForm,
      jobTrack: contractTrackOnly ? "계약직" : cForm.jobTrack,
      initialDate: cForm.initialDate || startDate,
      startDate,
    });
    if (editing) {
      setDraft((prev) => [
        ...(prev ?? cloneItems(contracts.items)),
        item,
      ]);
    } else {
      contracts.upsert(item);
    }
    setCForm(emptyForm(contractTrackOnly));
  }

  function patchRow(id: string, patch: Partial<ContractRecord>) {
    setDraft((prev) => {
      const base = prev ?? cloneItems(contracts.items);
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
      (prev ?? cloneItems(contracts.items)).filter((r) => r.id !== id),
    );
  }

  async function uploadContracts(file?: File) {
    if (!file) return;
    if (!editing) {
      window.alert("먼저 [수정]을 누른 뒤 업로드하고 [저장]하세요.");
      return;
    }
    const rows = await readExcelFile(file);
    const next = rows
      .map((row, i) => {
        const startDate = cellDate(row, "시작일", "startDate");
        return normalizeContract({
          id: `ct-up-${Date.now()}-${i}`,
          employeeName: cellStr(row, "성명", "이름", "employeeName"),
          jobTrack: cellStr(row, "직군", "jobTrack") || "일반직",
          contractType: cellStr(row, "계약유형", "contractType") || "기간제",
          initialDate: cellDate(
            row,
            "최초계약일",
            "최초 계약일",
            "initialDate",
          ),
          startDate,
          endDate: cellDate(row, "종료일", "endDate"),
          note: cellStr(row, "비고", "note"),
        });
      })
      .filter((r) => r.employeeName && r.endDate);
    if (!next.length) return;
    if (contractTrackOnly) {
      const others = (draft ?? contracts.items).filter(
        (c) => c.jobTrack !== "계약직",
      );
      const only = next.map((r) => ({ ...r, jobTrack: "계약직" as const }));
      setDraft([...others, ...only]);
    } else {
      setDraft(next);
    }
  }

  const editActions = editing ? (
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
  );

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
                working.map((c) => ({
                  성명: c.employeeName,
                  직군: c.jobTrack,
                  계약유형: c.contractType,
                  최초계약일: c.initialDate,
                  시작일: c.startDate,
                  종료일: c.endDate,
                  비고: c.note,
                })),
                contractTrackOnly ? "계약직현황.xlsx" : "근로계약.xlsx",
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
            onClick={() => contractFileRef.current?.click()}
          >
            <Upload data-icon="inline-start" />
            업로드
          </Button>
          <input
            ref={contractFileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => {
              void uploadContracts(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          {editActions}
        </div>
      </div>

      <div className="mb-4 grid gap-2 @md/app:grid-cols-3 @4xl/app:grid-cols-4 @6xl/app:grid-cols-8">
        <div className="grid gap-1">
          <Label>성명</Label>
          <Input
            value={cForm.employeeName}
            disabled={!editing}
            onChange={(e) =>
              setCForm({ ...cForm, employeeName: e.target.value })
            }
          />
        </div>
        <div className="grid gap-1">
          <Label>직군</Label>
          <select
            className="h-8 rounded-md border border-border bg-background px-2 text-sm disabled:opacity-70"
            value={cForm.jobTrack}
            disabled={!editing || contractTrackOnly}
            onChange={(e) =>
              setCForm({ ...cForm, jobTrack: e.target.value as JobTrack })
            }
          >
            {TRACKS.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className="grid gap-1">
          <Label>계약유형</Label>
          <Input
            value={cForm.contractType}
            disabled={!editing}
            onChange={(e) =>
              setCForm({ ...cForm, contractType: e.target.value })
            }
          />
        </div>
        <div className="grid gap-1">
          <Label>최초 계약일</Label>
          <Input
            type="date"
            value={cForm.initialDate}
            disabled={!editing}
            onChange={(e) =>
              setCForm({ ...cForm, initialDate: e.target.value })
            }
          />
        </div>
        <div className="grid gap-1">
          <Label>시작일</Label>
          <Input
            type="date"
            value={cForm.startDate}
            disabled={!editing}
            onChange={(e) =>
              setCForm({ ...cForm, startDate: e.target.value })
            }
          />
        </div>
        <div className="grid gap-1">
          <Label>종료일</Label>
          <Input
            type="date"
            value={cForm.endDate}
            disabled={!editing}
            onChange={(e) => setCForm({ ...cForm, endDate: e.target.value })}
          />
        </div>
        <div className="flex items-end gap-2 @4xl/app:col-span-2">
          <Button
            className="flex-1"
            disabled={!editing}
            onClick={saveContract}
          >
            <Plus data-icon="inline-start" />
            행 추가
          </Button>
          {!editing ? (
            <Button size="default" onClick={startEdit}>
              <Pencil data-icon="inline-start" />
              수정
            </Button>
          ) : (
            <Button size="default" onClick={saveEdit}>
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
              <th className="px-3 py-2">성명</th>
              <th className="px-3 py-2">직군</th>
              <th className="px-3 py-2">유형</th>
              <th className="px-3 py-2">최초 계약</th>
              <th className="px-3 py-2">시작</th>
              <th className="px-3 py-2">종료</th>
              {contractTrackOnly ? <th className="px-3 py-2">잔여</th> : null}
              <th className="px-3 py-2">비고</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {working.length === 0 ? (
              <tr>
                <td
                  colSpan={contractTrackOnly ? 9 : 8}
                  className="px-3 py-8 text-center text-muted-foreground"
                >
                  등록된 항목이 없습니다.
                </td>
              </tr>
            ) : (
              working.map((c) => {
                const left = daysLeft(c.endDate);
                return (
                  <tr key={c.id} className="border-t border-border">
                    <td className="px-2 py-1.5">
                      {editing ? (
                        <Input
                          className="h-8 min-w-[5rem] px-2 text-sm"
                          value={c.employeeName}
                          onChange={(e) =>
                            patchRow(c.id, { employeeName: e.target.value })
                          }
                        />
                      ) : (
                        c.employeeName
                      )}
                    </td>
                    <td className="px-2 py-1.5">
                      {editing ? (
                        <select
                          className="h-8 w-full min-w-[5.5rem] rounded-md border border-border bg-background px-2 text-sm"
                          value={c.jobTrack}
                          disabled={contractTrackOnly}
                          onChange={(e) =>
                            patchRow(c.id, {
                              jobTrack: e.target.value as JobTrack,
                            })
                          }
                        >
                          {TRACKS.map((t) => (
                            <option key={t}>{t}</option>
                          ))}
                        </select>
                      ) : (
                        c.jobTrack
                      )}
                    </td>
                    <td className="px-2 py-1.5">
                      {editing ? (
                        <Input
                          className="h-8 min-w-[4.5rem] px-2 text-sm"
                          value={c.contractType}
                          onChange={(e) =>
                            patchRow(c.id, { contractType: e.target.value })
                          }
                        />
                      ) : (
                        c.contractType
                      )}
                    </td>
                    <td className="px-2 py-1.5">
                      {editing ? (
                        <Input
                          type="date"
                          className="h-8 min-w-[8.5rem] px-2 text-sm"
                          value={c.initialDate}
                          onChange={(e) =>
                            patchRow(c.id, { initialDate: e.target.value })
                          }
                        />
                      ) : (
                        c.initialDate
                      )}
                    </td>
                    <td className="px-2 py-1.5">
                      {editing ? (
                        <Input
                          type="date"
                          className="h-8 min-w-[8.5rem] px-2 text-sm"
                          value={c.startDate}
                          onChange={(e) =>
                            patchRow(c.id, { startDate: e.target.value })
                          }
                        />
                      ) : (
                        c.startDate
                      )}
                    </td>
                    <td className="px-2 py-1.5">
                      {editing ? (
                        <Input
                          type="date"
                          className="h-8 min-w-[8.5rem] px-2 text-sm"
                          value={c.endDate}
                          onChange={(e) =>
                            patchRow(c.id, { endDate: e.target.value })
                          }
                        />
                      ) : (
                        <span className="font-medium text-dh-red">
                          {c.endDate}
                        </span>
                      )}
                    </td>
                    {contractTrackOnly ? (
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
                          value={c.note}
                          onChange={(e) =>
                            patchRow(c.id, { note: e.target.value })
                          }
                        />
                      ) : (
                        <span className="text-muted-foreground">{c.note}</span>
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
                        onClick={() => removeRow(c.id)}
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
