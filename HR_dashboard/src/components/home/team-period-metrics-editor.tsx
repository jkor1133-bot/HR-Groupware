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
import {
  ORG_TEAMS,
  WORK_HOUR_DETAIL_KEYS,
  WORK_HOUR_DETAIL_LABELS,
  partsForTeam,
} from "@/data/org";
import {
  cellNum,
  cellStr,
  downloadRowsAsExcel,
  parsePastedTable,
  readExcelFile,
} from "@/lib/excel";
import { currentYearMonth } from "@/lib/period";
import {
  emptyWorkHourDetails,
  sumWorkHourDetails,
  withHourTotals,
} from "@/lib/team-period-metrics";
import type {
  OrgTeam,
  TeamPeriodMetric,
  WorkHourDetailKey,
  WorkHourDetails,
} from "@/lib/types";
import { cn } from "@/lib/utils";

type ListApi = {
  items: TeamPeriodMetric[];
  replaceAll: (next: TeamPeriodMetric[]) => void;
};

type Props = {
  title: string;
  description?: string;
  list: ListApi;
  excelFileName: string;
  valueKind: "won" | "hours";
  focusMonth?: string;
  allowedTeams?: readonly OrgTeam[];
};

type HourForm = Record<WorkHourDetailKey, { plan: string; actual: string }>;
/** 붙여넣기·업로드 시 반영할 쪽 */
type PasteSide = "plan" | "actual" | "both";

function cloneItems(items: TeamPeriodMetric[]) {
  return JSON.parse(JSON.stringify(items)) as TeamPeriodMetric[];
}

function formatValue(n: number) {
  return Math.round(n).toLocaleString("ko-KR");
}

function metricKey(r: {
  yearMonth: string;
  team: string;
  part?: string;
}) {
  return `${r.yearMonth}|${r.team}|${(r.part ?? "").trim()}`;
}

