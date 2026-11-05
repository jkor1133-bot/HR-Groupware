"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  Download,
  Info,
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
import { seedPromotionPoints } from "@/data/promotion-points-seed";
import {
  ORG_DIVISIONS,
  ORG_TEAMS,
  TEAM_DIVISION,
  TEAMS_BY_DIVISION,
} from "@/data/org";
import { useEmployees } from "@/hooks/use-employees";
import { useLocalList } from "@/hooks/use-local-list";
import {
  cellDate,
  cellNum,
  cellStr,
  downloadRowsAsExcel,
  readExcelFile,
} from "@/lib/excel";
import {
  PROMOTION_GRADES,
  PROMOTION_REQUIREMENTS,
  PROMOTION_ROLES,
  PROMOTION_TITLES,
  GRADE_POINTS,
  POINT_START_YEAR,
  careerCreditPoints,
  computeEffectivePoints,
  currentYearEligibility,
  isPromotionTitle,
  nextYearEligibility,
  normalizeGrade,
  normalizeHireAsYear,
  comparePromotionPointOrder,
  pointsForGrade,
  promotionYears,
  promotionYearsRecent,
  sortPromotionPointRecords,
} from "@/lib/promotion-rules";
import { seedPromotions } from "@/data/hr-records-seed";
import type {
  EmployeeRosterRecord,
  OrgDivision,
  OrgTeam,
  PromotionPointRecord,
} from "@/lib/types";
import { cn } from "@/lib/utils";

export type PromotionPointsViewMode = "recent" | "cumulative";

function emptyGrades(years: number[]): Record<string, string> {
  return Object.fromEntries(years.map((y) => [String(y), ""]));
}

function cloneItems(items: PromotionPointRecord[]) {
  return JSON.parse(JSON.stringify(items)) as PromotionPointRecord[];
}

function normalizeRecord(raw: PromotionPointRecord): PromotionPointRecord {
  const legacyHireAs =
    raw.hireAsYear == null && raw.name === "김재선" ? 2 : raw.hireAsYear;
  return {
    ...raw,
    hireAsYear: normalizeHireAsYear(legacyHireAs),
    titleYears: Number(raw.titleYears) || 0,
    grades: raw.grades ?? {},
    note: raw.note ?? "",
    jobRole: raw.jobRole || "팀원",
  };
}

/** 사원명부 → 승진포인트 추가 폼 값 */
function formFromEmployee(
  emp: EmployeeRosterRecord,
  prev: {
    division: OrgDivision;
    team: OrgTeam;
    name: string;
    jobRole: string;
    title: string;
    titleYears: string;
    hireDate: string;
    note: string;
  },
) {
  let division = prev.division;
  const dept = emp.department as OrgTeam;
  if (ORG_DIVISIONS.includes(emp.division as OrgDivision)) {
    division = emp.division as OrgDivision;
  } else if (ORG_TEAMS.includes(dept) && TEAM_DIVISION[dept]) {
    division = TEAM_DIVISION[dept];
  }

  const teamList = TEAMS_BY_DIVISION[division] ?? ORG_TEAMS;
  let team = prev.team;
  if (teamList.includes(dept)) {
    team = dept;
  } else if (ORG_TEAMS.includes(dept)) {
    division = TEAM_DIVISION[dept] ?? division;
    team = dept;
  }

  const hireDate = emp.hireDate || emp.groupHireDate || prev.hireDate;
  const title = emp.title?.trim() || prev.title;
  const jobRole = emp.jobRole?.trim() || prev.jobRole;

  const rec = emp as EmployeeRosterRecord & Record<string, unknown>;
  const rawYears = rec.titleYears;
  const altYears = rec["직위년차"];
  const pick =
    rawYears != null
      ? rawYears
      : altYears != null && String(altYears).trim() !== ""
        ? altYears
        : null;
  const yearsNum = pick == null ? NaN : Number(pick);
  const titleYears =
    Number.isFinite(yearsNum) && yearsNum >= 0
      ? String(Math.floor(yearsNum))
      : prev.titleYears;

  return {
    ...prev,
    name: emp.name,
    division,
    team,
    title,
    jobRole,
    hireDate,
    titleYears,
  };
}

function EligibilityBadge({
  label,
  detail,
  variant,
  minGradeNote,
}: {
  label: string;
  eligible: boolean;
  detail: string;
  variant: "current" | "next";
  minGradeNote?: string;
}) {
  const tone =
    label === "대상" || label === "가능" || label === "대상가능"
      ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
      : label === "조건부" || label === "미정" || label === "대기"
        ? "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
        : label === "해당없음"
          ? "border-border bg-muted text-muted-foreground"
          : "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200";

  return (
    <span
      title={[detail, minGradeNote].filter(Boolean).join("\n")}
      className={cn(
        "inline-flex max-w-[8.5rem] cursor-help flex-col rounded-md border px-1.5 py-1 text-left",
        tone,
      )}
    >
      <span className="text-[10px] font-medium opacity-70">
        {variant === "current" ? "당해" : "차기"}
      </span>
      <span className="text-xs font-semibold leading-tight">{label}</span>
      {variant === "current" && minGradeNote ? (
        <span className="mt-0.5 text-[9px] leading-tight opacity-90">
          {minGradeNote}
        </span>
      ) : null}
    </span>
  );
}

