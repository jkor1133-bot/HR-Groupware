"use client";

import { useMemo, useRef, useState } from "react";
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
import { useEmployees } from "@/hooks/use-employees";
import { useStaffMovements } from "@/hooks/use-staff-movements";
import {
  EMPLOYEE_DIVISIONS,
  EMPLOYEE_GENDERS,
  EMPLOYEE_JOB_TRACKS,
  EMPLOYEE_TITLES,
  departmentsForDivision,
} from "@/lib/employee-roster";
import {
  cellDate,
  cellStr,
  downloadRowsAsExcel,
  parsePastedTable,
  readExcelFile,
} from "@/lib/excel";
import { LEAVE_REASONS } from "@/data/org";
import type {
  EmployeeRosterRecord,
  LeaveReason,
  StaffMovementKind,
  StaffMovementRecord,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const selectClass =
  "h-8 w-full rounded-md border border-border bg-background px-2 text-sm disabled:opacity-60";

type FormState = {
  name: string;
  empNo: string;
  division: string;
  department: string;
  jobTrack: string;
  title: string;
  gender: string;
  eventDate: string;
  hireDate: string;
  leaveReason: string;
  note: string;
  rosterId: string;
};

function emptyForm(): FormState {
  const division = EMPLOYEE_DIVISIONS[1];
  return {
    name: "",
    empNo: "",
    division,
    department: departmentsForDivision(division)[0] ?? "",
    jobTrack: "일반직",
    title: "사원",
    gender: "남자",
    eventDate: "",
    hireDate: "",
    leaveReason: "이직",
    note: "",
    rosterId: "",
  };
}

function cloneItems(items: StaffMovementRecord[]) {
  return JSON.parse(JSON.stringify(items)) as StaffMovementRecord[];
}

export function StaffMovementsPanel() {
  const movements = useStaffMovements();
  const roster = useEmployees();
  const fileRef = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<StaffMovementKind>("hire");
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<StaffMovementRecord[] | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");

  const working = editing && draft ? draft : movements.items;
  const filtered = useMemo(
    () =>
      [...working]
        .filter((m) => m.kind === kind)
        .sort((a, b) => b.eventDate.localeCompare(a.eventDate)),
    [working, kind],
  );

  const deptOptions = useMemo(
    () => departmentsForDivision(form.division),
    [form.division],
  );

  function startEdit() {
    setDraft(cloneItems(movements.items));
    setEditing(true);
  }

  function cancelEdit() {
    setDraft(null);
    setEditing(false);
  }

  function saveEdit() {
    if (!draft) return;
    movements.replaceAll(draft);
    setEditing(false);
    setDraft(null);
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 2000);
  }

  function fillFromRoster(emp: EmployeeRosterRecord | null, name: string) {
    if (!emp) {
      setForm((f) => ({ ...f, name, rosterId: "" }));
      return;
    }
    setForm((f) => ({
      ...f,
      name: emp.name,
      empNo: emp.empNo,
      division: emp.division || f.division,
      department: emp.department || f.department,
      jobTrack: emp.jobTrack || f.jobTrack,
      title: emp.title || f.title,
      gender: emp.gender || f.gender,
      hireDate: emp.hireDate || emp.groupHireDate || f.hireDate,
      eventDate:
        kind === "hire"
          ? emp.hireDate || emp.groupHireDate || f.eventDate
          : f.eventDate,
      rosterId: emp.id,
    }));
  }

  function addRow() {
    if (!form.name.trim() || !form.eventDate) {
      window.alert(
        kind === "hire"
          ? "성명과 입사일은 필수입니다."
          : "성명과 퇴사일은 필수입니다.",
      );
      return;
    }

    const item: StaffMovementRecord = {
      id: `sm-${Date.now()}`,
      kind,
      name: form.name.trim(),
      empNo: form.empNo.trim(),
      division: form.division,
      department: form.department,
      jobTrack: form.jobTrack,
      title: form.title,
      gender: form.gender,
      eventDate: form.eventDate,
      hireDate:
        kind === "leave"
          ? form.hireDate || undefined
          : form.eventDate,
      leaveReason:
        kind === "leave"
          ? (form.leaveReason as LeaveReason) || "기타"
          : undefined,
      note: form.note.trim(),
      rosterId: form.rosterId || undefined,
    };

    if (editing) {
      setDraft((prev) => [...(prev ?? cloneItems(movements.items)), item]);
    } else {
      movements.upsert(item);
    }

    // 사원명부 연동
    if (kind === "hire") {
      const rosterItem: EmployeeRosterRecord = {
        id: form.rosterId || `emp-${Date.now()}`,
        division: form.division,
        department: form.department,
        part: "",
        empNo: form.empNo.trim() || `H${Date.now().toString().slice(-6)}`,
        name: form.name.trim(),
        title: form.title,
        jobRole: "팀원",
        jobTrack: form.jobTrack,
        gender: form.gender,
        titleYears: 1,
        groupHireDate: form.eventDate,
        hireDate: form.eventDate,
      };
      const existing = form.rosterId
        ? roster.items.find((r) => r.id === form.rosterId)
        : roster.items.find(
            (r) =>
              r.name === rosterItem.name &&
              (rosterItem.empNo
                ? r.empNo === rosterItem.empNo
                : true),
          );
      if (existing) {
        roster.upsert({
          ...existing,
          ...rosterItem,
          id: existing.id,
          part: existing.part,
          jobRole: existing.jobRole,
          titleYears: existing.titleYears,
        });
      } else {
        roster.upsert(rosterItem);
      }
    } else if (kind === "leave") {
      const target =
        (form.rosterId &&
          roster.items.find((r) => r.id === form.rosterId)) ||
        roster.items.find(
          (r) =>
            r.name === form.name.trim() &&
            (!form.empNo.trim() || r.empNo === form.empNo.trim()),
        );
      if (
        target &&
        window.confirm(
          `"${target.name}"을(를) 사원명부(재직)에서 제거할까요?\n(대시보드 재직 인원에 바로 반영됩니다)`,
        )
      ) {
        roster.remove(target.id);
      }
    }

    setForm(emptyForm());
  }

  function patchRow(id: string, next: Partial<StaffMovementRecord>) {
    setDraft((prev) => {
      const base = prev ?? cloneItems(movements.items);
      return base.map((row) => (row.id === id ? { ...row, ...next } : row));
    });
  }

  function removeRow(id: string, name: string) {
    if (!editing) {
      window.alert("수정 모드에서 삭제할 수 있습니다.");
      return;
    }
    if (!window.confirm(`"${name}" 기록을 삭제할까요? (저장 시 반영)`)) return;
    setDraft((prev) =>
      (prev ?? cloneItems(movements.items)).filter((r) => r.id !== id),
    );
  }

  function mapPasteRows(
    rows: Record<string, unknown>[],
  ): StaffMovementRecord[] {
    return rows
      .map((row, i) => {
        const kindRaw = cellStr(row, "구분", "kind", "유형");
        const rowKind: StaffMovementKind =
          kindRaw.includes("퇴") || kindRaw === "leave" ? "leave" : "hire";
        return {
          id: `sm-up-${Date.now()}-${i}`,
          kind: rowKind,
          name: cellStr(row, "성명", "이름", "name"),
          empNo: cellStr(row, "사번", "empNo"),
          division: cellStr(row, "상위부서", "본부", "division") || "경영지원본부",
          department: cellStr(row, "부서", "팀", "department") || "인사총무팀",
          jobTrack: cellStr(row, "직군", "jobTrack") || "일반직",
          title: cellStr(row, "직위", "title") || "사원",
          gender: cellStr(row, "성별", "gender") || "남자",
          eventDate: cellDate(
            row,
            rowKind === "leave" ? "퇴사일" : "입사일",
            "eventDate",
            "일자",
          ),
          hireDate:
            cellDate(row, "입사일", "hireDate") ||
            (rowKind === "hire"
              ? cellDate(row, "일자", "eventDate")
              : undefined),
          leaveReason:
            rowKind === "leave"
              ? cellStr(row, "퇴사사유", "leaveReason", "사유") || "기타"
              : undefined,
          note: cellStr(row, "비고", "note"),
        } satisfies StaffMovementRecord;
      })
      .filter((r) => r.name && r.eventDate);
  }

  async function upload(file?: File) {
    if (!file) return;
    const rows = await readExcelFile(file);
    const next = mapPasteRows(rows).map((r) => ({ ...r, kind }));
    if (!next.length) {
      window.alert("유효한 행이 없습니다. (성명·일자 필수)");
      return;
    }
    const merged = [
      ...working.filter((m) => m.kind !== kind),
      ...next,
    ];
    if (editing) setDraft(merged);
    else movements.replaceAll(merged);
  }

  function applyPaste() {
    const rows = parsePastedTable(pasteText);
    const next = mapPasteRows(rows).map((r) => ({ ...r, kind }));
    if (!next.length) {
      window.alert("붙여넣기 형식을 확인해 주세요. (헤더+성명·일자)");
      return;
    }
    const merged = [
      ...working.filter((m) => m.kind !== kind),
      ...next,
    ];
    if (editing) setDraft(merged);
    else movements.replaceAll(merged);
    setPasteOpen(false);
    setPasteText("");
  }

  function exportExcel() {
    downloadRowsAsExcel(
      filtered.map((m) => ({
        구분: m.kind === "hire" ? "입사" : "퇴사",
        성명: m.name,
        사번: m.empNo,
        상위부서: m.division,
        부서: m.department,
        직군: m.jobTrack,
        직위: m.title,
        성별: m.gender,
        입사일: m.kind === "hire" ? m.eventDate : m.hireDate ?? "",
        퇴사일: m.kind === "leave" ? m.eventDate : "",
        퇴사사유: m.leaveReason ?? "",
        비고: m.note,
      })),
      kind === "hire" ? "입사자현황.xlsx" : "퇴사자현황.xlsx",
      kind === "hire" ? "입사" : "퇴사",
    );
  }

  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-heading text-lg font-semibold text-dh-deep dark:text-dh-light">
            입퇴사자 현황
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            입사·퇴사를 등록하면 HR 대시보드에 반영됩니다. 사원명부에서 입사일이
            2026-01-01 이후인 인원은 입사자에 자동 등록됩니다.
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPasteOpen((v) => !v)}
          >
            붙여넣기
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

      <div className="mb-4 inline-flex rounded-lg border border-border bg-background p-0.5">
        <button
          type="button"
          onClick={() => {
            setKind("hire");
            setForm(emptyForm());
          }}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-medium sm:text-sm",
            kind === "hire"
              ? "bg-dh-real text-white"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          입사자 ({working.filter((m) => m.kind === "hire").length})
        </button>
        <button
          type="button"
          onClick={() => {
            setKind("leave");
            setForm(emptyForm());
          }}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-medium sm:text-sm",
            kind === "leave"
              ? "bg-dh-real text-white"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          퇴사자 ({working.filter((m) => m.kind === "leave").length})
        </button>
      </div>

      {pasteOpen ? (
        <div className="mb-4 rounded-lg border border-border bg-muted/30 p-3">
          <p className="mb-2 text-xs text-muted-foreground">
            엑셀에서 헤더 포함 복사 후 붙여넣기 · 현재 탭(
            {kind === "hire" ? "입사" : "퇴사"})으로 저장됩니다.
          </p>
          <textarea
            className="min-h-[7rem] w-full rounded-md border border-border bg-background p-2 font-mono text-xs"
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder="성명	사번	상위부서	부서	직군	직위	성별	입사일/퇴사일	퇴사사유	비고"
          />
          <div className="mt-2 flex gap-2">
            <Button size="sm" onClick={applyPaste}>
              붙여넣기 적용
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setPasteOpen(false);
                setPasteText("");
              }}
            >
              닫기
            </Button>
          </div>
        </div>
      ) : null}

      <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <div className="grid gap-1">
          <Label>성명 (사원명부)</Label>
          <EmployeePicker
            value={form.name}
            onChange={(name, emp) => fillFromRoster(emp, name)}
            placeholder="사원 선택 또는 아래에서 수기"
          />
        </div>
        <div className="grid gap-1">
          <Label>성명 수기</Label>
          <Input
            value={form.name}
            onChange={(e) =>
              setForm((f) => ({ ...f, name: e.target.value, rosterId: "" }))
            }
            placeholder="명부에 없으면 직접 입력"
          />
        </div>
        <div className="grid gap-1">
          <Label>사번</Label>
          <Input
            value={form.empNo}
            onChange={(e) => setForm((f) => ({ ...f, empNo: e.target.value }))}
          />
        </div>
        <div className="grid gap-1">
          <Label>상위부서</Label>
          <select
            className={selectClass}
            value={form.division}
            onChange={(e) => {
              const division = e.target.value;
              const depts = departmentsForDivision(division);
              setForm((f) => ({
                ...f,
                division,
                department: depts.includes(f.department)
                  ? f.department
                  : (depts[0] ?? ""),
              }));
            }}
          >
            {EMPLOYEE_DIVISIONS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1">
          <Label>부서</Label>
          <select
            className={selectClass}
            value={form.department}
            onChange={(e) =>
              setForm((f) => ({ ...f, department: e.target.value }))
            }
          >
            {deptOptions.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1">
          <Label>직군</Label>
          <select
            className={selectClass}
            value={form.jobTrack}
            onChange={(e) =>
              setForm((f) => ({ ...f, jobTrack: e.target.value }))
            }
          >
            {EMPLOYEE_JOB_TRACKS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1">
          <Label>직위</Label>
          <select
            className={selectClass}
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          >
            {EMPLOYEE_TITLES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1">
          <Label>성별</Label>
          <select
            className={selectClass}
            value={form.gender}
            onChange={(e) =>
              setForm((f) => ({ ...f, gender: e.target.value }))
            }
          >
            {EMPLOYEE_GENDERS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1">
          <Label>{kind === "hire" ? "입사일" : "퇴사일"}</Label>
          <Input
            type="date"
            value={form.eventDate}
            onChange={(e) =>
              setForm((f) => ({ ...f, eventDate: e.target.value }))
            }
          />
        </div>
        {kind === "leave" ? (
          <>
            <div className="grid gap-1">
              <Label>입사일 (근속용)</Label>
              <Input
                type="date"
                value={form.hireDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, hireDate: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-1">
              <Label>퇴사사유</Label>
              <select
                className={selectClass}
                value={form.leaveReason}
                onChange={(e) =>
                  setForm((f) => ({ ...f, leaveReason: e.target.value }))
                }
              >
                {LEAVE_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </>
        ) : null}
        <div className="grid gap-1">
          <Label>비고</Label>
          <Input
            value={form.note}
            onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
          />
        </div>
        <div className="flex items-end">
          <Button className="w-full" onClick={addRow}>
            <Plus data-icon="inline-start" />
            {kind === "hire" ? "입사 등록" : "퇴사 등록"}
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="gw-data-table w-full min-w-[900px] text-sm">
          <thead>
            <tr className="bg-dh-deep text-white">
              <th className="px-2 py-2">성명</th>
              <th className="px-2 py-2">사번</th>
              <th className="px-2 py-2">상위부서</th>
              <th className="px-2 py-2">부서</th>
              <th className="px-2 py-2">직군</th>
              <th className="px-2 py-2">직위</th>
              <th className="px-2 py-2">성별</th>
              <th className="px-2 py-2">
                {kind === "hire" ? "입사일" : "퇴사일"}
              </th>
              {kind === "leave" ? (
                <>
                  <th className="px-2 py-2">입사일</th>
                  <th className="px-2 py-2">퇴사사유</th>
                </>
              ) : null}
              <th className="px-2 py-2">비고</th>
              <th className="px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {!movements.hydrated ? (
              <tr>
                <td
                  colSpan={12}
                  className="px-3 py-8 text-center text-muted-foreground"
                >
                  불러오는 중…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={12}
                  className="px-3 py-8 text-center text-muted-foreground"
                >
                  등록된 {kind === "hire" ? "입사" : "퇴사"} 기록이 없습니다.
                </td>
              </tr>
            ) : (
              filtered.map((m) => (
                <tr key={m.id} className="border-t border-border">
                  <td className="px-2 py-1.5 font-medium">
                    {editing ? (
                      <Input
                        className="h-8 text-sm"
                        value={m.name}
                        onChange={(e) =>
                          patchRow(m.id, { name: e.target.value })
                        }
                      />
                    ) : (
                      m.name
                    )}
                  </td>
                  <td className="px-2 py-1.5">
                    {editing ? (
                      <Input
                        className="h-8 text-sm"
                        value={m.empNo}
                        onChange={(e) =>
                          patchRow(m.id, { empNo: e.target.value })
                        }
                      />
                    ) : (
                      m.empNo
                    )}
                  </td>
                  <td className="px-2 py-1.5">{m.division}</td>
                  <td className="px-2 py-1.5">{m.department}</td>
                  <td className="px-2 py-1.5">{m.jobTrack}</td>
                  <td className="px-2 py-1.5">{m.title}</td>
                  <td className="px-2 py-1.5">{m.gender}</td>
                  <td className="px-2 py-1.5">
                    {editing ? (
                      <Input
                        type="date"
                        className="h-8 text-sm"
                        value={m.eventDate}
                        onChange={(e) =>
                          patchRow(m.id, { eventDate: e.target.value })
                        }
                      />
                    ) : (
                      m.eventDate
                    )}
                  </td>
                  {kind === "leave" ? (
                    <>
                      <td className="px-2 py-1.5">{m.hireDate || "—"}</td>
                      <td className="px-2 py-1.5">
                        {editing ? (
                          <select
                            className={selectClass}
                            value={String(m.leaveReason ?? "기타")}
                            onChange={(e) =>
                              patchRow(m.id, {
                                leaveReason: e.target.value,
                              })
                            }
                          >
                            {LEAVE_REASONS.map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                        ) : (
                          m.leaveReason || "—"
                        )}
                      </td>
                    </>
                  ) : null}
                  <td className="px-2 py-1.5 text-muted-foreground">
                    {m.note}
                  </td>
                  <td className="px-2 py-1.5">
                    <button
                      type="button"
                      className="inline-flex rounded p-1 hover:text-dh-red disabled:opacity-40"
                      disabled={!editing}
                      onClick={() => removeRow(m.id, m.name)}
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
