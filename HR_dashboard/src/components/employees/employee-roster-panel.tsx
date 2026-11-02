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
import { useEmployees } from "@/hooks/use-employees";
import {
  EMPLOYEE_DIVISIONS,
  EMPLOYEE_GENDERS,
  EMPLOYEE_JOB_ROLES,
  EMPLOYEE_JOB_TRACKS,
  EMPLOYEE_TITLES,
  departmentsForDivision,
} from "@/lib/employee-roster";
import {
  cellDate,
  cellNum,
  cellStr,
  downloadRowsAsExcel,
  readExcelFile,
} from "@/lib/excel";
import type { EmployeeRosterRecord } from "@/lib/types";

type FormState = {
  division: string;
  department: string;
  empNo: string;
  name: string;
  title: string;
  jobRole: string;
  jobTrack: string;
  gender: string;
  titleYears: string;
  groupHireDate: string;
  hireDate: string;
};

function emptyForm(): FormState {
  return {
    division: EMPLOYEE_DIVISIONS[1],
    department: departmentsForDivision(EMPLOYEE_DIVISIONS[1])[0] ?? "",
    empNo: "",
    name: "",
    title: "사원",
    jobRole: "팀원",
    jobTrack: "일반직",
    gender: "남자",
    titleYears: "1",
    groupHireDate: "",
    hireDate: "",
  };
}

function cloneItems(items: EmployeeRosterRecord[]) {
  return JSON.parse(JSON.stringify(items)) as EmployeeRosterRecord[];
}

function toRecord(form: FormState, id: string): EmployeeRosterRecord {
  return {
    id,
    division: form.division,
    department: form.department,
    empNo: form.empNo.trim(),
    name: form.name.trim(),
    title: form.title,
    jobRole: form.jobRole,
    jobTrack: form.jobTrack,
    gender: form.gender,
    titleYears: Number(form.titleYears) || 0,
    groupHireDate: form.groupHireDate,
    hireDate: form.hireDate,
  };
}

const selectClass =
  "h-8 w-full rounded-md border border-border bg-background px-2 text-sm disabled:opacity-60";

/** 업로드·내보내기 엑셀 컬럼 (생년월일·나이 미포함) */
const EMPLOYEE_EXCEL_HEADERS = [
  "상위부서",
  "부서",
  "사번",
  "성명",
  "직위",
  "직책",
  "직군",
  "성별",
  "직위년차",
  "그룹입사일자",
  "입사일자",
] as const;

const EMPLOYEE_EXCEL_SAMPLE: Record<string, string | number> = {
  상위부서: "경영지원본부",
  부서: "인사총무팀",
  사번: "20260001",
  성명: "홍길동",
  직위: "대리",
  직책: "팀원",
  직군: "일반직",
  성별: "남자",
  직위년차: 1,
  그룹입사일자: "2020-03-02",
  입사일자: "2020-03-02",
};

