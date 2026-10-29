"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Pencil, Plus, Save, Trash2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocalList } from "@/hooks/use-local-list";
import {
  cellDate,
  cellNum,
  cellStr,
  downloadRowsAsExcel,
  readExcelFile,
} from "@/lib/excel";

export type FieldDef = {
  key: string;
  label: string;
  type?: "text" | "date" | "number";
  required?: boolean;
  excelKeys?: string[];
};

type Props<T extends { id: string }> = {
  title: string;
  description?: string;
  storageKey: string;
  seedFn: () => T[];
  fields: FieldDef[];
  excelFileName: string;
  idPrefix: string;
};

function emptyForm(fields: FieldDef[]) {
  return Object.fromEntries(
    fields.map((f) => [f.key, f.type === "number" ? "" : ""]),
  ) as Record<string, string>;
}

function cloneItems<T>(items: T[]): T[] {
  return JSON.parse(JSON.stringify(items)) as T[];
}

export function SimpleRecordsPanel<T extends { id: string }>({
  title,
  description,
  storageKey,
  seedFn,
  fields,
  excelFileName,
  idPrefix,
}: Props<T>) {
  const list = useLocalList(storageKey, seedFn);
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState(() => emptyForm(fields));
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<T[] | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    if (!editing) setDraft(null);
  }, [editing]);

  const working = editing && draft ? draft : list.items;

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
    for (const f of fields) {
      if (f.required && !String(form[f.key] ?? "").trim()) return;
    }
    const item = {
      id: `${idPrefix}-${Date.now()}`,
      ...Object.fromEntries(
        fields.map((f) => {
          const raw = form[f.key] ?? "";
          if (f.type === "number") {
            return [f.key, Number(raw) || 0];
          }
          return [f.key, String(raw).trim()];
        }),
      ),
    } as T;

    if (editing) {
      setDraft((prev) => [...(prev ?? cloneItems(list.items)), item]);
    } else {
      list.upsert(item);
    }
    setForm(emptyForm(fields));
  }

  function patchRow(id: string, key: string, value: string | number) {
    setDraft((prev) => {
      const base = prev ?? cloneItems(list.items);
      return base.map((row) =>
        row.id === id ? ({ ...row, [key]: value } as T) : row,
      );
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
      .map((row, i) => {
        const obj: Record<string, string | number> = {
          id: `${idPrefix}-up-${Date.now()}-${i}`,
        };
        for (const f of fields) {
          const keys = f.excelKeys ?? [f.label, f.key];
          if (f.type === "date") {
            obj[f.key] = cellDate(row, ...keys);
          } else if (f.type === "number") {
            obj[f.key] = cellNum(row, ...keys);
          } else {
            obj[f.key] = cellStr(row, ...keys);
          }
        }
        return obj as unknown as T;
      })
      .filter((r) =>
        fields
          .filter((f) => f.required)
          .every((f) => {
            const v = (r as Record<string, unknown>)[f.key];
            return v !== "" && v !== undefined && v !== null;
          }),
      );
    if (!next.length) return;
    if (editing) {
      setDraft(next);
    } else {
      list.replaceAll(next);
    }
  }

  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-heading text-lg font-semibold text-dh-deep dark:text-dh-light">
            {title}
          </h2>
          {description ? (
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
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
            onClick={() =>
              downloadRowsAsExcel(
                working.map((item) => {
                  const src = item as unknown as Record<string, string | number>;
                  const row: Record<string, string | number> = {};
                  for (const f of fields) {
                    row[f.label] = src[f.key];
                  }
                  return row;
                }),
                excelFileName,
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

      <div
        className="mb-4 grid gap-2"
        style={{
          gridTemplateColumns: `repeat(auto-fill, minmax(9rem, 1fr))`,
        }}
      >
        {fields.map((f) => (
          <div key={f.key} className="grid gap-1">
            <Label>{f.label}</Label>
            <Input
              type={
                f.type === "date"
                  ? "date"
                  : f.type === "number"
                    ? "number"
                    : "text"
              }
              value={form[f.key] ?? ""}
              onChange={(e) =>
                setForm({ ...form, [f.key]: e.target.value })
              }
            />
          </div>
        ))}
        <div className="flex items-end">
          <Button className="w-full" onClick={addRow}>
            <Plus data-icon="inline-start" />
            {editing ? "행 추가" : "추가"}
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="gw-data-table w-full min-w-[640px] text-sm">
          <thead>
            <tr className="bg-dh-deep text-white">
              {fields.map((f) => (
                <th key={f.key} className="px-3 py-2">
                  {f.label}
                </th>
              ))}
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {working.length === 0 ? (
              <tr>
                <td
                  colSpan={fields.length + 1}
                  className="px-3 py-8 text-center text-muted-foreground"
                >
                  등록된 항목이 없습니다.
                </td>
              </tr>
            ) : (
              working.map((item) => (
                <tr key={item.id} className="border-t border-border">
                  {fields.map((f) => {
                    const v = (
                      item as unknown as Record<string, string | number>
                    )[f.key];
                    return (
                      <td key={f.key} className="px-2 py-1.5">
                        {editing ? (
                          <Input
                            type={
                              f.type === "date"
                                ? "date"
                                : f.type === "number"
                                  ? "number"
                                  : "text"
                            }
                            className="h-8 min-w-[6rem] px-2 text-sm"
                            value={v ?? ""}
                            onChange={(e) =>
                              patchRow(
                                item.id,
                                f.key,
                                f.type === "number"
                                  ? Number(e.target.value) || 0
                                  : e.target.value,
                              )
                            }
                          />
                        ) : (
                          <span className="text-muted-foreground first:font-medium first:text-foreground">
                            {f.type === "number" && typeof v === "number"
                              ? v.toLocaleString("ko-KR")
                              : String(v ?? "")}
                          </span>
                        )}
                      </td>
                    );
                  })}
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
                          window.confirm("이 행을 삭제할까요? (저장 시 반영)")
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