export function PromotionPointsPanel({
  mode = "recent",
}: {
  /** recent: 최근 5개년 표시 / cumulative: 2018~ 전체 표시 */
  mode?: PromotionPointsViewMode;
}) {
  const list = useLocalList("hr-dashboard-promotion-points-v4", () => {
    if (typeof window !== "undefined") {
      try {
        const legacy = window.localStorage.getItem(
          "hr-dashboard-promotion-points-v3",
        );
        if (legacy) {
          const parsed = JSON.parse(legacy) as PromotionPointRecord[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            const migrated = parsed.map(normalizeRecord);
            const hasKim = migrated.some((r) => r.name === "김재선");
            return hasKim
              ? migrated
              : [
                  ...migrated,
                  ...seedPromotionPoints().filter((r) => r.name === "김재선"),
                ];
          }
        }
      } catch {
        /* ignore */
      }
    }
    return seedPromotionPoints();
  });
  const promotions = useLocalList("hr-dashboard-promotions-v2", seedPromotions);
  const employees = useEmployees();
  const fileRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<PromotionPointRecord[] | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [form, setForm] = useState({
    division: "경영지원본부" as OrgDivision,
    team: "인사총무팀" as OrgTeam,
    name: "",
    jobRole: "팀원",
    title: "사원",
    titleYears: "1",
    hireAsYear: "1",
    hireDate: "",
    note: "",
  });
  /** 본부·팀·직책·직위·당해대상 헤더 필터 (복수 선택, 빈 배열=전체) */
  type RowFilterKey =
    | "division"
    | "team"
    | "jobRole"
    | "title"
    | "currentLabel";
  type RowFilters = Record<RowFilterKey, string[]>;
  const emptyRowFilters = (): RowFilters => ({
    division: [],
    team: [],
    jobRole: [],
    title: [],
    currentLabel: [],
  });
  const [filters, setFilters] = useState<RowFilters>(emptyRowFilters);
  const [openFilter, setOpenFilter] = useState<RowFilterKey | null>(null);
  const filterMenuRef = useRef<HTMLTableRowElement>(null);
  /** prerender에서 new Date() 고정 방지 — 마운트 후 당해 연도 확정 */
  const [currentYear, setCurrentYear] = useState<number | null>(null);

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  const isCumulative = mode === "cumulative";
  const allYears = useMemo(
    () => (currentYear == null ? [] : promotionYears(currentYear)),
    [currentYear],
  );
  const displayYears = useMemo(() => {
    if (currentYear == null) return [];
    return isCumulative
      ? promotionYears(currentYear)
      : promotionYearsRecent(5, currentYear);
  }, [isCumulative, currentYear]);
  const prevYear = currentYear == null ? null : currentYear - 1;

  useEffect(() => {
    if (!editing) setDraft(null);
  }, [editing]);

  const working = useMemo(() => {
    const source = editing && draft ? draft : list.items;
    return sortPromotionPointRecords(source.map(normalizeRecord));
  }, [editing, draft, list.items]);
  const teams = TEAMS_BY_DIVISION[form.division] ?? ORG_TEAMS;

  const promoDatesByName = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const p of promotions.items) {
      const key = p.employeeName.trim();
      if (!key) continue;
      (map[key] ??= []).push(p.effectiveDate);
    }
    return map;
  }, [promotions.items]);

  /** 심사 전 단계만 필터 — 「대상」은 승진심사 확정이라 제외 */
  const CURRENT_LABEL_ORDER = [
    "대상가능",
    "대기",
    "비대상",
    "해당없음",
  ] as const;

  function matchesMulti(selected: string[], value: string) {
    return selected.length === 0 || selected.includes(value);
  }

  function summarizeSelected(selected: string[]) {
    if (selected.length === 0) return null;
    if (selected.length === 1) return selected[0]!;
    return `${selected[0]} 외 ${selected.length - 1}`;
  }

  const rows = useMemo(() => {
    if (currentYear == null || allYears.length === 0) return [];
    return working
      .filter((item) => {
        if (!matchesMulti(filters.division, item.division)) return false;
        if (!matchesMulti(filters.team, item.team)) return false;
        if (!matchesMulti(filters.jobRole, item.jobRole)) return false;
        if (!matchesMulti(filters.title, item.title)) return false;
        return true;
      })
      .map((item) => {
        const points = computeEffectivePoints({
          title: item.title,
          grades: item.grades,
          years: allYears,
          promotionDates: promoDatesByName[item.name.trim()] ?? [],
          hireAsYear: item.hireAsYear,
        });
        const currentGrade = item.grades[String(currentYear)] ?? "";
        const currentYearPts = pointsForGrade(item.title, currentGrade);
        const pointsBeforeCurrent = Math.max(
          0,
          points.effective - currentYearPts,
        );
        const current = currentYearEligibility({
          title: item.title,
          titleYears: item.titleYears,
          pointsBeforeCurrentYear: pointsBeforeCurrent,
          prevYearGrade: item.grades[String(prevYear)] ?? "",
          currentYearGrade: currentGrade,
        });
        const next = nextYearEligibility({
          title: item.title,
          titleYears: item.titleYears,
          totalPoints: points.effective,
          currentYearGrade: currentGrade,
        });
        const req = isPromotionTitle(item.title)
          ? PROMOTION_REQUIREMENTS[item.title]
          : null;
        return { item, points, current, next, req };
      })
      .filter((row) => matchesMulti(filters.currentLabel, row.current.label))
      .sort((a, b) => comparePromotionPointOrder(a.item, b.item));
  }, [
    working,
    promoDatesByName,
    allYears,
    currentYear,
    prevYear,
    filters,
  ]);

  const hasRowFilters = Object.values(filters).some((v) => v.length > 0);

  const filterOptions = useMemo(() => {
    const divisionOpts = [...ORG_DIVISIONS];
    const teamOpts =
      filters.division.length > 0
        ? [
            ...new Set(
              filters.division.flatMap(
                (d) => TEAMS_BY_DIVISION[d as OrgDivision] ?? [],
              ),
            ),
          ]
        : [...ORG_TEAMS];
    return {
      division: divisionOpts,
      team: teamOpts,
      jobRole: [...PROMOTION_ROLES],
      title: [...PROMOTION_TITLES],
      currentLabel: [...CURRENT_LABEL_ORDER],
    };
  }, [filters.division]);

  useEffect(() => {
    if (!openFilter) return;
    function onDocClick(e: MouseEvent) {
      if (
        filterMenuRef.current &&
        !filterMenuRef.current.contains(e.target as Node)
      ) {
        setOpenFilter(null);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenFilter(null);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [openFilter]);

  function toggleFilterValue(key: RowFilterKey, value: string) {
    setFilters((prev) => {
      const cur = prev[key];
      const nextVals = cur.includes(value)
        ? cur.filter((v) => v !== value)
        : [...cur, value];
      const next: RowFilters = { ...prev, [key]: nextVals };
      if (key === "division") {
        const allowed = new Set(
          nextVals.flatMap(
            (d) => TEAMS_BY_DIVISION[d as OrgDivision] ?? ORG_TEAMS,
          ),
        );
        if (nextVals.length > 0) {
          next.team = prev.team.filter((t) => allowed.has(t as OrgTeam));
        }
      }
      return next;
    });
  }

  function clearFilterKey(key: RowFilterKey) {
    setFilters((prev) => ({ ...prev, [key]: [] }));
  }

  function clearRowFilters() {
    setFilters(emptyRowFilters());
    setOpenFilter(null);
  }

  function HeaderFilter({
    filterKey,
    label,
    sticky,
    className,
  }: {
    filterKey: RowFilterKey;
    label: string;
    sticky?: boolean;
    className?: string;
  }) {
    const selected = filters[filterKey];
    const active = selected.length > 0;
    const open = openFilter === filterKey;
    const options = filterOptions[filterKey];
    const summary = summarizeSelected(selected);
    return (
      <th
        className={cn(
          "relative px-2 py-2",
          sticky && "sticky left-0 z-20 bg-dh-deep",
          className,
        )}
      >
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-0.5 rounded px-1 py-0.5 hover:bg-white/15",
            active && "bg-dh-sea/80 font-semibold",
          )}
          aria-expanded={open}
          aria-haspopup="listbox"
          onClick={() =>
            setOpenFilter((prev) => (prev === filterKey ? null : filterKey))
          }
        >
          <span>{label}</span>
          {summary ? (
            <span className="max-w-[5.5rem] truncate text-[10px] opacity-90">
              · {summary}
            </span>
          ) : null}
          <ChevronDown className="size-3.5 shrink-0 opacity-80" />
        </button>
        {open ? (
          <div
            role="listbox"
            aria-multiselectable="true"
            className="absolute left-0 top-full z-30 mt-1 max-h-56 min-w-[10rem] overflow-y-auto rounded-md border border-border bg-card py-1 text-left text-xs text-foreground shadow-lg"
          >
            <button
              type="button"
              role="option"
              aria-selected={!active}
              className={cn(
                "block w-full px-3 py-1.5 text-left hover:bg-muted",
                !active && "bg-dh-sky/20 font-medium text-dh-deep",
              )}
              onClick={() => clearFilterKey(filterKey)}
            >
              전체
            </button>
            {options.map((opt) => {
              const checked = selected.includes(opt);
              return (
                <button
                  key={opt}
                  type="button"
                  role="option"
                  aria-selected={checked}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-muted",
                    checked && "bg-dh-sky/20 font-medium text-dh-deep",
                  )}
                  onClick={() => toggleFilterValue(filterKey, opt)}
                >
                  <span
                    className={cn(
                      "flex size-3.5 shrink-0 items-center justify-center rounded-sm border text-[9px]",
                      checked
                        ? "border-dh-sea bg-dh-sea text-white"
                        : "border-border bg-background",
                    )}
                    aria-hidden
                  >
                    {checked ? "✓" : ""}
                  </span>
                  {opt}
                </button>
              );
            })}
          </div>
        ) : null}
      </th>
    );
  }

  function startEdit() {
    setDraft(sortPromotionPointRecords(cloneItems(list.items)));
    setEditing(true);
  }

  function cancelEdit() {
    setDraft(null);
    setEditing(false);
  }

  function saveEdit() {
    if (!draft) return;
    list.replaceAll(sortPromotionPointRecords(draft.map(normalizeRecord)));
    setEditing(false);
    setDraft(null);
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 2000);
  }

  function addPerson() {
    if (!form.name.trim() || !form.hireDate) return;
    if (!editing) {
      window.alert("먼저 [수정]을 누른 뒤 추가·편집하고 [저장]하세요.");
      return;
    }
    const item: PromotionPointRecord = {
      id: `pp-${Date.now()}`,
      division: form.division,
      team: form.team,
      name: form.name.trim(),
      jobRole: form.jobRole,
      title: form.title,
      titleYears: Number(form.titleYears) || 0,
      hireDate: form.hireDate,
      hireAsYear: normalizeHireAsYear(Number(form.hireAsYear)),
      grades: emptyGrades(allYears),
      note: form.note.trim(),
    };
    setDraft((prev) =>
      sortPromotionPointRecords([
        ...(prev ?? cloneItems(list.items)).map(normalizeRecord),
        item,
      ]),
    );
    setForm({
      ...form,
      name: "",
      titleYears: "1",
      hireAsYear: "1",
      hireDate: "",
      note: "",
    });
  }

  function patch(id: string, next: Partial<PromotionPointRecord>) {
    if (!editing) return;
    setDraft((prev) => {
      const base = prev ?? cloneItems(list.items);
      const updated = base.map((row) =>
        row.id === id ? { ...row, ...next } : row,
      );
      const touchesOrder =
        next.jobRole != null || next.title != null || next.titleYears != null;
      return touchesOrder
        ? sortPromotionPointRecords(updated.map(normalizeRecord))
        : updated;
    });
  }

  function setGrade(id: string, year: number, grade: string) {
    if (!editing) return;
    setDraft((prev) => {
      const base = prev ?? cloneItems(list.items);
      return base.map((row) =>
        row.id === id
          ? { ...row, grades: { ...row.grades, [String(year)]: grade } }
          : row,
      );
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
    if (!editing) {
      window.alert("먼저 [수정]을 누른 뒤 업로드하고 [저장]하세요.");
      return;
    }
    const excelRows = await readExcelFile(file);
    const next: PromotionPointRecord[] = excelRows
      .map((row, i) => {
        const grades = emptyGrades(allYears);
        for (const y of allYears) {
          const g = cellStr(row, `${y}`, `${y}등급`, String(y));
          grades[String(y)] = normalizeGrade(g);
        }
        return {
          id: `pp-up-${Date.now()}-${i}`,
          division: cellStr(row, "본부", "division") || "경영지원본부",
          team: cellStr(row, "팀", "team") || "인사총무팀",
          name: cellStr(row, "성명", "이름", "name"),
          jobRole: cellStr(row, "직책", "jobRole") || "팀원",
          title: cellStr(row, "직위", "title") || "사원",
          titleYears: cellNum(row, "직위년차", "titleYears") || 0,
          hireDate: cellDate(row, "입사일자", "입사일", "hireDate"),
          hireAsYear: normalizeHireAsYear(
            cellNum(row, "입사인정년차", "인정년차", "hireAsYear") || 1,
          ),
          grades,
          note: cellStr(row, "비고", "note"),
        };
      })
      .filter((r) => r.name)
      .map(normalizeRecord);
    if (next.length) setDraft(sortPromotionPointRecords(next));
  }

  function exportExcel() {
    downloadRowsAsExcel(
      rows.map(({ item, points, current, next }) => {
        const base: Record<string, string | number> = {
          본부: item.division,
          팀: item.team,
          성명: item.name,
          직책: item.jobRole,
          직위: item.title,
          직위년차: item.titleYears,
          입사일자: item.hireDate,
          입사인정년차: item.hireAsYear,
          경력인정포인트: points.careerCredit,
          재직포인트: points.servicePoints,
        };
        for (const y of displayYears) {
          base[`${y}`] = item.grades[String(y)] ?? "";
          base[`${y}포인트`] = pointsForGrade(
            item.title,
            item.grades[String(y)],
          );
        }
        base["합계포인트"] = points.gross;
        if (!isCumulative) {
          base["차감포인트"] = points.deducted;
          base["유효포인트"] = points.effective;
          base["최근승진연도"] = points.lastPromotionYear ?? "";
          base["차감상세"] = points.deductDetail;
          base["당해승진대상"] = current.label;
          base["당해상세"] = current.detail;
          base["당해최소등급"] = current.minGradeThisYear ?? "";
          base["당해등급안내"] = current.minGradeNote ?? "";
          base["차기가능"] = next.label;
          base["차기상세"] = next.detail;
        }
        base["비고"] = item.note;
        return base;
      }),
      isCumulative ? "승진포인트누적현황.xlsx" : "승진포인트현황.xlsx",
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="font-heading text-lg font-semibold text-dh-deep dark:text-dh-light">
              {isCumulative ? "승진포인트 누적 현황" : "승진포인트 현황"}
            </h2>
              <p className="mt-1 text-xs text-muted-foreground">
              등급 점수: S 100 · A 80 · B 60 · C 40 · D 20. 경력직은 「입사
              인정 년차」로 기존 (년차−1)×B(60)점을 경력인정합니다.{" "}
              {isCumulative ? (
                <>
                  <span className="font-medium text-foreground">
                    {POINT_START_YEAR}년~
                    {currentYear ?? "…"}년
                  </span>{" "}
                  연도별 등급·포인트만 확인합니다. (대상 판정은 「승진포인트
                  현황」 탭)
                </>
              ) : (
                <>
                  표에는{" "}
                  <span className="font-medium text-foreground">
                    최근 5개년(
                    {displayYears[0] ?? "…"}~{currentYear ?? "…"})
                  </span>
                  만 표시합니다. 2018년 이후 전체 등급은 「누적 현황」에서
                  확인하세요.
                </>
              )}
            </p>
            {editing ? (
              <p className="mt-1 text-xs font-medium text-dh-real">
                수정 모드 — 편집 후 [저장]을 눌러 반영하세요.
              </p>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">
                [수정]을 누르면 표 내용을 편집할 수 있습니다.
              </p>
            )}
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

        <div className="mb-4 rounded-lg border border-dh-sea/20 bg-dh-sea/5 px-3 py-2.5 text-xs text-muted-foreground">
          <p className="mb-1 flex items-center gap-1.5 font-medium text-dh-deep dark:text-dh-light">
            <Info className="size-3.5 text-dh-sea" />
            승진 요건 요약
          </p>
          <ul className="grid gap-1 sm:grid-cols-2">
            {(
              [
                ["사원→대리", "240점 (참고 년차 4년)"],
                ["대리→과장", "260점 (참고 년차 4년)"],
                ["과장→차장", "380점 (참고 년차 6년)"],
                ["차장→부장", "400점 (참고 년차 6년)"],
              ] as const
            ).map(([a, b]) => (
              <li key={a}>
                <span className="font-medium text-foreground">{a}</span>
                {" · "}
                {b}
              </li>
            ))}
          </ul>
          <p className="mt-1.5">
            등급 포인트: S {GRADE_POINTS.S} / A {GRADE_POINTS.A} / B{" "}
            {GRADE_POINTS.B} / C {GRADE_POINTS.C} / D {GRADE_POINTS.D}.{" "}
            <span className="font-medium text-foreground">
              승진대상 선정은 포인트 충족이 우선
            </span>
            이며, 년차는 참고입니다.
          </p>
        </div>

        <div className="mb-4 grid gap-2 @md/app:grid-cols-3 @4xl/app:grid-cols-8">
          <div className="grid gap-1">
            <Label>본부</Label>
            <select
              className="h-8 rounded-md border border-border bg-background px-2 text-sm disabled:opacity-60"
              value={form.division}
              disabled={!editing}
              onChange={(e) => {
                const division = e.target.value as OrgDivision;
                const teamList = TEAMS_BY_DIVISION[division] ?? ORG_TEAMS;
                setForm({
                  ...form,
                  division,
                  team: teamList[0] ?? form.team,
                });
              }}
            >
              {ORG_DIVISIONS.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </div>
          <div className="grid gap-1">
            <Label>팀</Label>
            <select
              className="h-8 rounded-md border border-border bg-background px-2 text-sm disabled:opacity-60"
              value={form.team}
              disabled={!editing}
              onChange={(e) =>
                setForm({ ...form, team: e.target.value as OrgTeam })
              }
            >
              {teams.map((t) => (
                <option key={t}>{t}</option>
              ))}
              {teams.includes(form.team) ? null : (
                <option value={form.team}>{form.team}</option>
              )}
            </select>
          </div>
          <div className="grid gap-1">
            <Label>성명 (사원명부)</Label>
            <EmployeePicker
              value={form.name}
              disabled={!editing}
              placeholder="사원 선택"
              onChange={(name, emp) => {
                setForm((prev) => {
                  if (!emp) return { ...prev, name };
                  // 사원명부 최신 직위년차 등 반영
                  const latest =
                    employees.items.find((e) => e.id === emp.id) ??
                    employees.items.find(
                      (e) => e.name.trim() === emp.name.trim(),
                    ) ??
                    emp;
                  return formFromEmployee(latest, prev);
                });
              }}
            />
          </div>
          <div className="grid gap-1">
            <Label>직책</Label>
            <select
              className="h-8 rounded-md border border-border bg-background px-2 text-sm disabled:opacity-60"
              value={form.jobRole}
              disabled={!editing}
              onChange={(e) => setForm({ ...form, jobRole: e.target.value })}
            >
              {PROMOTION_ROLES.map((r) => (
                <option key={r}>{r}</option>
              ))}
              {(PROMOTION_ROLES as readonly string[]).includes(form.jobRole)
                ? null
                : form.jobRole
                  ? <option value={form.jobRole}>{form.jobRole}</option>
                  : null}
            </select>
          </div>
          <div className="grid gap-1">
            <Label>직위</Label>
            <select
              className="h-8 rounded-md border border-border bg-background px-2 text-sm disabled:opacity-60"
              value={form.title}
              disabled={!editing}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            >
              {PROMOTION_TITLES.map((t) => (
                <option key={t}>{t}</option>
              ))}
              {(PROMOTION_TITLES as readonly string[]).includes(form.title)
                ? null
                : form.title
                  ? <option value={form.title}>{form.title}</option>
                  : null}
            </select>
          </div>
          <div className="grid gap-1">
            <Label>직위년차</Label>
            <Input
              key={`title-years-${form.name}-${form.titleYears}`}
              type="number"
              min={0}
              value={form.titleYears}
              disabled={!editing}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  titleYears: e.target.value,
                }))
              }
            />
          </div>
          <div className="grid gap-1">
            <Label>입사일자</Label>
            <Input
              type="date"
              value={form.hireDate}
              disabled={!editing}
              onChange={(e) =>
                setForm({ ...form, hireDate: e.target.value })
              }
            />
          </div>
          <div className="grid gap-1">
            <Label title="2=2년차 입사 → 경력인정 60점">입사 인정 년차</Label>
            <Input
              type="number"
              min={1}
              max={40}
              value={form.hireAsYear}
              disabled={!editing}
              onChange={(e) =>
                setForm({ ...form, hireAsYear: e.target.value })
              }
            />
            <p className="text-[10px] text-muted-foreground">
              예: 2 → +{careerCreditPoints(2)}점
            </p>
          </div>
          <div className="flex items-end">
            <Button
              className="w-full"
              onClick={addPerson}
              disabled={!editing}
            >
              <Plus data-icon="inline-start" />
              행 추가
            </Button>
          </div>
        </div>

        {hasRowFilters ? (
          <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-dh-sea/30 bg-dh-sky/10 px-3 py-2 text-xs">
            <span className="font-medium text-dh-deep dark:text-dh-light">
              필터
            </span>
            {filters.division.length > 0 ? (
              <span className="rounded-md border border-border bg-card px-2 py-0.5">
                본부: {filters.division.join(", ")}
              </span>
            ) : null}
            {filters.team.length > 0 ? (
              <span className="rounded-md border border-border bg-card px-2 py-0.5">
                팀: {filters.team.join(", ")}
              </span>
            ) : null}
            {filters.jobRole.length > 0 ? (
              <span className="rounded-md border border-border bg-card px-2 py-0.5">
                직책: {filters.jobRole.join(", ")}
              </span>
            ) : null}
            {filters.title.length > 0 ? (
              <span className="rounded-md border border-border bg-card px-2 py-0.5">
                직위: {filters.title.join(", ")}
              </span>
            ) : null}
            {filters.currentLabel.length > 0 ? (
              <span className="rounded-md border border-border bg-card px-2 py-0.5">
                당해대상: {filters.currentLabel.join(", ")}
              </span>
            ) : null}
            <span className="text-muted-foreground">{rows.length}명</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 px-2"
              onClick={clearRowFilters}
            >
              전체 보기
            </Button>
          </div>
        ) : (
          <p className="mb-2 text-[11px] text-muted-foreground">
            표 헤더의 본부·팀·직책·직위
            {!isCumulative ? "·당해대상" : ""}을 눌러 복수 선택할 수 있습니다.
          </p>
        )}

        <div className="overflow-x-auto rounded-lg border border-border">
          <table
            className={cn(
              "gw-data-table w-full text-sm",
              isCumulative ? "min-w-[1240px]" : "min-w-[980px]",
            )}
          >
            <thead>
              <tr ref={filterMenuRef} className="bg-dh-deep text-white">
                <HeaderFilter filterKey="division" label="본부" sticky />
                <HeaderFilter filterKey="team" label="팀" />
                <th className="px-2 py-2">성명</th>
                <HeaderFilter filterKey="jobRole" label="직책" />
                <HeaderFilter filterKey="title" label="직위" />
                <th className="px-2 py-2">년차</th>
                <th className="px-2 py-2">입사일</th>
                <th
                  className="px-2 py-2 text-center"
                  title="경력직 입사 시 인정 년차 (2=2년차 입사)"
                >
                  인정
                  <br />
                  년차
                </th>
                <th
                  className="px-2 py-2 text-center"
                  title="(인정년차−1)×B(60)"
                >
                  경력
                  <br />
                  인정
                </th>
                {displayYears.map((y) => (
                  <th
                    key={y}
                    className={cn(
                      "px-1.5 py-2 text-center text-xs",
                      currentYear != null &&
                        y === currentYear &&
                        "bg-dh-sea",
                    )}
                  >
                    {y}
                  </th>
                ))}
                {isCumulative ? (
                  <th className="px-2 py-2 text-center">합계</th>
                ) : (
                  <>
                    <th className="px-2 py-2 text-center">유효</th>
                    <HeaderFilter
                      filterKey="currentLabel"
                      label="당해대상"
                      className="text-center"
                    />
                    <th className="px-2 py-2 text-center">차기가능</th>
                  </>
                )}
                <th className="px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {currentYear == null ? (
                <tr>
                  <td
                    colSpan={
                      10 + displayYears.length + (isCumulative ? 1 : 3)
                    }
                    className="px-3 py-10 text-center text-muted-foreground"
                  >
                    불러오는 중…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={
                      10 + displayYears.length + (isCumulative ? 1 : 3)
                    }
                    className="px-3 py-10 text-center text-muted-foreground"
                  >
                    {hasRowFilters
                      ? "선택한 조건에 맞는 인원이 없습니다. 「전체 보기」로 필터를 해제하세요."
                      : "등록된 인원이 없습니다."}
                  </td>
                </tr>
              ) : (
                rows.map(({ item, points, current, next, req }) => (
                  <tr
                    key={item.id}
                    className="border-t border-border odd:bg-muted/20"
                  >
                    <td className="sticky left-0 z-10 bg-card px-2 py-1.5 text-xs">
                      {editing ? (
                        <select
                          className="h-7 max-w-[7rem] rounded border border-border bg-background px-1 text-xs"
                          value={item.division}
                          onChange={(e) => {
                            const division = e.target.value as OrgDivision;
                            const teamList =
                              TEAMS_BY_DIVISION[division] ?? ORG_TEAMS;
                            patch(item.id, {
                              division,
                              team: teamList.includes(item.team as OrgTeam)
                                ? item.team
                                : (teamList[0] ?? item.team),
                            });
                          }}
                        >
                          {ORG_DIVISIONS.map((d) => (
                            <option key={d}>{d}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-xs">{item.division}</span>
                      )}
                    </td>
                    <td className="px-2 py-1.5">
                      {editing ? (
                        <select
                          className="h-7 max-w-[6.5rem] rounded border border-border bg-background px-1 text-xs"
                          value={item.team}
                          onChange={(e) =>
                            patch(item.id, { team: e.target.value })
                          }
                        >
                          {(
                            TEAMS_BY_DIVISION[item.division as OrgDivision] ??
                            ORG_TEAMS
                          ).map((t) => (
                            <option key={t}>{t}</option>
                          ))}
                        </select>
                      ) : (
                        item.team
                      )}
                    </td>
                    <td className="px-2 py-1.5">
                      {editing ? (
                        <Input
                          className="h-7 min-w-[4.5rem] px-1.5 text-xs"
                          value={item.name}
                          onChange={(e) =>
                            patch(item.id, { name: e.target.value })
                          }
                        />
                      ) : (
                        <span className="font-medium">{item.name}</span>
                      )}
                    </td>
                    <td className="px-2 py-1.5">
                      {editing ? (
                        <select
                          className="h-7 rounded border border-border bg-background px-1 text-xs"
                          value={item.jobRole}
                          onChange={(e) =>
                            patch(item.id, { jobRole: e.target.value })
                          }
                        >
                          {PROMOTION_ROLES.map((r) => (
                            <option key={r}>{r}</option>
                          ))}
                        </select>
                      ) : (
                        item.jobRole
                      )}
                    </td>
                    <td className="px-2 py-1.5">
                      {editing ? (
                        <select
                          className="h-7 rounded border border-border bg-background px-1 text-xs"
                          value={item.title}
                          onChange={(e) =>
                            patch(item.id, { title: e.target.value })
                          }
                        >
                          {PROMOTION_TITLES.map((t) => (
                            <option key={t}>{t}</option>
                          ))}
                        </select>
                      ) : (
                        item.title
                      )}
                    </td>
                    <td className="px-2 py-1.5">
                      {editing ? (
                        <Input
                          type="number"
                          min={0}
                          className="h-7 w-14 px-1.5 text-xs"
                          value={item.titleYears}
                          onChange={(e) =>
                            patch(item.id, {
                              titleYears: Number(e.target.value) || 0,
                            })
                          }
                        />
                      ) : (
                        item.titleYears
                      )}
                    </td>
                    <td className="px-2 py-1.5">
                      {editing ? (
                        <Input
                          type="date"
                          className="h-7 min-w-[8.5rem] px-1 text-xs"
                          value={item.hireDate}
                          onChange={(e) =>
                            patch(item.id, { hireDate: e.target.value })
                          }
                        />
                      ) : (
                        item.hireDate
                      )}
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      {editing ? (
                        <Input
                          type="number"
                          min={1}
                          max={40}
                          className="mx-auto h-7 w-14 px-1 text-center text-xs"
                          value={item.hireAsYear}
                          title="입사 인정 년차"
                          onChange={(e) =>
                            patch(item.id, {
                              hireAsYear: normalizeHireAsYear(
                                Number(e.target.value),
                              ),
                            })
                          }
                        />
                      ) : (
                        <span className="tabular-nums">{item.hireAsYear}</span>
                      )}
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <span
                        className={cn(
                          "tabular-nums text-sm font-medium",
                          points.careerCredit > 0
                            ? "text-dh-real"
                            : "text-muted-foreground",
                        )}
                        title={
                          points.careerCredit > 0
                            ? `인정 ${item.hireAsYear - 1}년 × B(60)`
                            : "신입(인정 1년차) — 경력인정 없음"
                        }
                      >
                        {points.careerCredit > 0
                          ? `+${points.careerCredit}`
                          : "—"}
                      </span>
                    </td>
                    {displayYears.map((y) => {
                      const g = item.grades[String(y)] ?? "";
                      const pts = pointsForGrade(item.title, g);
                      return (
                        <td key={y} className="px-1 py-1.5 text-center">
                          {editing ? (
                            <select
                              className={cn(
                                "h-7 w-[3.25rem] rounded border border-border bg-background text-center text-[11px]",
                                (g === "C" || g === "D") &&
                                  "border-rose-300 text-rose-700",
                                currentYear != null &&
                                  y === currentYear &&
                                  "ring-1 ring-dh-sea/50",
                              )}
                              value={g}
                              onChange={(e) =>
                                setGrade(item.id, y, e.target.value)
                              }
                              title={g ? `${pts}점` : ""}
                            >
                              <option value="">-</option>
                              {PROMOTION_GRADES.map((gr) => (
                                <option key={gr} value={gr}>
                                  {gr}
                                </option>
                              ))}
                            </select>
                          ) : g ? (
                            <span
                              className={cn(
                                "inline-flex flex-col items-center text-xs leading-tight",
                                (g === "C" || g === "D") && "text-rose-700",
                              )}
                              title={`${pts}점`}
                            >
                              <span className="font-medium">{g}</span>
                              {isCumulative ? (
                                <span className="text-[10px] text-muted-foreground">
                                  {pts}
                                </span>
                              ) : null}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              -
                            </span>
                          )}
                        </td>
                      );
                    })}
                    {isCumulative ? (
                      <td className="px-2 py-1.5 text-center">
                        <span className="text-sm font-semibold text-dh-real">
                          {points.gross}
                        </span>
                        {points.careerCredit > 0 ? (
                          <div className="text-[10px] leading-tight text-muted-foreground">
                            재직 {points.servicePoints}
                            <br />+인정 {points.careerCredit}
                          </div>
                        ) : null}
                      </td>
                    ) : (
                      <>
                        <td className="px-2 py-1.5 text-center">
                          <div
                            className="text-sm font-semibold text-dh-real"
                            title={points.deductDetail}
                          >
                            {points.effective}
                          </div>
                          {req?.nextTitle ? (
                            <div className="text-[10px] text-muted-foreground">
                              /{req.points}
                            </div>
                          ) : null}
                          {points.careerCredit > 0 &&
                          points.lastPromotionYear == null ? (
                            <div className="mt-0.5 text-[10px] leading-tight text-muted-foreground">
                              재직 {points.servicePoints}+인정{" "}
                              {points.careerCredit}
                            </div>
                          ) : null}
                          {points.deducted > 0 ? (
                            <div
                              className="mt-0.5 text-[10px] leading-tight text-amber-700 dark:text-amber-300"
                              title={points.deductDetail}
                            >
                              총{points.gross}
                              <br />
                              차감 -{points.deducted}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-2 py-1.5 text-center">
                          <EligibilityBadge
                            variant="current"
                            label={current.label}
                            eligible={current.eligible}
                            detail={current.detail}
                            minGradeNote={current.minGradeNote}
                          />
                        </td>
                        <td className="px-2 py-1.5 text-center">
                          <EligibilityBadge
                            variant="next"
                            label={next.label}
                            eligible={next.eligible}
                            detail={next.detail}
                          />
                        </td>
                      </>
                    )}
                    <td className="px-2 py-1.5">
                      <button
                        type="button"
                        className="rounded p-1 hover:text-dh-red disabled:opacity-40"
                        disabled={!editing}
                        onClick={() => removeRow(item.id, item.name)}
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
        {!isCumulative ? (
          <p className="mt-2 text-[11px] text-muted-foreground">
            승진대상은 포인트 충족이 우선입니다(년차 미달이어도 포인트가 되면
            대상). 당해대상 배지에 「당해 B 이상」처럼 최소 필요 등급이
            표시되며, 마우스를 올리면 상세 사유를 볼 수 있습니다.
          </p>
        ) : (
          <p className="mt-2 text-[11px] text-muted-foreground">
            연도별 칸은 등급과 점수이며, 합계는 재직 중 포인트(
            {POINT_START_YEAR}년~{currentYear ?? "…"}년) + 경력인정입니다.
            경력인정 = (입사 인정 년차 − 1) × B(60).
          </p>
        )}
      </section>
    </div>
  );
}