export function EmployeeRosterPanel() {
  const list = useEmployees();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<EmployeeRosterRecord[] | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    if (!editing) setDraft(null);
  }, [editing]);

  const working = editing && draft ? draft : list.items;
  const deptOptions = useMemo(
    () => departmentsForDivision(form.division),
    [form.division],
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

  function setDivision(division: string) {
    const depts = departmentsForDivision(division);
    setForm((f) => ({
      ...f,
      division,
      department: depts.includes(f.department)
        ? f.department
        : (depts[0] ?? ""),
    }));
  }

  function addRow() {
    if (!form.name.trim() || !form.empNo.trim()) {
      window.alert("사번과 성명은 필수입니다.");
      return;
    }
    const item = toRecord(form, `emp-${Date.now()}`);
    if (editing) {
      setDraft((prev) => [...(prev ?? cloneItems(list.items)), item]);
    } else {
      list.upsert(item);
    }
    setForm(emptyForm());
  }

  function patchRow(id: string, next: Partial<EmployeeRosterRecord>) {
    setDraft((prev) => {
      const base = prev ?? cloneItems(list.items);
      return base.map((row) => {
        if (row.id !== id) return row;
        const merged = { ...row, ...next };
        if (next.division && next.division !== row.division) {
          const depts = departmentsForDivision(next.division);
          if (!depts.includes(merged.department)) {
            merged.department = depts[0] ?? "";
          }
        }
        return merged;
      });
    });
  }

  function removeRow(id: string, name: string) {
    if (!editing) {
      window.alert("수정 모드에서 삭제할 수 있습니다.");
      return;
    }
    if (!window.confirm(`"${name}" 행을 삭제할까요? (저장 시 반영)`)) return;
    setDraft((prev) =>
      (prev ?? cloneItems(list.items)).filter((r) => r.id !== id),
    );
  }

  async function upload(file?: File) {
    if (!file) return;
    const rows = await readExcelFile(file);
    const next: EmployeeRosterRecord[] = rows
      .map((row, i) => {
        const division =
          cellStr(row, "상위부서", "본부", "division") ||
          EMPLOYEE_DIVISIONS[1];
        const depts = departmentsForDivision(division);
        const department =
          cellStr(row, "부서", "팀", "department", "소속") ||
          depts[0] ||
          "";
        return {
          id: `emp-up-${Date.now()}-${i}`,
          division,
          department,
          empNo: cellStr(row, "사번", "empNo", "사원번호"),
          name: cellStr(row, "성명", "이름", "name"),
          title: cellStr(row, "직위", "title") || "사원",
          jobRole: cellStr(row, "직책", "jobRole") || "팀원",
          jobTrack: cellStr(row, "직군", "jobTrack") || "일반직",
          gender: cellStr(row, "성별", "gender") || "남자",
          titleYears: cellNum(row, "직위년차", "titleYears") || 1,
          groupHireDate: cellDate(
            row,
            "그룹입사일자",
            "그룹입사일",
            "groupHireDate",
          ),
          hireDate: cellDate(row, "입사일자", "입사일", "hireDate"),
        } satisfies EmployeeRosterRecord;
      })
      .filter((r) => r.name && r.empNo);
    if (!next.length) {
      window.alert("가져올 유효한 행이 없습니다. (사번·성명 필수)");
      return;
    }
    if (editing) {
      setDraft(next);
    } else {
      list.replaceAll(next);
    }
  }

  function exportExcel(asTemplate = false) {
    const headers = [...EMPLOYEE_EXCEL_HEADERS];
    const dataRows = working.map((e) => ({
      상위부서: e.division,
      부서: e.department,
      사번: e.empNo,
      성명: e.name,
      직위: e.title,
      직책: e.jobRole,
      직군: e.jobTrack,
      성별: e.gender,
      직위년차: e.titleYears,
      그룹입사일자: e.groupHireDate,
      입사일자: e.hireDate,
    }));

    const rows =
      asTemplate || dataRows.length === 0
        ? [EMPLOYEE_EXCEL_SAMPLE]
        : dataRows;

    downloadRowsAsExcel(
      rows,
      asTemplate || dataRows.length === 0
        ? "사원명부_양식.xlsx"
        : "사원명부.xlsx",
      "사원명부",
      headers,
    );
  }

  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-heading text-lg font-semibold text-dh-deep dark:text-dh-light">
            사원명부
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            임직원 기본 정보를 등록합니다. [양식 다운로드]로 헤더·예시가 있는
            엑셀을 받은 뒤 작성하고 업로드하세요. (생년월일·나이는 수집하지 않습니다)
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportExcel(true)}
            title="헤더 + 작성 예시 1행이 포함된 업로드용 양식"
          >
            <Download data-icon="inline-start" />
            양식 다운로드
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportExcel(false)}
          >
            <Download data-icon="inline-start" />
            엑셀 내보내기
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileRef.current?.click()}
          >
            <Upload data-icon="inline-start" />
            엑셀 업로드
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
          <Label>상위부서</Label>
          <select
            className={selectClass}
            value={form.division}
            onChange={(e) => setDivision(e.target.value)}
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
          <Label>사번</Label>
          <Input
            value={form.empNo}
            onChange={(e) => setForm((f) => ({ ...f, empNo: e.target.value }))}
            placeholder="수기 입력"
          />
        </div>
        <div className="grid gap-1">
          <Label>성명</Label>
          <Input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="수기 입력"
          />
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
          <Label>직책</Label>
          <select
            className={selectClass}
            value={form.jobRole}
            onChange={(e) =>
              setForm((f) => ({ ...f, jobRole: e.target.value }))
            }
          >
            {EMPLOYEE_JOB_ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
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
          <Label>직위년차</Label>
          <Input
            type="number"
            min={0}
            value={form.titleYears}
            onChange={(e) =>
              setForm((f) => ({ ...f, titleYears: e.target.value }))
            }
          />
        </div>
        <div className="grid gap-1">
          <Label>그룹입사일자</Label>
          <Input
            type="date"
            value={form.groupHireDate}
            onChange={(e) =>
              setForm((f) => ({ ...f, groupHireDate: e.target.value }))
            }
          />
        </div>
        <div className="grid gap-1">
          <Label>입사일자</Label>
          <Input
            type="date"
            value={form.hireDate}
            onChange={(e) =>
              setForm((f) => ({ ...f, hireDate: e.target.value }))
            }
          />
        </div>
        <div className="flex items-end sm:col-span-2 lg:col-span-1">
          <Button className="w-full" onClick={addRow}>
            <Plus data-icon="inline-start" />
            {editing ? "행 추가" : "추가"}
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="gw-data-table w-full min-w-[960px] text-sm">
          <thead>
            <tr className="bg-dh-deep text-white">
              <th className="px-2 py-2">상위부서</th>
              <th className="px-2 py-2">부서</th>
              <th className="px-2 py-2">사번</th>
              <th className="px-2 py-2">성명</th>
              <th className="px-2 py-2">직위</th>
              <th className="px-2 py-2">직책</th>
              <th className="px-2 py-2">직군</th>
              <th className="px-2 py-2">성별</th>
              <th className="px-2 py-2">직위년차</th>
              <th className="px-2 py-2">그룹입사</th>
              <th className="px-2 py-2">입사</th>
              <th className="px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {!list.hydrated ? (
              <tr>
                <td
                  colSpan={12}
                  className="px-3 py-8 text-center text-muted-foreground"
                >
                  불러오는 중…
                </td>
              </tr>
            ) : working.length === 0 ? (
              <tr>
                <td
                  colSpan={12}
                  className="px-3 py-8 text-center text-muted-foreground"
                >
                  등록된 사원이 없습니다. 추가하거나 엑셀을 업로드해 주세요.
                </td>
              </tr>
            ) : (
              working.map((e) => {
                const rowDepts = departmentsForDivision(e.division);
                return (
                  <tr key={e.id} className="border-t border-border">
                    <td className="px-1.5 py-1">
                      {editing ? (
                        <select
                          className={selectClass}
                          value={e.division}
                          onChange={(ev) =>
                            patchRow(e.id, { division: ev.target.value })
                          }
                        >
                          {EMPLOYEE_DIVISIONS.map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </select>
                      ) : (
                        e.division
                      )}
                    </td>
                    <td className="px-1.5 py-1">
                      {editing ? (
                        <select
                          className={selectClass}
                          value={e.department}
                          onChange={(ev) =>
                            patchRow(e.id, { department: ev.target.value })
                          }
                        >
                          {(rowDepts.includes(e.department)
                            ? rowDepts
                            : [...rowDepts, e.department]
                          ).map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </select>
                      ) : (
                        e.department
                      )}
                    </td>
                    <td className="px-1.5 py-1">
                      {editing ? (
                        <Input
                          className="h-8 min-w-[5rem] px-2 text-sm"
                          value={e.empNo}
                          onChange={(ev) =>
                            patchRow(e.id, { empNo: ev.target.value })
                          }
                        />
                      ) : (
                        e.empNo
                      )}
                    </td>
                    <td className="px-1.5 py-1 font-medium">
                      {editing ? (
                        <Input
                          className="h-8 min-w-[5rem] px-2 text-sm"
                          value={e.name}
                          onChange={(ev) =>
                            patchRow(e.id, { name: ev.target.value })
                          }
                        />
                      ) : (
                        e.name
                      )}
                    </td>
                    <td className="px-1.5 py-1">
                      {editing ? (
                        <select
                          className={selectClass}
                          value={e.title}
                          onChange={(ev) =>
                            patchRow(e.id, { title: ev.target.value })
                          }
                        >
                          {EMPLOYEE_TITLES.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      ) : (
                        e.title
                      )}
                    </td>
                    <td className="px-1.5 py-1">
                      {editing ? (
                        <select
                          className={selectClass}
                          value={e.jobRole}
                          onChange={(ev) =>
                            patchRow(e.id, { jobRole: ev.target.value })
                          }
                        >
                          {EMPLOYEE_JOB_ROLES.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      ) : (
                        e.jobRole
                      )}
                    </td>
                    <td className="px-1.5 py-1">
                      {editing ? (
                        <select
                          className={selectClass}
                          value={e.jobTrack}
                          onChange={(ev) =>
                            patchRow(e.id, { jobTrack: ev.target.value })
                          }
                        >
                          {EMPLOYEE_JOB_TRACKS.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      ) : (
                        e.jobTrack
                      )}
                    </td>
                    <td className="px-1.5 py-1">
                      {editing ? (
                        <select
                          className={selectClass}
                          value={e.gender}
                          onChange={(ev) =>
                            patchRow(e.id, { gender: ev.target.value })
                          }
                        >
                          {EMPLOYEE_GENDERS.map((g) => (
                            <option key={g} value={g}>
                              {g}
                            </option>
                          ))}
                        </select>
                      ) : (
                        e.gender
                      )}
                    </td>
                    <td className="px-1.5 py-1">
                      {editing ? (
                        <Input
                          type="number"
                          min={0}
                          className="h-8 min-w-[4rem] px-2 text-sm"
                          value={e.titleYears}
                          onChange={(ev) =>
                            patchRow(e.id, {
                              titleYears: Number(ev.target.value) || 0,
                            })
                          }
                        />
                      ) : (
                        e.titleYears
                      )}
                    </td>
                    <td className="px-1.5 py-1">
                      {editing ? (
                        <Input
                          type="date"
                          className="h-8 min-w-[8rem] px-1 text-sm"
                          value={e.groupHireDate}
                          onChange={(ev) =>
                            patchRow(e.id, {
                              groupHireDate: ev.target.value,
                            })
                          }
                        />
                      ) : (
                        e.groupHireDate
                      )}
                    </td>
                    <td className="px-1.5 py-1">
                      {editing ? (
                        <Input
                          type="date"
                          className="h-8 min-w-[8rem] px-1 text-sm"
                          value={e.hireDate}
                          onChange={(ev) =>
                            patchRow(e.id, { hireDate: ev.target.value })
                          }
                        />
                      ) : (
                        e.hireDate
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
                        onClick={() => removeRow(e.id, e.name)}
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
