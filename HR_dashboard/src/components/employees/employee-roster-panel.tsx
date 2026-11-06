"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  ClipboardPaste,
  Download,
  Pencil,
  Plus,
  Save,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useEmployees } from "@/hooks/use-employees";
import {
  EMPLOYEE_DEPARTMENTS,
  EMPLOYEE_DIVISIONS,
  EMPLOYEE_GENDERS,
  EMPLOYEE_JOB_ROLES,
  EMPLOYEE_JOB_TRACKS,
  EMPLOYEE_PARTS,
  EMPLOYEE_TITLES,
  NO_DEPARTMENT_LABEL,
  departmentsForDivision,
  formatDepartment,
  normalizeDepartment,
} from "@/lib/employee-roster";
import {
  cellDate,
  cellNum,
  cellStr,
  cellTitleYears,
  downloadRowsAsExcel,
  parsePastedTable,
  readExcelFile,
} from "@/lib/excel";
import type { EmployeeRosterRecord } from "@/lib/types";

const EMPLOYEE_EXCEL_HEADERS_BASE = [
  "상위부서",
  "부서",
  "파트",
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

type FormState = {
  division: string;
  department: string;
  part: string;
  empNo: string;
  name: string;
  title: string;
  jobRole: string;
  jobTrack: string;
  gender: string;
  titleYears: string;
  salary: string;
  contractSalary: string;
  groupHireDate: string;
  hireDate: string;
};

function parseSalaryInput(raw: string): number {
  const n = Number(String(raw).replace(/[,₩원\s]/g, ""));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

function formatSalaryDisplay(n: number) {
  if (!n || n <= 0) return "—";
  return n.toLocaleString("ko-KR");
}

type FilterKey =
  | "division"
  | "department"
  | "title"
  | "jobRole"
  | "jobTrack"
  | "gender";

type FiltersState = Record<FilterKey, string[]>;

const EMPTY_FILTERS: FiltersState = {
  division: [],
  department: [],
  title: [],
  jobRole: [],
  jobTrack: [],
  gender: [],
};

function emptyForm(): FormState {
  return {
    division: EMPLOYEE_DIVISIONS[1],
    department: departmentsForDivision(EMPLOYEE_DIVISIONS[1])[0] ?? "",
    part: "",
    empNo: "",
    name: "",
    title: "사원",
    jobRole: "팀원",
    jobTrack: "일반직",
    gender: "남자",
    titleYears: "1",
    salary: "",
    contractSalary: "",
    groupHireDate: "",
    hireDate: "",
  };
}

function cloneItems(items: EmployeeRosterRecord[]) {
  return JSON.parse(JSON.stringify(items)) as EmployeeRosterRecord[];
}

function toRecord(
  form: FormState,
  id: string,
  options?: { includeSalary?: boolean },
): EmployeeRosterRecord {
  return {
    id,
    division: form.division,
    department: normalizeDepartment(form.department),
    part: form.part.trim(),
    empNo: form.empNo.trim(),
    name: form.name.trim(),
    title: form.title,
    jobRole: form.jobRole,
    jobTrack: form.jobTrack,
    gender: form.gender,
    titleYears: Number(form.titleYears) || 0,
    salary: options?.includeSalary ? parseSalaryInput(form.salary) : 0,
    contractSalary: options?.includeSalary
      ? parseSalaryInput(form.contractSalary)
      : 0,
    groupHireDate: form.groupHireDate,
    hireDate: form.hireDate,
  };
}

const selectClass =
  "h-8 w-full rounded-md border border-border bg-background px-2 text-sm disabled:opacity-60";

function excelHeaders(includeSalary: boolean): string[] {
  if (!includeSalary) return [...EMPLOYEE_EXCEL_HEADERS_BASE];
  const headers: string[] = [...EMPLOYEE_EXCEL_HEADERS_BASE];
  const idx = headers.indexOf("직위년차");
  headers.splice(idx + 1, 0, "연봉(전년)", "계약연봉(당년)");
  return headers;
}

function excelSample(includeSalary: boolean): Record<string, string | number> {
  const base: Record<string, string | number> = {
    상위부서: "국제물류사업본부",
    부서: "곡물사업팀",
    파트: "곡물관리파트",
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
  if (includeSalary) {
    base["연봉(전년)"] = 54000000;
    base["계약연봉(당년)"] = 55000000;
  }
  return base;
}

function findExistingSalaries(
  items: EmployeeRosterRecord[],
  empNo: string,
  name: string,
): { salary: number; contractSalary: number } {
  const byNo = empNo
    ? items.find((e) => e.empNo.trim() === empNo.trim())
    : undefined;
  const hit =
    byNo ??
    (name
      ? items.find((e) => e.name.trim() === name.trim())
      : undefined);
  return {
    salary: hit?.salary || 0,
    contractSalary: hit?.contractSalary || 0,
  };
}

const FILTERABLE: {
  key: FilterKey;
  label: string;
  options: readonly string[];
}[] = [
  { key: "division", label: "상위부서", options: EMPLOYEE_DIVISIONS },
  {
    key: "department",
    label: "부서",
    options: [...EMPLOYEE_DEPARTMENTS, NO_DEPARTMENT_LABEL],
  },
  { key: "title", label: "직위", options: EMPLOYEE_TITLES },
  { key: "jobRole", label: "직책", options: EMPLOYEE_JOB_ROLES },
  { key: "jobTrack", label: "직군", options: EMPLOYEE_JOB_TRACKS },
  { key: "gender", label: "성별", options: EMPLOYEE_GENDERS },
];

function ColumnFilter({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: readonly string[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const active = selected.length > 0;

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  function toggle(value: string) {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  }

  return (
    <div ref={rootRef} className="relative inline-block text-left">
      <button
        type="button"
        className={cn(
          "inline-flex items-center gap-1 px-1 font-semibold hover:underline",
          active && "text-amber-200",
        )}
        onClick={() => setOpen((v) => !v)}
        title={`${label} 필터 (여러 개 선택 가능)`}
      >
        {label}
        {active ? (
          <span className="rounded bg-white/20 px-1 text-[10px] font-medium">
            {selected.length}
          </span>
        ) : null}
        <ChevronDown className="size-3.5 opacity-80" />
      </button>
      {open ? (
        <div className="absolute left-0 top-full z-30 mt-1 max-h-56 min-w-[9.5rem] overflow-y-auto rounded-md border border-border bg-card p-1.5 text-foreground shadow-lg">
          <div className="mb-1 flex items-center justify-between gap-2 border-b border-border px-1 pb-1">
            <span className="text-[11px] text-muted-foreground">다중 선택</span>
            <button
              type="button"
              className="text-[11px] text-dh-real hover:underline"
              onClick={() => onChange([])}
            >
              전체
            </button>
          </div>
          {options.map((opt) => (
            <label
              key={opt}
              className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-xs hover:bg-muted"
            >
              <input
                type="checkbox"
                className="size-3.5 accent-dh-real"
                checked={selected.includes(opt)}
                onChange={() => toggle(opt)}
              />
              <span>{opt}</span>
            </label>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function EmployeeRosterPanel() {
  const list = useEmployees();
  const { isAdmin } = useCurrentUser();
  const canViewSalary = isAdmin;
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<EmployeeRosterRecord[] | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [filters, setFilters] = useState<FiltersState>(EMPTY_FILTERS);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");

  useEffect(() => {
    if (!editing) setDraft(null);
  }, [editing]);

  const working = editing && draft ? draft : list.items;
  const deptOptions = useMemo(
    () => departmentsForDivision(form.division),
    [form.division],
  );

  const filterOptions = useMemo(() => {
    const extras: FiltersState = {
      division: [],
      department: [],
      title: [],
      jobRole: [],
      jobTrack: [],
      gender: [],
    };
    for (const row of working) {
      for (const { key, options } of FILTERABLE) {
        const v = String(row[key] ?? "").trim();
        if (v && !(options as readonly string[]).includes(v) && !extras[key].includes(v)) {
          extras[key].push(v);
        }
      }
    }
    return Object.fromEntries(
      FILTERABLE.map(({ key, options }) => [
        key,
        [...options, ...extras[key].sort((a, b) => a.localeCompare(b, "ko"))],
      ]),
    ) as Record<FilterKey, string[]>;
  }, [working]);

  const displayed = useMemo(() => {
    return working.filter((row) =>
      FILTERABLE.every(({ key }) => {
        const selected = filters[key];
        if (!selected.length) return true;
        if (key === "department") {
          const dept = normalizeDepartment(row.department);
          const label = dept || NO_DEPARTMENT_LABEL;
          return selected.includes(label) || selected.includes(dept);
        }
        return selected.includes(String(row[key] ?? ""));
      }),
    );
  }, [working, filters]);

  const hasActiveFilters = FILTERABLE.some(({ key }) => filters[key].length > 0);

  function setFilter(key: FilterKey, next: string[]) {
    setFilters((prev) => ({ ...prev, [key]: next }));
  }

  function startEdit() {
    setDraft(
      cloneItems(list.items).map((r) => ({
        ...r,
        department: normalizeDepartment(r.department),
      })),
    );
    setEditing(true);
  }

  function cancelEdit() {
    setDraft(null);
    setEditing(false);
  }

  function saveEdit() {
    if (!draft) return;
    list.replaceAll(
      draft.map((r) => ({
        ...r,
        department: normalizeDepartment(r.department),
      })),
    );
    setEditing(false);
    setDraft(null);
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 2000);
  }

  function setDivision(division: string) {
    const depts = departmentsForDivision(division);
    setForm((f) => {
      const cur = normalizeDepartment(f.department);
      return {
        ...f,
        division,
        department:
          cur === "" || depts.includes(cur) ? cur : (depts[0] ?? ""),
      };
    });
  }

  function addRow() {
    if (!form.name.trim() || !form.empNo.trim()) {
      window.alert("사번과 성명은 필수입니다.");
      return;
    }
    const item = toRecord(form, `emp-${Date.now()}`, {
      includeSalary: canViewSalary,
    });
    if (editing) {
      setDraft((prev) => [...(prev ?? cloneItems(list.items)), item]);
    } else {
      list.upsert(item);
    }
    setForm(emptyForm());
  }

  function patchRow(id: string, next: Partial<EmployeeRosterRecord>) {
    const patch = { ...next };
    if (!canViewSalary) {
      delete patch.salary;
      delete patch.contractSalary;
    }
    setDraft((prev) => {
      const base = prev ?? cloneItems(list.items);
      return base.map((row) => {
        if (row.id !== id) return row;
        const merged = { ...row, ...patch };
        if (patch.department != null) {
          merged.department = normalizeDepartment(patch.department);
        }
        if (patch.division && patch.division !== row.division) {
          const depts = departmentsForDivision(patch.division);
          const cur = normalizeDepartment(merged.department);
          if (cur !== "" && !depts.includes(cur)) {
            merged.department = depts[0] ?? "";
          } else {
            merged.department = cur;
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

  function mapRowsToEmployees(
    rows: Record<string, unknown>[],
    idPrefix: string,
  ): EmployeeRosterRecord[] {
    const source = editing && draft ? draft : list.items;
    return rows
      .map((row, i) => {
        const division =
          cellStr(row, "상위부서", "본부", "division") ||
          EMPLOYEE_DIVISIONS[1];
        const rawDept = cellStr(row, "부서", "팀", "department", "소속");
        const department = normalizeDepartment(rawDept);
        const empNo = cellStr(row, "사번", "empNo", "사원번호");
        const name = cellStr(row, "성명", "이름", "name");
        const importedPrev = Math.max(
          0,
          Math.floor(
            cellNum(row, "연봉(전년)", "연봉", "연봉(원)", "salary"),
          ),
        );
        const importedContract = Math.max(
          0,
          Math.floor(
            cellNum(
              row,
              "계약연봉(당년)",
              "계약연봉",
              "당년연봉",
              "contractSalary",
            ),
          ),
        );
        const kept = findExistingSalaries(source, empNo, name);
        return {
          id: `${idPrefix}-${Date.now()}-${i}`,
          division,
          department,
          part: cellStr(row, "파트", "part", "세부파트"),
          empNo,
          name,
          title: cellStr(row, "직위", "title") || "사원",
          jobRole: cellStr(row, "직책", "jobRole") || "팀원",
          jobTrack: cellStr(row, "직군", "jobTrack") || "일반직",
          gender: cellStr(row, "성별", "gender") || "남자",
          titleYears: cellTitleYears(row, 1),
          salary: canViewSalary ? importedPrev : kept.salary,
          contractSalary: canViewSalary
            ? importedContract
            : kept.contractSalary,
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
  }

  function applyImported(next: EmployeeRosterRecord[], mode: "replace" | "append") {
    if (!next.length) {
      window.alert("가져올 유효한 행이 없습니다. (사번·성명 필수 · 첫 줄은 헤더)");
      return false;
    }
    if (mode === "append") {
      if (editing) {
        setDraft((prev) => [...(prev ?? cloneItems(list.items)), ...next]);
      } else {
        list.replaceAll([...list.items, ...next]);
      }
    } else if (editing) {
      setDraft(next);
    } else {
      list.replaceAll(next);
    }
    return true;
  }

  async function upload(file?: File) {
    if (!file) return;
    const rows = await readExcelFile(file);
    applyImported(mapRowsToEmployees(rows, "emp-up"), "replace");
  }

  function applyPaste(mode: "replace" | "append") {
    const rows = parsePastedTable(pasteText);
    if (!rows.length) {
      window.alert(
        "붙여넣은 내용이 비어 있거나 형식이 맞지 않습니다.\n엑셀에서 헤더 포함 범위를 복사한 뒤 붙여넣으세요.",
      );
      return;
    }
    const next = mapRowsToEmployees(rows, "emp-paste");
    const ok = applyImported(next, mode);
    if (ok) {
      setPasteText("");
      setPasteOpen(false);
      window.alert(
        mode === "append"
          ? `${next.length}명을 기존 목록에 추가했습니다.`
          : `${next.length}명으로 목록을 교체했습니다.`,
      );
    }
  }

  async function pasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        window.alert("클립보드가 비어 있습니다. 엑셀에서 먼저 복사하세요.");
        return;
      }
      setPasteText(text);
      setPasteOpen(true);
    } catch {
      setPasteOpen(true);
      window.alert(
        "클립보드 읽기가 차단되었습니다. 아래 칸에 Ctrl+V로 직접 붙여넣으세요.",
      );
    }
  }

  function exportExcel(asTemplate = false) {
    const headers = excelHeaders(canViewSalary);
    const dataRows = displayed.map((e) => {
      const row: Record<string, string | number> = {
        상위부서: e.division,
        부서: normalizeDepartment(e.department),
        파트: e.part,
        사번: e.empNo,
        성명: e.name,
        직위: e.title,
        직책: e.jobRole,
        직군: e.jobTrack,
        성별: e.gender,
        직위년차: e.titleYears,
        그룹입사일자: e.groupHireDate,
        입사일자: e.hireDate,
      };
      if (canViewSalary) {
        row["연봉(전년)"] = e.salary || "";
        row["계약연봉(당년)"] = e.contractSalary || "";
      }
      return row;
    });

    const rows =
      asTemplate || dataRows.length === 0
        ? [excelSample(canViewSalary)]
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
            임직원 기본 정보를 등록합니다. 표 헤더(상위부서·부서·직위·직책·직군·성별)는
            여러 값을 골라 필터할 수 있습니다.
            {canViewSalary
              ? " 연봉(전년)·계약연봉(당년)은 관리자만 열람·수정할 수 있습니다."
              : " 연봉 정보는 관리자만 확인할 수 있어 이 화면에는 표시되지 않습니다."}
          </p>
          {hasActiveFilters ? (
            <p className="mt-1 text-xs font-medium text-dh-real">
              필터 적용 중 · 표시 {displayed.length}명 / 전체 {working.length}명{" "}
              <button
                type="button"
                className="underline"
                onClick={() => setFilters(EMPTY_FILTERS)}
              >
                필터 초기화
              </button>
            </p>
          ) : null}
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setPasteOpen(true);
              void pasteFromClipboard();
            }}
            title="엑셀에서 복사한 표를 붙여넣어 등록"
          >
            <ClipboardPaste data-icon="inline-start" />
            붙여넣기 입력
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

      {pasteOpen ? (
        <div className="mb-4 rounded-lg border border-border bg-muted/30 p-3 sm:p-4">
          <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-foreground">
                엑셀 복사 → 붙여넣기
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                엑셀에서 헤더(상위부서, 부서, 파트, 사번, 성명 …) 포함 범위를
                복사한 뒤 아래에 Ctrl+V 하세요. 파일 업로드가 막혀도 됩니다.
                {canViewSalary
                  ? " 연봉(전년)·계약연봉(당년) 열은 관리자만 반영됩니다."
                  : " 연봉 정보는 관리자만 입력·확인할 수 있어 붙여넣기에 포함되지 않습니다."}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setPasteOpen(false);
                setPasteText("");
              }}
            >
              <X data-icon="inline-start" />
              닫기
            </Button>
          </div>
          <Textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder={
              canViewSalary
                ? "상위부서\t부서\t파트\t사번\t성명\t직위\t직책\t직군\t성별\t직위년차\t연봉(전년)\t계약연봉(당년)\t그룹입사일자\t입사일자\n경영지원본부\t인사총무팀\t\t20260001\t홍길동\t대리\t팀원\t일반직\t남자\t1\t54000000\t55000000\t2020-03-02\t2020-03-02"
                : "상위부서\t부서\t파트\t사번\t성명\t직위\t직책\t직군\t성별\t직위년차\t그룹입사일자\t입사일자\n경영지원본부\t인사총무팀\t\t20260001\t홍길동\t대리\t팀원\t일반직\t남자\t1\t2020-03-02\t2020-03-02"
            }
            className="min-h-[9rem] font-mono text-xs"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <Button size="sm" onClick={() => applyPaste("replace")}>
              붙여넣기로 전체 교체
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => applyPaste("append")}
            >
              기존에 추가
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void pasteFromClipboard()}
            >
              클립보드에서 다시 읽기
            </Button>
          </div>
        </div>
      ) : null}

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
            value={normalizeDepartment(form.department)}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                department: normalizeDepartment(e.target.value),
              }))
            }
          >
            <option value="">{NO_DEPARTMENT_LABEL}</option>
            {deptOptions.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1">
          <Label>파트</Label>
          <select
            className={selectClass}
            value={form.part}
            onChange={(e) => setForm((f) => ({ ...f, part: e.target.value }))}
          >
            <option value="">선택 안 함</option>
            {EMPLOYEE_PARTS.map((p) => (
              <option key={p} value={p}>
                {p}
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
        {canViewSalary ? (
          <>
            <div className="grid gap-1">
              <Label>연봉(전년) · 관리자</Label>
              <Input
                type="text"
                inputMode="numeric"
                value={form.salary}
                onChange={(e) =>
                  setForm((f) => ({ ...f, salary: e.target.value }))
                }
                placeholder="예: 54000000"
              />
            </div>
            <div className="grid gap-1">
              <Label>계약연봉(당년) · 관리자</Label>
              <Input
                type="text"
                inputMode="numeric"
                value={form.contractSalary}
                onChange={(e) =>
                  setForm((f) => ({ ...f, contractSalary: e.target.value }))
                }
                placeholder="예: 55000000"
              />
            </div>
          </>
        ) : null}
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
        <table
          className={cn(
            "gw-data-table w-full text-sm",
            canViewSalary ? "min-w-[1320px]" : "min-w-[1080px]",
          )}
        >
          <thead>
            <tr className="bg-dh-deep text-white">
              {FILTERABLE.slice(0, 2).map(({ key, label }) => (
                <th key={key} className="px-1 py-2">
                  <ColumnFilter
                    label={label}
                    options={filterOptions[key]}
                    selected={filters[key]}
                    onChange={(next) => setFilter(key, next)}
                  />
                </th>
              ))}
              <th className="px-2 py-2">파트</th>
              <th className="px-2 py-2">사번</th>
              <th className="px-2 py-2">성명</th>
              {FILTERABLE.slice(2).map(({ key, label }) => (
                <th key={key} className="px-1 py-2">
                  <ColumnFilter
                    label={label}
                    options={filterOptions[key]}
                    selected={filters[key]}
                    onChange={(next) => setFilter(key, next)}
                  />
                </th>
              ))}
              <th className="px-2 py-2">직위년차</th>
              {canViewSalary ? (
                <>
                  <th className="px-2 py-2">연봉(전년)</th>
                  <th className="px-2 py-2">계약연봉(당년)</th>
                </>
              ) : null}
              <th className="px-2 py-2">그룹입사</th>
              <th className="px-2 py-2">입사</th>
              <th className="px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {!list.hydrated ? (
              <tr>
                <td
                  colSpan={canViewSalary ? 15 : 13}
                  className="px-3 py-8 text-center text-muted-foreground"
                >
                  불러오는 중…
                </td>
              </tr>
            ) : displayed.length === 0 ? (
              <tr>
                <td
                  colSpan={canViewSalary ? 15 : 13}
                  className="px-3 py-8 text-center text-muted-foreground"
                >
                  {working.length === 0
                    ? "등록된 사원이 없습니다. 추가하거나 엑셀을 업로드해 주세요."
                    : "선택한 필터에 맞는 사원이 없습니다. 필터를 바꿔 보세요."}
                </td>
              </tr>
            ) : (
              displayed.map((e) => {
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
                          value={normalizeDepartment(e.department)}
                          onChange={(ev) =>
                            patchRow(e.id, { department: ev.target.value })
                          }
                        >
                          <option value="">{NO_DEPARTMENT_LABEL}</option>
                          {(rowDepts.includes(normalizeDepartment(e.department))
                            ? rowDepts
                            : [
                                ...rowDepts,
                                ...(normalizeDepartment(e.department)
                                  ? [normalizeDepartment(e.department)]
                                  : []),
                              ]
                          ).map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </select>
                      ) : (
                        formatDepartment(e.department)
                      )}
                    </td>
                    <td className="px-1.5 py-1">
                      {editing ? (
                        <select
                          className={selectClass}
                          value={e.part ?? ""}
                          onChange={(ev) =>
                            patchRow(e.id, { part: ev.target.value })
                          }
                        >
                          <option value="">선택 안 함</option>
                          {EMPLOYEE_PARTS.map((p) => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ))}
                          {e.part &&
                          !(EMPLOYEE_PARTS as readonly string[]).includes(
                            e.part,
                          ) ? (
                            <option value={e.part}>{e.part}</option>
                          ) : null}
                        </select>
                      ) : (
                        e.part || "—"
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
                    {canViewSalary ? (
                      <>
                        <td className="px-1.5 py-1 tabular-nums">
                          {editing ? (
                            <Input
                              type="text"
                              inputMode="numeric"
                              className="h-8 min-w-[7rem] px-2 text-sm"
                              value={e.salary ? String(e.salary) : ""}
                              placeholder="원"
                              onChange={(ev) =>
                                patchRow(e.id, {
                                  salary: parseSalaryInput(ev.target.value),
                                })
                              }
                            />
                          ) : (
                            formatSalaryDisplay(e.salary)
                          )}
                        </td>
                        <td className="px-1.5 py-1 tabular-nums">
                          {editing ? (
                            <Input
                              type="text"
                              inputMode="numeric"
                              className="h-8 min-w-[7rem] px-2 text-sm"
                              value={
                                e.contractSalary
                                  ? String(e.contractSalary)
                                  : ""
                              }
                              placeholder="원"
                              onChange={(ev) =>
                                patchRow(e.id, {
                                  contractSalary: parseSalaryInput(
                                    ev.target.value,
                                  ),
                                })
                              }
                            />
                          ) : (
                            formatSalaryDisplay(e.contractSalary)
                          )}
                        </td>
                      </>
                    ) : null}
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
