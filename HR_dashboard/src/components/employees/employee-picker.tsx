"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { ChevronDown, Search } from "lucide-react";
import { useEmployees } from "@/hooks/use-employees";
import type { EmployeeRosterRecord } from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (name: string, employee: EmployeeRosterRecord | null) => void;
  disabled?: boolean;
  className?: string;
  /** 성명 미선택 시 표시 */
  placeholder?: string;
  /** true면 목록에 없는 현재 value도 옵션으로 유지 */
  allowFreeText?: boolean;
};

function normalizeEmp(emp: EmployeeRosterRecord): EmployeeRosterRecord {
  const salaryRaw = Number(emp.salary);
  const contractRaw = Number(emp.contractSalary);
  return {
    ...emp,
    titleYears:
      typeof emp.titleYears === "number" && Number.isFinite(emp.titleYears)
        ? emp.titleYears
        : Number(emp.titleYears) || 1,
    salary:
      Number.isFinite(salaryRaw) && salaryRaw > 0 ? Math.floor(salaryRaw) : 0,
    contractSalary:
      Number.isFinite(contractRaw) && contractRaw > 0
        ? Math.floor(contractRaw)
        : 0,
  };
}

function labelOf(e: EmployeeRosterRecord) {
  return [
    e.name,
    e.department ? `· ${e.department}` : "",
    e.empNo ? `(${e.empNo})` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

/** 사원명부에서 성명 검색·선택 → 소속 등 자동 채움용 */
export function EmployeePicker({
  value,
  onChange,
  disabled,
  className,
  placeholder = "이름 입력 후 선택",
  allowFreeText = true,
}: Props) {
  const { items, hydrated } = useEmployees();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const [highlight, setHighlight] = useState(0);

  useEffect(() => {
    if (!open) setQuery(value);
  }, [value, open]);

  const sorted = useMemo(
    () =>
      [...items].sort(
        (a, b) =>
          a.name.localeCompare(b.name, "ko") ||
          a.empNo.localeCompare(b.empNo, "ko"),
      ),
    [items],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter((e) => {
      const hay = `${e.name} ${e.empNo} ${e.department} ${e.division} ${e.part}`
        .toLowerCase();
      return hay.includes(q) || e.name.includes(query.trim());
    });
  }, [sorted, query]);

  const shown = filtered.slice(0, 80);

  const pick = useCallback(
    (emp: EmployeeRosterRecord) => {
      onChange(emp.name, normalizeEmp(emp));
      setQuery(emp.name);
      setOpen(false);
      setHighlight(0);
    },
    [onChange],
  );

  useEffect(() => {
    if (!open) return;
    const onDoc = (ev: MouseEvent) => {
      if (!rootRef.current?.contains(ev.target as Node)) {
        setOpen(false);
        if (allowFreeText) {
          const t = query.trim();
          if (t !== value.trim()) onChange(t, null);
        } else {
          setQuery(value);
        }
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, allowFreeText, query, value, onChange]);

  useEffect(() => {
    setHighlight(0);
  }, [query, open]);

  const isDisabled = disabled || !hydrated;

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          disabled={isDisabled}
          placeholder={placeholder}
          value={open ? query : value}
          className={cn(
            "h-8 w-full rounded-md border border-border bg-background py-1 pr-8 pl-7 text-sm outline-none",
            "placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40",
            "disabled:cursor-not-allowed disabled:opacity-60",
          )}
          onFocus={() => {
            setQuery(value);
            setOpen(true);
          }}
          onChange={(e) => {
            const next = e.target.value;
            setQuery(next);
            setOpen(true);
            if (allowFreeText) onChange(next, null);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
              setHighlight((h) =>
                shown.length ? Math.min(h + 1, shown.length - 1) : 0,
              );
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setHighlight((h) => Math.max(h - 1, 0));
            } else if (e.key === "Enter") {
              if (open && shown[highlight]) {
                e.preventDefault();
                pick(shown[highlight]);
              } else {
                setOpen(false);
              }
            } else if (e.key === "Escape") {
              e.preventDefault();
              setOpen(false);
              setQuery(value);
            }
          }}
        />
        <button
          type="button"
          tabIndex={-1}
          disabled={isDisabled}
          className="absolute top-1/2 right-1 flex size-6 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:text-foreground disabled:opacity-50"
          aria-label="사원 목록 열기"
          onClick={() => {
            if (isDisabled) return;
            if (open) {
              setOpen(false);
            } else {
              setQuery(value);
              setOpen(true);
              inputRef.current?.focus();
            }
          }}
        >
          <ChevronDown className="size-3.5" />
        </button>
      </div>

      {open && !isDisabled ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-md border border-border bg-card py-1 text-sm shadow-md"
        >
          {shown.length === 0 ? (
            <li className="px-3 py-2 text-muted-foreground">
              {query.trim()
                ? "일치하는 사원이 없습니다. 수기로 입력할 수 있습니다."
                : "사원명부가 비어 있습니다."}
            </li>
          ) : (
            shown.map((e, i) => (
              <li key={e.id} role="option" aria-selected={i === highlight}>
                <button
                  type="button"
                  className={cn(
                    "flex w-full flex-col items-start gap-0.5 px-3 py-1.5 text-left hover:bg-muted",
                    i === highlight && "bg-muted",
                  )}
                  onMouseEnter={() => setHighlight(i)}
                  onMouseDown={(ev) => {
                    ev.preventDefault();
                    pick(e);
                  }}
                >
                  <span className="font-medium text-foreground">{e.name}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {labelOf(e).replace(e.name, "").trim() || "소속 미입력"}
                  </span>
                </button>
              </li>
            ))
          )}
          {filtered.length > shown.length ? (
            <li className="border-t border-border px-3 py-1.5 text-[11px] text-muted-foreground">
              {filtered.length - shown.length}명 더 있음 · 이름을 더 입력하세요
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