function normalizeYearMonth(raw: string): string {
  const s = raw.trim();
  if (!s) return "";
  const iso = s.match(/^(\d{4})[-/.](\d{1,2})/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, "0")}`;
  const compact = s.match(/^(\d{4})(\d{2})$/);
  if (compact) return `${compact[1]}-${compact[2]}`;
  return s.slice(0, 7);
}

function emptyHourForm(): HourForm {
  return {
    overtime: { plan: "", actual: "" },
    night: { plan: "", actual: "" },
    holiday: { plan: "", actual: "" },
    holidayOt: { plan: "", actual: "" },
  };
}

function hourFormToDetails(form: HourForm): WorkHourDetails {
  const d = emptyWorkHourDetails();
  for (const key of WORK_HOUR_DETAIL_KEYS) {
    d[key] = {
      plan: Number(form[key].plan) || 0,
      actual: Number(form[key].actual) || 0,
    };
  }
  return d;
}

function pickHourSlice(
  row: Record<string, unknown>,
  side: PasteSide,
  planKeys: string[],
  actualKeys: string[],
  shortKeys: string[],
): { plan: number; actual: number } {
  if (side === "plan") {
    return {
      plan: cellNum(row, ...planKeys, ...shortKeys),
      actual: 0,
    };
  }
  if (side === "actual") {
    return {
      plan: 0,
      actual: cellNum(row, ...actualKeys, ...shortKeys),
    };
  }
  return {
    plan: cellNum(row, ...planKeys, ...shortKeys),
    actual: cellNum(row, ...actualKeys),
  };
}

function detailsFromRow(
  row: Record<string, unknown>,
  side: PasteSide,
): WorkHourDetails {
  const d = emptyWorkHourDetails();
  d.overtime = pickHourSlice(
    row,
    side,
    ["연장계획", "연장시간계획", "overtimePlan"],
    ["연장실적", "연장시간실적", "overtimeActual"],
    ["연장", "연장시간"],
  );
  d.night = pickHourSlice(
    row,
    side,
    ["야간계획", "야간시간계획", "nightPlan"],
    ["야간실적", "야간시간실적", "nightActual"],
    ["야간", "야간시간"],
  );
  d.holiday = pickHourSlice(
    row,
    side,
    ["휴일계획", "휴일시간계획", "holidayPlan"],
    ["휴일실적", "휴일시간실적", "holidayActual"],
    ["휴일", "휴일시간"],
  );
  d.holidayOt = pickHourSlice(
    row,
    side,
    ["휴일연장계획", "휴일연장시간계획", "holidayOtPlan"],
    ["휴일연장실적", "휴일연장시간실적", "holidayOtActual"],
    ["휴일연장", "휴일연장시간"],
  );
  const summed = sumWorkHourDetails(d);
  if (summed.plan === 0 && summed.actual === 0) {
    if (side === "plan") {
      const plan = cellNum(row, "계획", "금액", "값", "plan");
      if (plan) d.overtime = { plan, actual: 0 };
    } else if (side === "actual") {
      const actual = cellNum(row, "실적", "금액", "값", "actual");
      if (actual) d.overtime = { plan: 0, actual };
    } else {
      const plan = cellNum(row, "계획", "plan");
      const actual = cellNum(row, "실적", "actual");
      if (plan || actual) d.overtime = { plan, actual };
    }
  }
  return d;
}

function laborAmounts(
  row: Record<string, unknown>,
  side: PasteSide,
): { plan: number; actual: number } {
  if (side === "plan") {
    return {
      plan: cellNum(row, "계획", "금액", "값", "plan", "amount"),
      actual: 0,
    };
  }
  if (side === "actual") {
    return {
      plan: 0,
      actual: cellNum(row, "실적", "금액", "값", "actual", "amount"),
    };
  }
  return {
    plan: cellNum(row, "계획", "plan"),
    actual: cellNum(row, "실적", "actual"),
  };
}

function addHourDetails(
  a?: WorkHourDetails | null,
  b?: WorkHourDetails | null,
): WorkHourDetails {
  const x = a ?? emptyWorkHourDetails();
  const y = b ?? emptyWorkHourDetails();
  const d = emptyWorkHourDetails();
  for (const key of WORK_HOUR_DETAIL_KEYS) {
    d[key] = {
      plan: (Number(x[key]?.plan) || 0) + (Number(y[key]?.plan) || 0),
      actual: (Number(x[key]?.actual) || 0) + (Number(y[key]?.actual) || 0),
    };
  }
  return d;
}

/** 같은 연월·팀·파트 여러 행(개인별 등) → 합산 */
function aggregateMetricsByKey(
  items: TeamPeriodMetric[],
  valueKind: "won" | "hours",
): TeamPeriodMetric[] {
  const map = new Map<string, TeamPeriodMetric>();
  for (const item of items) {
    const key = metricKey(item);
    const prev = map.get(key);
    if (!prev) {
      map.set(key, { ...item });
      continue;
    }
    if (valueKind === "hours") {
      const hourDetails = addHourDetails(prev.hourDetails, item.hourDetails);
      map.set(
        key,
        withHourTotals({
          ...prev,
          hourDetails,
        }),
      );
    } else {
      map.set(key, {
        ...prev,
        plan: (Number(prev.plan) || 0) + (Number(item.plan) || 0),
        actual: (Number(prev.actual) || 0) + (Number(item.actual) || 0),
      });
    }
  }
  return [...map.values()];
}

function rowsToMetrics(
  rows: Record<string, unknown>[],
  opts: {
    allowedTeams?: readonly OrgTeam[];
    fallbackTeam: OrgTeam;
    idPrefix: string;
    valueKind: "won" | "hours";
    side: PasteSide;
  },
): TeamPeriodMetric[] {
  const next: TeamPeriodMetric[] = [];
  rows.forEach((row, i) => {
    const teamRaw = cellStr(row, "팀", "team") as OrgTeam;
    const team = ORG_TEAMS.includes(teamRaw) ? teamRaw : opts.fallbackTeam;
    if (opts.allowedTeams?.length && !opts.allowedTeams.includes(team)) return;
    const yearMonth = normalizeYearMonth(
      cellStr(row, "연월", "yearMonth", "년월", "월"),
    );
    if (yearMonth.length !== 7) return;
    const partRaw = cellStr(row, "파트", "part", "사업소");
    const allowedParts = partsForTeam(team);
    // 목록에 없는 파트명도 그대로 유지(합산 키 보존)
    const part =
      allowedParts.length === 0
        ? partRaw
        : allowedParts.includes(partRaw)
          ? partRaw
          : partRaw || (allowedParts[0] ?? "");

    if (opts.valueKind === "hours") {
      const hourDetails = detailsFromRow(row, opts.side);
      const totals = sumWorkHourDetails(hourDetails);
      next.push({
        id: `${opts.idPrefix}-${Date.now()}-${i}`,
        yearMonth,
        team,
        part,
        plan: totals.plan,
        actual: totals.actual,
        hourDetails,
      });
      return;
    }

    const amounts = laborAmounts(row, opts.side);
    next.push({
      id: `${opts.idPrefix}-${Date.now()}-${i}`,
      yearMonth,
      team,
      part,
      plan: amounts.plan,
      actual: amounts.actual,
    });
  });
  return aggregateMetricsByKey(next, opts.valueKind);
}

function mergeMetricsBySide(
  base: TeamPeriodMetric[],
  incoming: TeamPeriodMetric[],
  side: PasteSide,
  valueKind: "won" | "hours",
): TeamPeriodMetric[] {
  const map = new Map(base.map((r) => [metricKey(r), { ...r }]));
  for (const inc of incoming) {
    const key = metricKey(inc);
    const existing = map.get(key);
    if (!existing) {
      map.set(
        key,
        valueKind === "hours" ? withHourTotals(inc) : { ...inc },
      );
      continue;
    }
    if (valueKind === "hours") {
      const ex = existing.hourDetails ?? emptyWorkHourDetails();
      const inn = inc.hourDetails ?? emptyWorkHourDetails();
      const hourDetails = emptyWorkHourDetails();
      for (const k of WORK_HOUR_DETAIL_KEYS) {
        hourDetails[k] = {
          plan: side === "actual" ? ex[k].plan : inn[k].plan,
          actual: side === "plan" ? ex[k].actual : inn[k].actual,
        };
      }
      map.set(key, withHourTotals({ ...existing, hourDetails }));
    } else {
      map.set(key, {
        ...existing,
        plan: side === "actual" ? existing.plan : inc.plan,
        actual: side === "plan" ? existing.actual : inc.actual,
      });
    }
  }
  return [...map.values()];
}

export function TeamPeriodMetricsEditor({
  title,
  description,
  list,
  excelFileName,
  valueKind,
  focusMonth,
  allowedTeams,
}: Props) {
  const isHours = valueKind === "hours";
  const fileRef = useRef<HTMLInputElement>(null);
  const teamOptions = allowedTeams?.length ? [...allowedTeams] : [...ORG_TEAMS];
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<TeamPeriodMetric[] | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [pasteSide, setPasteSide] = useState<PasteSide>("plan");
  const [filterMonth, setFilterMonth] = useState(
    () => focusMonth || currentYearMonth(),
  );
  const [form, setForm] = useState({
    yearMonth: focusMonth || currentYearMonth(),
    team: teamOptions[0] ?? ("곡물사업팀" as OrgTeam),
    part: "",
    plan: "",
    actual: "",
    hours: emptyHourForm(),
  });

  useEffect(() => {
    if (focusMonth) {
      setFilterMonth(focusMonth);
      setForm((f) => ({ ...f, yearMonth: focusMonth }));
    }
  }, [focusMonth]);

  useEffect(() => {
    if (!editing) setDraft(null);
  }, [editing]);

  useEffect(() => {
    const options = allowedTeams?.length
      ? [...allowedTeams]
      : [...ORG_TEAMS];
    if (options.includes(form.team)) return;
    const team = options[0] ?? ("곡물사업팀" as OrgTeam);
    const parts = partsForTeam(team);
    setForm((f) => ({
      ...f,
      team,
      part: parts[0] ?? "",
    }));
  }, [allowedTeams, form.team]);

  const formParts = partsForTeam(form.team);
  const working = editing && draft ? draft : list.items;

  const months = useMemo(() => {
    const set = new Set(working.map((r) => r.yearMonth));
    if (filterMonth) set.add(filterMonth);
    return [...set].sort();
  }, [working, filterMonth]);

  const visible = useMemo(
    () =>
      working
        .filter((r) => r.yearMonth === filterMonth)
        .filter((r) =>
          allowedTeams?.length ? allowedTeams.includes(r.team) : true,
        )
        .sort(
          (a, b) =>
            a.team.localeCompare(b.team, "ko") ||
            (a.part ?? "").localeCompare(b.part ?? "", "ko"),
        ),
    [working, filterMonth, allowedTeams],
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
    const normalized = isHours ? draft.map(withHourTotals) : draft;
    list.replaceAll(normalized);
    setEditing(false);
    setDraft(null);
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 2000);
  }

  function patchRow(id: string, patch: Partial<TeamPeriodMetric>) {
    setDraft((prev) => {
      const base = prev ?? cloneItems(list.items);
      return base.map((r) => {
        if (r.id !== id) return r;
        const next = { ...r, ...patch };
        return isHours && next.hourDetails ? withHourTotals(next) : next;
      });
    });
  }

  function patchHourDetail(
    id: string,
    key: WorkHourDetailKey,
    field: "plan" | "actual",
    value: number,
  ) {
    setDraft((prev) => {
      const base = prev ?? cloneItems(list.items);
      return base.map((r) => {
        if (r.id !== id) return r;
        const hourDetails = {
          ...(r.hourDetails ?? emptyWorkHourDetails()),
          [key]: {
            ...(r.hourDetails?.[key] ?? { plan: 0, actual: 0 }),
            [field]: value,
          },
        };
        return withHourTotals({ ...r, hourDetails });
      });
    });
  }

  function removeRow(id: string) {
    if (!editing) {
      window.alert("먼저 [수정]을 누른 뒤 삭제하고 [저장]하세요.");
      return;
    }
    if (!window.confirm("이 행을 삭제할까요? (저장 시 반영)")) return;
    setDraft((prev) =>
      (prev ?? cloneItems(list.items)).filter((r) => r.id !== id),
    );
  }

  function addRow() {
    if (!editing) {
      window.alert("먼저 [수정]을 누른 뒤 행을 추가하고 [저장]하세요.");
      return;
    }
    const yearMonth = form.yearMonth.slice(0, 7);
    if (!yearMonth || yearMonth.length < 7) return;
    if (formParts.length && !form.part) {
      window.alert("이 팀은 파트를 선택해 주세요.");
      return;
    }
    const part = formParts.length ? form.part : form.part || "";

    let item: TeamPeriodMetric;
    if (isHours) {
      const hourDetails = hourFormToDetails(form.hours);
      const totals = sumWorkHourDetails(hourDetails);
      item = {
        id: `tpm-${Date.now()}`,
        yearMonth,
        team: form.team,
        part,
        plan: totals.plan,
        actual: totals.actual,
        hourDetails,
      };
    } else {
      item = {
        id: `tpm-${Date.now()}`,
        yearMonth,
        team: form.team,
        part,
        plan: Number(form.plan) || 0,
        actual: Number(form.actual) || 0,
      };
    }

    setDraft((prev) => {
      const base = prev ?? cloneItems(list.items);
      const key = metricKey(item);
      const idx = base.findIndex((r) => metricKey(r) === key);
      if (idx >= 0) {
        const next = [...base];
        next[idx] = { ...next[idx]!, ...item, id: next[idx]!.id };
        return next;
      }
      return [...base, item];
    });
    setFilterMonth(yearMonth);
    setForm((f) => ({
      ...f,
      plan: "",
      actual: "",
      hours: emptyHourForm(),
    }));
  }

  function applyMetricRows(
    rows: Record<string, unknown>[],
    idPrefix: string,
    side: PasteSide,
  ): number {
    const incoming = rowsToMetrics(rows, {
      allowedTeams,
      fallbackTeam: teamOptions[0] ?? ("곡물사업팀" as OrgTeam),
      idPrefix,
      valueKind,
      side,
    });
    if (!incoming.length) {
      window.alert(
        isHours
          ? side === "both"
            ? "연월·팀·파트와 연장/야간/휴일/휴일연장(계획·실적) 컬럼을 확인해 주세요."
            : `연월·팀·파트와 ${side === "plan" ? "계획" : "실적"} 시간 컬럼(연장·야간·휴일·휴일연장)을 확인해 주세요.`
          : side === "both"
            ? "연월·팀·파트·계획·실적 컬럼이 있는지 확인하세요."
            : `연월·팀·파트·${side === "plan" ? "계획" : "실적"} 컬럼이 있는지 확인하세요.`,
      );
      return 0;
    }
    const base = draft ?? cloneItems(list.items);
    const merged = mergeMetricsBySide(base, incoming, side, valueKind);
    setDraft(merged);
    setEditing(true);
    const first = incoming[0]?.yearMonth;
    if (first) setFilterMonth(first);
    // 1월 계획을 다시 넣으면 2~12월 복제가 다시 돌도록
    if (isHours) {
      try {
        window.localStorage.removeItem(
          "hr-dashboard-hours-propagate-2027-01-plan-v1",
        );
        window.localStorage.removeItem(
          "hr-dashboard-hours-propagate-2027-01-plan-v2",
        );
        window.localStorage.removeItem(
          "hr-dashboard-hours-propagate-2027-01-full-v3",
        );
      } catch {
        /* ignore */
      }
    }
    return incoming.length;
  }

  async function upload(file?: File) {
    if (!file) return;
    const n = applyMetricRows(
      await readExcelFile(file),
      "tpm-up",
      pasteSide,
    );
    if (n > 0) {
      const sideLabel =
        pasteSide === "plan"
          ? "계획"
          : pasteSide === "actual"
            ? "실적"
            : "계획·실적";
      window.alert(
        `${n}행 ${sideLabel}을(를) 반영했습니다. 확인 후 [저장]을 눌러 주세요.`,
      );
    }
  }

  function applyPaste() {
    const rows = parsePastedTable(pasteText);
    if (!rows.length) {
      window.alert(
        "붙여넣기 형식을 확인해 주세요.\n엑셀에서 헤더 포함 범위를 복사한 뒤 붙여넣으세요.",
      );
      return;
    }
    const n = applyMetricRows(rows, "tpm-paste", pasteSide);
    if (n > 0) {
      setPasteOpen(false);
      setPasteText("");
      const sideLabel =
        pasteSide === "plan"
          ? "계획"
          : pasteSide === "actual"
            ? "실적"
            : "계획·실적";
      window.alert(
        `${n}행 ${sideLabel}을(를) 반영했습니다. 같은 팀·파트는 기존 값과 합쳐집니다. 확인 후 [저장]을 눌러 주세요.`,
      );
    }
  }

  function exportExcel() {
    const filtered = working.filter((r) =>
      allowedTeams?.length ? allowedTeams.includes(r.team) : true,
    );
    if (isHours) {
      downloadRowsAsExcel(
        filtered.map((r) => {
          const d = r.hourDetails ?? emptyWorkHourDetails();
          return {
            연월: r.yearMonth,
            팀: r.team,
            파트: r.part ?? "",
            연장계획: d.overtime.plan,
            연장실적: d.overtime.actual,
            야간계획: d.night.plan,
            야간실적: d.night.actual,
            휴일계획: d.holiday.plan,
            휴일실적: d.holiday.actual,
            휴일연장계획: d.holidayOt.plan,
            휴일연장실적: d.holidayOt.actual,
            합계계획: r.plan,
            합계실적: r.actual,
          };
        }),
        excelFileName,
      );
      return;
    }
    downloadRowsAsExcel(
      filtered.map((r) => ({
        연월: r.yearMonth,
        팀: r.team,
        파트: r.part ?? "",
        계획: r.plan,
        실적: r.actual,
      })),
      excelFileName,
    );
  }

  const unitHint = isHours ? "시간" : "원";
  const pastePlaceholder = (() => {
    if (isHours) {
      if (pasteSide === "plan") {
        return "연월\t팀\t파트\t연장\t야간\t휴일\t휴일연장\n2026-01\t곡물사업팀\t하역파트\t120\t40\t16\t8";
      }
      if (pasteSide === "actual") {
        return "연월\t팀\t파트\t연장\t야간\t휴일\t휴일연장\n2026-01\t곡물사업팀\t하역파트\t110\t38\t12\t6";
      }
      return "연월\t팀\t파트\t연장계획\t연장실적\t야간계획\t야간실적\t휴일계획\t휴일실적\t휴일연장계획\t휴일연장실적";
    }
    if (pasteSide === "plan") {
      return "연월\t팀\t파트\t계획\n2026-01\t곡물사업팀\t하역파트\t10000000";
    }
    if (pasteSide === "actual") {
      return "연월\t팀\t파트\t실적\n2026-01\t곡물사업팀\t하역파트\t9800000";
    }
    return "연월\t팀\t파트\t계획\t실적\n2026-01\t곡물사업팀\t하역파트\t10000000\t9800000";
  })();

  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-heading text-base font-semibold text-dh-deep dark:text-dh-light">
            {title}
          </h3>
          {description ? (
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">
              연월별 팀·파트 계획·실적({unitHint}). 보안상 파일 업로드가 막히면
              [붙여넣기]로 엑셀 표를 넣을 수 있습니다.
            </p>
          )}
          {editing ? (
            <p className="mt-1 text-xs font-medium text-dh-real">
              수정 모드 — 편집 후 [저장]으로 마감하세요.
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

      {pasteOpen ? (
        <div className="mb-3 rounded-lg border border-border bg-muted/30 p-3">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <p className="text-xs text-muted-foreground">반영 대상</p>
            <div className="inline-flex rounded-lg border border-border bg-background p-0.5">
              {(
                [
                  ["plan", "계획만"],
                  ["actual", "실적만"],
                  ["both", "계획+실적"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPasteSide(id)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-medium",
                    pasteSide === id
                      ? "bg-dh-real text-white"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <p className="mb-2 text-xs text-muted-foreground">
            엑셀에서 헤더 포함 복사 후 붙여넣으세요.{" "}
            {pasteSide === "plan"
              ? "계획만 갱신되고 기존 실적은 유지됩니다."
              : pasteSide === "actual"
                ? "실적만 갱신되고 기존 계획은 유지됩니다."
                : "계획·실적을 함께 넣습니다."}{" "}
            같은 연월·팀·파트의 여러 행(개인별 등)은 합산됩니다. 적용 후
            [저장] 필요.
          </p>
          <textarea
            className="min-h-[8rem] w-full rounded-md border border-border bg-background p-2 font-mono text-xs"
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder={pastePlaceholder}
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <Button size="sm" onClick={applyPaste}>
              {pasteSide === "plan"
                ? "계획 붙여넣기"
                : pasteSide === "actual"
                  ? "실적 붙여넣기"
                  : "붙여넣기 적용"}
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

      <div className="mb-3 flex flex-wrap items-end gap-2">
        <div className="grid gap-1">
          <Label>표시 연월</Label>
          <Input
            type="month"
            className="h-8 w-[10rem]"
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
          />
        </div>
        <p className="pb-1.5 text-[11px] text-muted-foreground">
          등록 연월 {months.length}개 · 이 달 {visible.length}행
        </p>
      </div>

      <div
        className={cn(
          "mb-3 grid gap-2",
          isHours
            ? "@md/app:grid-cols-2 @xl/app:grid-cols-4"
            : "@md/app:grid-cols-3 @xl/app:grid-cols-6",
        )}
      >
        <div className="grid gap-1">
          <Label>연월</Label>
          <Input
            type="month"
            value={form.yearMonth}
            disabled={!editing}
            onChange={(e) => setForm({ ...form, yearMonth: e.target.value })}
          />
        </div>
        <div className="grid gap-1">
          <Label>팀</Label>
          <select
            className="h-8 rounded-md border border-border bg-background px-2 text-sm disabled:opacity-70"
            value={form.team}
            disabled={!editing}
            onChange={(e) => {
              const team = e.target.value as OrgTeam;
              const parts = partsForTeam(team);
              setForm({
                ...form,
                team,
                part: parts[0] ?? "",
              });
            }}
          >
            {teamOptions.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className="grid gap-1">
          <Label>파트</Label>
          {formParts.length ? (
            <select
              className="h-8 rounded-md border border-border bg-background px-2 text-sm disabled:opacity-70"
              value={form.part}
              disabled={!editing}
              onChange={(e) => setForm({ ...form, part: e.target.value })}
            >
              {formParts.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          ) : (
            <Input
              value={form.part}
              disabled={!editing}
              placeholder="(팀 단위)"
              onChange={(e) => setForm({ ...form, part: e.target.value })}
            />
          )}
        </div>

        {isHours ? (
          WORK_HOUR_DETAIL_KEYS.map((key) => (
            <div
              key={key}
              className="grid grid-cols-2 gap-2 rounded-md border border-border/70 bg-muted/20 p-2 @xl/app:col-span-1"
            >
              <p className="col-span-2 text-[11px] font-medium text-muted-foreground">
                {WORK_HOUR_DETAIL_LABELS[key]}
              </p>
              <div className="grid gap-1">
                <Label className="text-[10px]">계획</Label>
                <Input
                  type="number"
                  value={form.hours[key].plan}
                  disabled={!editing}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      hours: {
                        ...form.hours,
                        [key]: { ...form.hours[key], plan: e.target.value },
                      },
                    })
                  }
                />
              </div>
              <div className="grid gap-1">
                <Label className="text-[10px]">실적</Label>
                <Input
                  type="number"
                  value={form.hours[key].actual}
                  disabled={!editing}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      hours: {
                        ...form.hours,
                        [key]: { ...form.hours[key], actual: e.target.value },
                      },
                    })
                  }
                />
              </div>
            </div>
          ))
        ) : (
          <>
            <div className="grid gap-1">
              <Label>계획 ({unitHint})</Label>
              <Input
                type="number"
                value={form.plan}
                disabled={!editing}
                onChange={(e) => setForm({ ...form, plan: e.target.value })}
              />
            </div>
            <div className="grid gap-1">
              <Label>실적 ({unitHint})</Label>
              <Input
                type="number"
                value={form.actual}
                disabled={!editing}
                onChange={(e) => setForm({ ...form, actual: e.target.value })}
              />
            </div>
          </>
        )}

        <div className="flex items-end gap-2 @xl/app:col-span-1">
          <Button className="flex-1" disabled={!editing} onClick={addRow}>
            <Plus data-icon="inline-start" />
            행 추가
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="gw-data-table w-full min-w-[40rem] text-sm">
          <thead>
            <tr className="bg-dh-deep text-white">
              <th className="px-3 py-2">연월</th>
              <th className="px-3 py-2">팀</th>
              <th className="px-3 py-2">파트</th>
              {isHours ? (
                <>
                  {WORK_HOUR_DETAIL_KEYS.map((key) => (
                    <th key={key} className="px-2 py-2 text-center" colSpan={2}>
                      {WORK_HOUR_DETAIL_LABELS[key]}
                    </th>
                  ))}
                  <th className="px-2 py-2 text-center" colSpan={2}>
                    합계
                  </th>
                </>
              ) : (
                <>
                  <th className="px-3 py-2">계획</th>
                  <th className="px-3 py-2">실적</th>
                </>
              )}
              <th className="px-3 py-2" />
            </tr>
            {isHours ? (
              <tr className="bg-dh-deep/90 text-[10px] text-white/85">
                <th colSpan={3} />
                {WORK_HOUR_DETAIL_KEYS.map((key) => (
                  <FragmentHeader key={key} />
                ))}
                <FragmentHeader />
                <th />
              </tr>
            ) : null}
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td
                  colSpan={isHours ? 14 : 6}
                  className="px-3 py-8 text-center text-muted-foreground"
                >
                  {filterMonth} 데이터가 없습니다. 수정 후 행 추가 또는 붙여넣기
                  하세요.
                </td>
              </tr>
            ) : (
              visible.map((r) => {
                const rowParts = partsForTeam(r.team);
                const d = r.hourDetails ?? emptyWorkHourDetails();
                return (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-2 py-1.5">
                      {editing ? (
                        <Input
                          type="month"
                          className="mx-auto h-8 w-[9.5rem] px-2 text-sm"
                          value={r.yearMonth}
                          onChange={(e) =>
                            patchRow(r.id, {
                              yearMonth: e.target.value.slice(0, 7),
                            })
                          }
                        />
                      ) : (
                        r.yearMonth
                      )}
                    </td>
                    <td className="px-2 py-1.5">
                      {editing ? (
                        <select
                          className="h-8 rounded-md border border-border bg-background px-2 text-sm"
                          value={r.team}
                          onChange={(e) => {
                            const team = e.target.value as OrgTeam;
                            const parts = partsForTeam(team);
                            patchRow(r.id, {
                              team,
                              part: parts[0] ?? "",
                            });
                          }}
                        >
                          {teamOptions.map((t) => (
                            <option key={t}>{t}</option>
                          ))}
                        </select>
                      ) : (
                        r.team
                      )}
                    </td>
                    <td className="px-2 py-1.5">
                      {editing ? (
                        rowParts.length ? (
                          <select
                            className="h-8 rounded-md border border-border bg-background px-2 text-sm"
                            value={r.part ?? ""}
                            onChange={(e) =>
                              patchRow(r.id, { part: e.target.value })
                            }
                          >
                            {rowParts.map((p) => (
                              <option key={p}>{p}</option>
                            ))}
                          </select>
                        ) : (
                          <Input
                            className="h-8 w-28 px-2 text-sm"
                            value={r.part ?? ""}
                            placeholder="—"
                            onChange={(e) =>
                              patchRow(r.id, { part: e.target.value })
                            }
                          />
                        )
                      ) : (
                        r.part || "—"
                      )}
                    </td>
                    {isHours ? (
                      <>
                        {WORK_HOUR_DETAIL_KEYS.map((key) => (
                          <HourCells
                            key={key}
                            editing={editing}
                            plan={d[key].plan}
                            actual={d[key].actual}
                            onPlan={(v) =>
                              patchHourDetail(r.id, key, "plan", v)
                            }
                            onActual={(v) =>
                              patchHourDetail(r.id, key, "actual", v)
                            }
                          />
                        ))}
                        <td className="px-2 py-1.5 text-center tabular-nums font-medium">
                          {formatValue(r.plan)}
                        </td>
                        <td className="px-2 py-1.5 text-center tabular-nums font-medium">
                          {formatValue(r.actual)}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-2 py-1.5">
                          {editing ? (
                            <Input
                              type="number"
                              className="h-8 w-28 px-2 text-sm"
                              value={r.plan}
                              onChange={(e) =>
                                patchRow(r.id, {
                                  plan: Number(e.target.value) || 0,
                                })
                              }
                            />
                          ) : (
                            <span className="tabular-nums">
                              {formatValue(r.plan)}
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-1.5">
                          {editing ? (
                            <Input
                              type="number"
                              className="h-8 w-28 px-2 text-sm"
                              value={r.actual}
                              onChange={(e) =>
                                patchRow(r.id, {
                                  actual: Number(e.target.value) || 0,
                                })
                              }
                            />
                          ) : (
                            <span className="tabular-nums">
                              {formatValue(r.actual)}
                            </span>
                          )}
                        </td>
                      </>
                    )}
                    <td className="px-2 py-1.5">
                      <button
                        type="button"
                        className="inline-flex rounded p-1 hover:text-dh-red disabled:opacity-40"
                        disabled={!editing}
                        onClick={() => removeRow(r.id)}
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

function FragmentHeader() {
  return (
    <>
      <th className="px-1 py-1 font-normal">계획</th>
      <th className="px-1 py-1 font-normal">실적</th>
    </>
  );
}

function HourCells({
  editing,
  plan,
  actual,
  onPlan,
  onActual,
}: {
  editing: boolean;
  plan: number;
  actual: number;
  onPlan: (v: number) => void;
  onActual: (v: number) => void;
}) {
  return (
    <>
      <td className="px-1 py-1">
        {editing ? (
          <Input
            type="number"
            className="h-8 w-[4.5rem] px-1 text-xs"
            value={plan}
            onChange={(e) => onPlan(Number(e.target.value) || 0)}
          />
        ) : (
          <span className="block text-center tabular-nums text-xs">
            {formatValue(plan)}
          </span>
        )}
      </td>
      <td className="px-1 py-1">
        {editing ? (
          <Input
            type="number"
            className="h-8 w-[4.5rem] px-1 text-xs"
            value={actual}
            onChange={(e) => onActual(Number(e.target.value) || 0)}
          />
        ) : (
          <span className="block text-center tabular-nums text-xs">
            {formatValue(actual)}
          </span>
        )}
      </td>
    </>
  );
}
