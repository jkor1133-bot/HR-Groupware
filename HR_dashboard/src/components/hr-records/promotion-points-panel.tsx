"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Download,
  Info,
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
import { seedPromotionPoints } from "@/data/promotion-points-seed";
import { ORG_DIVISIONS, ORG_TEAMS, TEAMS_BY_DIVISION } from "@/data/org";
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
  computeEffectivePoints,
  currentYearEligibility,
  isPromotionTitle,
  nextYearEligibility,
  normalizeGrade,
  pointsForGrade,
  promotionYears,
  promotionYearsRecent,
} from "@/lib/promotion-rules";
import { seedPromotions } from "@/data/hr-records-seed";
import type {
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
  const list = useLocalList(
    "hr-dashboard-promotion-points-v3",
    seedPromotionPoints,
  );
  const promotions = useLocalList("hr-dashboard-promotions-v2", seedPromotions);
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
    hireDate: "",
    note: "",
  });
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

  const working = editing && draft ? draft : list.items;
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

  const rows = useMemo(() => {
    if (currentYear == null || allYears.length === 0) return [];
    return working.map((item) => {
      const points = computeEffectivePoints({
        title: item.title,
        grades: item.grades,
        years: allYears,
        promotionDates: promoDatesByName[item.name.trim()] ?? [],
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
    });
  }, [working, promoDatesByName, allYears, currentYear, prevYear]);

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
      grades: emptyGrades(allYears),
      note: form.note.trim(),
    };
    setDraft((prev) => [...(prev ?? cloneItems(list.items)), item]);
    setForm({
      ...form,
      name: "",
      titleYears: "1",
      hireDate: "",
      note: "",
    });
  }

  function patch(id: string, next: Partial<PromotionPointRecord>) {
    if (!editing) return;
    setDraft((prev) => {
      const base = prev ?? cloneItems(list.items);
      return base.map((row) => (row.id === id ? { ...row, ...next } : row));
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
          grades,
          note: cellStr(row, "비고", "note"),
        };
      })
      .filter((r) => r.name);
    if (next.length) setDraft(next);
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
              등급 점수: S 100 · A 80 · B 60 · C 40 · D 20.{" "}
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
            </select>
          </div>
          <div className="grid gap-1">
            <Label>성명</Label>
            <Input
              value={form.name}
              disabled={!editing}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
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
            </select>
          </div>
          <div className="grid gap-1">
            <Label>직위년차</Label>
            <Input
              type="number"
              min={0}
              value={form.titleYears}
              disabled={!editing}
              onChange={(e) =>
                setForm({ ...form, titleYears: e.target.value })
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

        <div className="overflow-x-auto rounded-lg border border-border">
          <table
            className={cn(
              "gw-data-table w-full text-sm",
              isCumulative ? "min-w-[1100px]" : "min-w-[860px]",
            )}
          >
            <thead>
              <tr className="bg-dh-deep text-white">
                <th className="sticky left-0 z-10 bg-dh-deep px-2 py-2">본부</th>
                <th className="px-2 py-2">팀</th>
                <th className="px-2 py-2">성명</th>
                <th className="px-2 py-2">직책</th>
                <th className="px-2 py-2">직위</th>
                <th className="px-2 py-2">년차</th>
                <th className="px-2 py-2">입사일</th>
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
                    <th className="px-2 py-2 text-center">당해대상</th>
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
                      8 + displayYears.length + (isCumulative ? 1 : 3)
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
                      8 + displayYears.length + (isCumulative ? 1 : 3)
                    }
                    className="px-3 py-10 text-center text-muted-foreground"
                  >
                    등록된 인원이 없습니다.
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
            연도별 칸은 등급과 점수이며, 합계는 {POINT_START_YEAR}년~
            {currentYear ?? "…"}년 포인트 총합입니다.
          </p>
        )}
      </section>
    </div>
  );
}
