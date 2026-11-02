"use client";

import { useMemo } from "react";
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

/** 사원명부에서 성명 선택 → 소속 등 자동 채움용 */
export function EmployeePicker({
  value,
  onChange,
  disabled,
  className,
  placeholder = "사원 선택",
  allowFreeText = true,
}: Props) {
  const { items, hydrated } = useEmployees();

  const sorted = useMemo(
    () =>
      [...items].sort((a, b) =>
        a.name.localeCompare(b.name, "ko") ||
        a.empNo.localeCompare(b.empNo, "ko"),
      ),
    [items],
  );

  const orphan =
    allowFreeText &&
    value.trim() &&
    !sorted.some((e) => e.name === value.trim());

  /** 동명이인 구분: option value는 id, 표시는 성명·부서 */
  const selected = sorted.find((e) => e.name === value.trim()) ?? null;
  const selectValue = selected?.id ?? (orphan ? `__orphan__:${value}` : "");

  return (
    <select
      className={cn(
        "h-8 w-full rounded-md border border-border bg-background px-2 text-sm disabled:opacity-60",
        className,
      )}
      value={selectValue}
      disabled={disabled || !hydrated}
      onChange={(e) => {
        const raw = e.target.value;
        if (!raw) {
          onChange("", null);
          return;
        }
        if (raw.startsWith("__orphan__:")) {
          onChange(raw.slice("__orphan__:".length), null);
          return;
        }
        const emp = sorted.find((x) => x.id === raw) ?? null;
        onChange(emp?.name ?? "", emp);
      }}
    >
      <option value="">{placeholder}</option>
      {orphan ? (
        <option value={`__orphan__:${value}`}>{value} (명부 외)</option>
      ) : null}
      {sorted.map((e) => (
        <option key={e.id} value={e.id}>
          {e.name}
          {e.department ? ` · ${e.department}` : ""}
          {e.empNo ? ` (${e.empNo})` : ""}
        </option>
      ))}
    </select>
  );
}
