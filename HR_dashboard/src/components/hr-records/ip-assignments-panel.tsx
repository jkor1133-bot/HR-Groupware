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
import { seedIpAssignments } from "@/data/hr-records-seed";
import { useLocalList } from "@/hooks/use-local-list";
import {
  cellStr,
  downloadRowsAsExcel,
  readExcelFile,
} from "@/lib/excel";
import type { IpAssignmentRecord } from "@/lib/types";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "hr-dashboard-ips-v1";

/** IP 끝자리(마지막 옥텟) 추출. 210.101.130.2 → 2 */
export function lastIpOctet(ip: string): number | null {
  const m = String(ip ?? "")
    .trim()
    .match(/(?:^|\.)(\d{1,3})$/);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n) || n < 0 || n > 255) return null;
  return n;
}

function cloneItems(items: IpAssignmentRecord[]) {
  return JSON.parse(JSON.stringify(items)) as IpAssignmentRecord[];
}

function emptyForm() {
  return { userName: "", ipAddress: "", note: "" };
}

export function IpAssignmentsPanel() {
  const list = useLocalList(STORAGE_KEY, seedIpAssignments);
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<IpAssignmentRecord[] | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    if (!editing) setDraft(null);
  }, [editing]);

  const working = editing && draft ? draft : list.items;

  const rows = useMemo(() => {
    return [...working].sort((a, b) => {
      const oa = lastIpOctet(a.ipAddress);
      const ob = lastIpOctet(b.ipAddress);
      if (oa != null && ob != null && oa !== ob) return oa - ob;
      if (oa != null && ob == null) return -1;
      if (oa == null && ob != null) return 1;
      return (a.userName || "").localeCompare(b.userName || "", "ko");
    });
  }, [working]);

  /** 끝자리가 등록된 IP → 사용 중 */
  const usedOctets = useMemo(() => {
    const set = new Set<number>();
    for (const r of working) {
      const n = lastIpOctet(r.ipAddress);
      if (n != null) set.add(n);
    }
    return set;
  }, [working]);

  /** 엑셀 오른쪽표처럼 1 ~ max(끝자리) 사용유무 보드 */
  const usageBoard = useMemo(() => {
    const max = usedOctets.size
      ? Math.max(...usedOctets, 5)
      : 5;
    const end = Math.min(255, Math.max(max, 5));
    return Array.from({ length: end }, (_, i) => i + 1);
  }, [usedOctets]);

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

  function addRow() {
    if (!form.userName.trim() || !form.ipAddress.trim()) return;
    const item: IpAssignmentRecord = {
      id: `ip-${Date.now()}`,
      userName: form.userName.trim(),
      ipAddress: form.ipAddress.trim(),
      note: form.note.trim(),
    };
    if (editing) {
      setDraft((prev) => [...(prev ?? cloneItems(list.items)), item]);
    } else {
      list.upsert(item);
    }
    setForm(emptyForm());
  }

  function patchRow(id: string, patch: Partial<IpAssignmentRecord>) {
    setDraft((prev) => {
      const base = prev ?? cloneItems(list.items);
      return base.map((row) => (row.id === id ? { ...row, ...patch } : row));
    });
  }

  function removeRow(id: string, name: string) {
    if (!editing) {
      window.alert("수정 모드에서 삭제할 수 있습니다.");
      return;
    }
    if (!window.confirm(`"${name}" IP 부여를 삭제할까요? (저장 시 반영)`)) {
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
    const next = excelRows
      .map((row, i) => ({
        id: `ip-up-${Date.now()}-${i}`,
        userName: cellStr(row, "사용자", "성명", "userName"),
        ipAddress: cellStr(row, "IP주소", "IP 주소", "ipAddress", "IP"),
        note: cellStr(row, "비고", "구분", "note"),
      }))
      .filter((r) => r.userName && r.ipAddress);
    if (next.length) setDraft(next);
  }

  function exportExcel() {
    downloadRowsAsExcel(
      rows.map((r) => {
        const octet = lastIpOctet(r.ipAddress);
        return {
          사용자: r.userName,
          IP주소: r.ipAddress,
          비고: r.note,
          끝자리: octet ?? "",
          사용유무: octet != null && usedOctets.has(octet) ? "○" : "",
        };
      }),
      "IP부여현황.xlsx",
    );
  }

  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-heading text-lg font-semibold text-dh-deep dark:text-dh-light">
            IP 부여 현황
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            IP 끝자리(예: 210.101.130.2 → 2)가 등록되어 있으면 사용유무에 ○가
            표시됩니다. 사용자는 사원명부에서 선택할 수 있습니다.
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

      <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <div className="grid gap-1">
          <Label>사용자</Label>
          <EmployeePicker
            value={form.userName}
            onChange={(name) =>
              setForm((prev) => ({ ...prev, userName: name }))
            }
            placeholder="이름 입력 후 선택"
          />
        </div>
        <div className="grid gap-1">
          <Label>IP주소</Label>
          <Input
            value={form.ipAddress}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, ipAddress: e.target.value }))
            }
            placeholder="210.101.130.2"
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

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(10rem,14rem)]">
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="gw-data-table w-full min-w-[520px] text-sm">
            <thead>
              <tr className="bg-dh-deep text-white">
                <th className="px-3 py-2">사용자</th>
                <th className="px-3 py-2">IP주소</th>
                <th className="px-3 py-2">비고</th>
                <th className="px-3 py-2 text-center">사용유무</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-8 text-center text-muted-foreground"
                  >
                    등록된 항목이 없습니다.
                  </td>
                </tr>
              ) : (
                rows.map((item) => {
                  const octet = lastIpOctet(item.ipAddress);
                  const inUse = octet != null && usedOctets.has(octet);
                  return (
                    <tr key={item.id} className="border-t border-border">
                      <td className="px-2 py-1.5">
                        {editing ? (
                          <EmployeePicker
                            value={item.userName}
                            onChange={(name) =>
                              patchRow(item.id, { userName: name })
                            }
                          />
                        ) : (
                          <span className="font-medium">{item.userName}</span>
                        )}
                      </td>
                      <td className="px-2 py-1.5">
                        {editing ? (
                          <Input
                            className="h-8 min-w-[10rem] px-2 text-sm tabular-nums"
                            value={item.ipAddress}
                            onChange={(e) =>
                              patchRow(item.id, {
                                ipAddress: e.target.value,
                              })
                            }
                          />
                        ) : (
                          <span className="tabular-nums">{item.ipAddress}</span>
                        )}
                      </td>
                      <td className="px-2 py-1.5">
                        {editing ? (
                          <Input
                            className="h-8 min-w-[5rem] px-2 text-sm"
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
                      <td className="px-2 py-1.5 text-center">
                        <span
                          className={cn(
                            "inline-flex min-w-[2rem] justify-center text-base font-semibold",
                            inUse
                              ? "text-dh-deep dark:text-dh-light"
                              : "text-muted-foreground",
                          )}
                          title={
                            octet == null
                              ? "IP 끝자리를 인식할 수 없습니다"
                              : inUse
                                ? `끝자리 ${octet} 사용 중`
                                : `끝자리 ${octet} 미사용`
                          }
                        >
                          {inUse ? "○" : "—"}
                        </span>
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
                          onClick={() => removeRow(item.id, item.userName)}
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

        <div className="overflow-hidden rounded-lg border border-border">
          <div className="bg-dh-deep px-3 py-2 text-center text-sm font-semibold text-white">
            사용유무 (끝자리)
          </div>
          <div className="max-h-[28rem] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/80">
                <tr>
                  <th className="px-2 py-1.5 text-center font-medium">구분</th>
                  <th className="px-2 py-1.5 text-center font-medium">
                    사용유무
                  </th>
                </tr>
              </thead>
              <tbody>
                {usageBoard.map((n) => {
                  const used = usedOctets.has(n);
                  return (
                    <tr
                      key={n}
                      className={cn(
                        "border-t border-border",
                        used && "bg-dh-sky/15",
                      )}
                    >
                      <td className="px-2 py-1 text-center tabular-nums">
                        {n}
                      </td>
                      <td className="px-2 py-1 text-center text-base font-semibold text-dh-deep dark:text-dh-light">
                        {used ? "○" : ""}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="border-t border-border px-2 py-1.5 text-[10px] text-muted-foreground">
            IP 끝자리가 부여 목록에 있으면 ○ 표시 (예: …130.2 → 2)
          </p>
        </div>
      </div>
    </section>
  );
}
