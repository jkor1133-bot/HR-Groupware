"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ArrowDownAZ,
  ArrowUpAZ,
  ChevronDown,
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
import { seedPromotions } from "@/data/hr-records-seed";
import { useLocalList } from "@/hooks/use-local-list";
import {
  cellDate,
  cellStr,
  downloadRowsAsExcel,
  readExcelFile,
} from "@/lib/excel";
import { PROMOTION_TITLES, toTitleRank } from "@/lib/promotion-rules";
import type { PromotionRecord } from "@/lib/types";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "hr-dashboard-promotions-v2";

function cloneItems(items: PromotionRecord[]) {
  return JSON.parse(JSON.stringify(items)) as PromotionRecord[];
}

type DateSort = "desc" | "asc";

export function PromotionHistoryPanel() {
  const list = useLocalList(STORAGE_KEY, seedPromotions);
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    employeeName: "",
    team: "",
    fromTitle: "사원",
    toTitle: "대리",
    effectiveDate: "",
    note: "",
  });
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<PromotionRecord[] | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [dateSort, setDateSort] = useState<DateSort>("desc");
  type HistFilterKey =
    | "employeeName"
    | "team"
    | "fromTitle"
    | "toTitle"
    | "effectiveDate";
  type HistFilters = Record<HistFilterKey, string[]>;
  const emptyHistFilters = (): HistFilters => ({
    employeeName: [],
    team: [],
    fromTitle: [],
    toTitle: [],
    effectiveDate: [],
  });
  const [filters, setFilters] = useState<HistFilters>(emptyHistFilters);
  const [openFilter, setOpenFilter] = useState<HistFilterKey | null>(null);
  const filterMenuRef = useRef<HTMLTableRowElement>(null);

  useEffect(() => {
    if (!editing) setDraft(null);
  }, [editing]);

  const working = editing && draft ? draft : list.items;

  const filterOptions = useMemo(() => {
    const names = new Set<string>();
    const teams = new Set<string>();
    const fromTitles = new Set<string>();
    const toTitles = new Set<string>();
    const dates = new Set<string>();
    for (const r of working) {
      if (r.employeeName.trim()) names.add(r.employeeName.trim());
      if (r.team.trim()) teams.add(r.team.trim());
      if (r.fromTitle.trim()) fromTitles.add(r.fromTitle.trim());
      if (r.toTitle.trim()) toTitles.add(r.toTitle.trim());
      if (r.effectiveDate) dates.add(r.effectiveDate);
    }
    for (const t of PROMOTION_TITLES) {
      fromTitles.add(t);
      toTitles.add(t);
    }
    return {
      employeeName: [...names].sort((a, b) => a.localeCompare(b, "ko")),
      team: [...teams].sort((a, b) => a.localeCompare(b, "ko")),
      fromTitle: [...fromTitles].sort(
        (a, b) => toTitleRank(a) - toTitleRank(b),
      ),
      toTitle: [...toTitles].sort((a, b) => toTitleRank(a) - toTitleRank(b)),
      effectiveDate: [...dates].sort((a, b) => b.localeCompare(a)),
    };
  }, [working]);

  function matchesMulti(selected: string[], value: string) {
    return selected.length === 0 || selected.includes(value);
  }

  function summarizeSelected(selected: string[]) {
    if (selected.length === 0) return null;
    if (selected.length === 1) return selected[0]!;
    return `${selected[0]} 외 ${selected.length - 1}`;
  }

  const visible = useMemo(() => {
    const filtered = working.filter((r) => {
      if (!matchesMulti(filters.employeeName, r.employeeName.trim())) {
        return false;
      }
      if (!matchesMulti(filters.team, r.team.trim())) return false;
      if (!matchesMulti(filters.fromTitle, r.fromTitle)) return false;
      if (!matchesMulti(filters.toTitle, r.toTitle)) return false;
      if (!matchesMulti(filters.effectiveDate, r.effectiveDate)) return false;
      return true;
    });
    return [...filtered].sort((a, b) => {
      const da = a.effectiveDate || "";
      const db = b.effectiveDate || "";
      const byDate =
        dateSort === "desc" ? db.localeCompare(da) : da.localeCompare(db);
      if (byDate !== 0) return byDate;
      const byTitle = toTitleRank(b.toTitle) - toTitleRank(a.toTitle);
      if (byTitle !== 0) return byTitle;
      return (a.employeeName || "").localeCompare(b.employeeName || "", "ko");
    });
  }, [working, filters, dateSort]);

  const hasFilters = Object.values(filters).some((v) => v.length > 0);

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

  function toggleFilterValue(key: HistFilterKey, value: string) {
    setFilters((prev) => {
      const cur = prev[key];
      const nextVals = cur.includes(value)
        ? cur.filter((v) => v !== value)
        : [...cur, value];
      return { ...prev, [key]: nextVals };
    });
  }

  function clearFilterKey(key: HistFilterKey) {
    setFilters((prev) => ({ ...prev, [key]: [] }));
  }

  function clearFilters() {
    setFilters(emptyHistFilters());
    setOpenFilter(null);
  }

  function HeaderFilter({
    filterKey,
    label,
    trailing,
  }: {
    filterKey: HistFilterKey;
    label: string;
    trailing?: ReactNode;
  }) {
    const selected = filters[filterKey];
    const active = selected.length > 0;
    const open = openFilter === filterKey;
    const options = filterOptions[filterKey];
    const summary = summarizeSelected(selected);
    return (
      <th className="relative px-3 py-2">
        <div className="inline-flex items-center gap-1">
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
          {trailing}
        </div>
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
    if (
      !form.employeeName.trim() ||
      !form.team.trim() ||
      !form.fromTitle.trim() ||
      !form.toTitle.trim() ||
      !form.effectiveDate
    ) {
      return;
    }
    const item: PromotionRecord = {
      id: `pr-${Date.now()}`,
      employeeName: form.employeeName.trim(),
      team: form.team.trim(),
      fromTitle: form.fromTitle.trim(),
      toTitle: form.toTitle.trim(),
      effectiveDate: form.effectiveDate,
      note: form.note.trim(),
    };
    if (editing) {
      setDraft((prev) => [...(prev ?? cloneItems(list.items)), item]);
    } else {
      list.upsert(item);
    }
    setForm({
      employeeName: "",
      team: "",
      fromTitle: "사원",
      toTitle: "대리",
      effectiveDate: "",
      note: "",
    });
  }

  function patchRow(id: string, patch: Partial<PromotionRecord>) {
    setDraft((prev) => {
      const base = prev ?? cloneItems(list.items);
      return base.map((row) => (row.id === id ? { ...row, ...patch } : row));
    });
  }

  function removeRow(id: string) {
    if (editing) {
      setDraft((prev) =>
        (prev ?? cloneItems(list.items)).filter((r) => r.id !== id),
      );
    } else {
      list.remove(id);
    }
  }

  async function upload(file?: File) {
    if (!file) return;
    const rows = await readExcelFile(file);
    const next = rows
      .map((row, i) => ({
        id: `pr-up-${Date.now()}-${i}`,
        employeeName: cellStr(row, "성명", "employeeName"),
        team: cellStr(row, "소속", "team"),
        fromTitle: cellStr(row, "승진 전", "fromTitle"),
        toTitle: cellStr(row, "승진 후", "toTitle"),
        effectiveDate: cellDate(row, "발령일", "effectiveDate"),
        note: cellStr(row, "비고", "note"),
      }))
      .filter(
        (r) =>
          r.employeeName &&
          r.team &&
          r.fromTitle &&
          r.toTitle &&
          r.effectiveDate,
      );
    if (!next.length) return;
    if (editing) setDraft(next);
    else list.replaceAll(next);
  }

  function toggleDateSort() {
    setDateSort((s) => (s === "desc" ? "asc" : "desc"));
  }

  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-heading text-lg font-semibold text-dh-deep dark:text-dh-light">
            승진 발령 이력
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            기본 정렬: 발령일 → 승진 후(부장·차장·과장·대리·사원). 표 헤더의
            성명·소속·승진 전·승진 후·발령일을 눌러 필터할 수 있습니다.
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
            onClick={() =>
              downloadRowsAsExcel(
                visible.map((item) => ({
                  성명: item.employeeName,
                  소속: item.team,
                  "승진 전": item.fromTitle,
                  "승진 후": item.toTitle,
                  발령일: item.effectiveDate,
                  비고: item.note,
                })),
                "승진발령이력.xlsx",
              )
            }
          >
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

      {hasFilters ? (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-dh-sea/30 bg-dh-sky/10 px-3 py-2 text-xs">
          <span className="font-medium text-dh-deep dark:text-dh-light">
            필터
          </span>
          {filters.employeeName.length > 0 ? (
            <span className="rounded-md border border-border bg-card px-2 py-0.5">
              성명: {filters.employeeName.join(", ")}
            </span>
          ) : null}
          {filters.team.length > 0 ? (
            <span className="rounded-md border border-border bg-card px-2 py-0.5">
              소속: {filters.team.join(", ")}
            </span>
          ) : null}
          {filters.fromTitle.length > 0 ? (
            <span className="rounded-md border border-border bg-card px-2 py-0.5">
              승진 전: {filters.fromTitle.join(", ")}
            </span>
          ) : null}
          {filters.toTitle.length > 0 ? (
            <span className="rounded-md border border-border bg-card px-2 py-0.5">
              승진 후: {filters.toTitle.join(", ")}
            </span>
          ) : null}
          {filters.effectiveDate.length > 0 ? (
            <span className="rounded-md border border-border bg-card px-2 py-0.5">
              발령일: {filters.effectiveDate.join(", ")}
            </span>
          ) : null}
          <span className="text-muted-foreground">{visible.length}명</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 px-2"
            onClick={clearFilters}
          >
            전체 보기
          </Button>
        </div>
      ) : null}

      <div className="mb-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-7">
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
            onChange={(e) => setForm({ ...form, team: e.target.value })}
          />
        </div>
        <div className="grid gap-1">
          <Label>승진 전</Label>
          <select
            className="h-8 rounded-md border border-border bg-background px-2 text-sm"
            value={form.fromTitle}
            onChange={(e) => setForm({ ...form, fromTitle: e.target.value })}
          >
            {PROMOTION_TITLES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1">
          <Label>승진 후</Label>
          <select
            className="h-8 rounded-md border border-border bg-background px-2 text-sm"
            value={form.toTitle}
            onChange={(e) => setForm({ ...form, toTitle: e.target.value })}
          >
            {PROMOTION_TITLES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1">
          <Label>발령일</Label>
          <Input
            type="date"
            value={form.effectiveDate}
            onChange={(e) =>
              setForm({ ...form, effectiveDate: e.target.value })
            }
          />
        </div>
        <div className="grid gap-1">
          <Label>비고</Label>
          <Input
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
          />
        </div>
        <div className="flex items-end">
          <Button className="w-full" onClick={addRow}>
            <Plus data-icon="inline-start" />
            {editing ? "행 추가" : "추가"}
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="gw-data-table w-full min-w-[720px] text-sm">
          <thead>
            <tr ref={filterMenuRef} className="bg-dh-deep text-white">
              <HeaderFilter filterKey="employeeName" label="성명" />
              <HeaderFilter filterKey="team" label="소속" />
              <HeaderFilter filterKey="fromTitle" label="승진 전" />
              <HeaderFilter filterKey="toTitle" label="승진 후" />
              <HeaderFilter
                filterKey="effectiveDate"
                label="발령일"
                trailing={
                  <button
                    type="button"
                    className="inline-flex rounded p-0.5 hover:bg-white/15"
                    title={
                      dateSort === "desc"
                        ? "최신 발령일 순 · 클릭 시 오래된 순"
                        : "오래된 발령일 순 · 클릭 시 최신 순"
                    }
                    onClick={toggleDateSort}
                  >
                    {dateSort === "desc" ? (
                      <ArrowDownAZ className="size-3.5 opacity-90" />
                    ) : (
                      <ArrowUpAZ className="size-3.5 opacity-90" />
                    )}
                  </button>
                }
              />
              <th className="px-3 py-2">비고</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-3 py-8 text-center text-muted-foreground"
                >
                  {hasFilters
                    ? "선택한 조건에 맞는 발령 이력이 없습니다. 「전체 보기」로 필터를 해제하세요."
                    : "등록된 항목이 없습니다."}
                </td>
              </tr>
            ) : (
              visible.map((item) => (
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
                                    emp.department || emp.division || item.team,
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
                        className="h-8 min-w-[6rem] px-2 text-sm"
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
                      <select
                        className="h-8 rounded-md border border-border bg-background px-2 text-sm"
                        value={item.fromTitle}
                        onChange={(e) =>
                          patchRow(item.id, { fromTitle: e.target.value })
                        }
                      >
                        {PROMOTION_TITLES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    ) : (
                      item.fromTitle
                    )}
                  </td>
                  <td className="px-2 py-1.5">
                    {editing ? (
                      <select
                        className="h-8 rounded-md border border-border bg-background px-2 text-sm"
                        value={item.toTitle}
                        onChange={(e) =>
                          patchRow(item.id, { toTitle: e.target.value })
                        }
                      >
                        {PROMOTION_TITLES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="font-medium">{item.toTitle}</span>
                    )}
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    {editing ? (
                      <Input
                        type="date"
                        className="h-8 min-w-[8.5rem] px-2 text-sm"
                        value={item.effectiveDate}
                        onChange={(e) =>
                          patchRow(item.id, {
                            effectiveDate: e.target.value,
                          })
                        }
                      />
                    ) : (
                      <span className="tabular-nums">{item.effectiveDate}</span>
                    )}
                  </td>
                  <td className="px-2 py-1.5">
                    {editing ? (
                      <Input
                        className="h-8 min-w-[6rem] px-2 text-sm"
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
                      onClick={() => {
                        if (
                          window.confirm(
                            "이 행을 삭제할까요? (저장 시 반영)",
                          )
                        ) {
                          removeRow(item.id);
                        }
                      }}
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
