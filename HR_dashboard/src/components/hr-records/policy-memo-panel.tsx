"use client";

import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLocalList } from "@/hooks/use-local-list";
import type { PolicyMemoRecord } from "@/lib/types";
import { cn } from "@/lib/utils";

function cloneItems(items: PolicyMemoRecord[]) {
  return JSON.parse(JSON.stringify(items)) as PolicyMemoRecord[];
}

function emptyForm() {
  return { memoDate: "", title: "", body: "", note: "" };
}

type Props = {
  title: string;
  description?: string;
  storageKey: string;
  seedFn: () => PolicyMemoRecord[];
  idPrefix: string;
};

export function PolicyMemoPanel({
  title,
  description,
  storageKey,
  seedFn,
  idPrefix,
}: Props) {
  const list = useLocalList(storageKey, seedFn);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<PolicyMemoRecord[] | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!editing) setDraft(null);
  }, [editing]);

  const working = editing && draft ? draft : list.items;
  const rows = useMemo(
    () =>
      [...working].sort((a, b) =>
        (b.memoDate || "").localeCompare(a.memoDate || ""),
      ),
    [working],
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
    list.replaceAll(
      [...draft].sort((a, b) =>
        (b.memoDate || "").localeCompare(a.memoDate || ""),
      ),
    );
    setEditing(false);
    setDraft(null);
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 2000);
  }

  function addRow() {
    if (!form.memoDate || !form.title.trim() || !form.body.trim()) {
      window.alert("일자·제목·내용은 필수입니다.");
      return;
    }
    const item: PolicyMemoRecord = {
      id: `${idPrefix}-${Date.now()}`,
      memoDate: form.memoDate,
      title: form.title.trim(),
      body: form.body.trim(),
      note: form.note.trim(),
    };
    if (editing) {
      setDraft((prev) => [...(prev ?? cloneItems(list.items)), item]);
    } else {
      list.upsert(item);
    }
    setForm(emptyForm());
    setExpandedId(item.id);
  }

  function patchRow(id: string, patch: Partial<PolicyMemoRecord>) {
    setDraft((prev) => {
      const base = prev ?? cloneItems(list.items);
      return base.map((row) => (row.id === id ? { ...row, ...patch } : row));
    });
  }

  function removeRow(id: string, titleText: string) {
    if (!editing) {
      window.alert("수정 모드에서 삭제할 수 있습니다.");
      return;
    }
    if (!window.confirm(`"${titleText}" 메모를 삭제할까요? (저장 시 반영)`)) {
      return;
    }
    setDraft((prev) =>
      (prev ?? cloneItems(list.items)).filter((r) => r.id !== id),
    );
  }

  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-heading text-base font-semibold text-dh-deep dark:text-dh-light">
            {title}
          </h3>
          {description ? (
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          ) : null}
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

      <div className="mb-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <div className="grid gap-1">
          <Label>일자</Label>
          <Input
            type="date"
            value={form.memoDate}
            onChange={(e) =>
              setForm((f) => ({ ...f, memoDate: e.target.value }))
            }
          />
        </div>
        <div className="grid gap-1 sm:col-span-1 lg:col-span-2">
          <Label>제목</Label>
          <Input
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="개정·공지 요약"
          />
        </div>
        <div className="grid gap-1">
          <Label>비고</Label>
          <Input
            value={form.note}
            onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
          />
        </div>
        <div className="grid gap-1 sm:col-span-2 lg:col-span-3">
          <Label>내용</Label>
          <Textarea
            value={form.body}
            onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
            placeholder="지급 기준·변경 사유 등"
            className="min-h-20"
          />
        </div>
        <div className="flex items-end">
          <Button className="w-full" onClick={addRow}>
            <Plus data-icon="inline-start" />
            이력 추가
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {rows.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-3 py-8 text-center text-sm text-muted-foreground">
            등록된 기준 이력이 없습니다.
          </p>
        ) : (
          rows.map((item) => {
            const open = expandedId === item.id;
            return (
              <article
                key={item.id}
                className={cn(
                  "rounded-lg border border-border bg-background",
                  open && "ring-1 ring-dh-sea/40",
                )}
              >
                <div className="flex flex-wrap items-start gap-2 px-3 py-2.5">
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() =>
                      setExpandedId((id) => (id === item.id ? null : item.id))
                    }
                  >
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {item.memoDate}
                      </span>
                      <span className="font-medium text-dh-deep dark:text-dh-light">
                        {item.title}
                      </span>
                      {item.note ? (
                        <span className="text-xs text-muted-foreground">
                          · {item.note}
                        </span>
                      ) : null}
                    </div>
                    {!open ? (
                      <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                        {item.body}
                      </p>
                    ) : null}
                  </button>
                  <button
                    type="button"
                    className="inline-flex rounded p-1 hover:text-dh-red disabled:opacity-40"
                    disabled={!editing}
                    title={
                      editing ? "삭제" : "수정 모드에서 삭제할 수 있습니다"
                    }
                    onClick={() => removeRow(item.id, item.title)}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
                {open ? (
                  <div className="space-y-2 border-t border-border px-3 py-3">
                    {editing ? (
                      <>
                        <div className="grid gap-2 sm:grid-cols-3">
                          <div className="grid gap-1">
                            <Label>일자</Label>
                            <Input
                              type="date"
                              className="h-8 text-sm"
                              value={item.memoDate}
                              onChange={(e) =>
                                patchRow(item.id, {
                                  memoDate: e.target.value,
                                })
                              }
                            />
                          </div>
                          <div className="grid gap-1 sm:col-span-2">
                            <Label>제목</Label>
                            <Input
                              className="h-8 text-sm"
                              value={item.title}
                              onChange={(e) =>
                                patchRow(item.id, { title: e.target.value })
                              }
                            />
                          </div>
                        </div>
                        <div className="grid gap-1">
                          <Label>내용</Label>
                          <Textarea
                            className="min-h-24 text-sm"
                            value={item.body}
                            onChange={(e) =>
                              patchRow(item.id, { body: e.target.value })
                            }
                          />
                        </div>
                        <div className="grid gap-1">
                          <Label>비고</Label>
                          <Input
                            className="h-8 text-sm"
                            value={item.note}
                            onChange={(e) =>
                              patchRow(item.id, { note: e.target.value })
                            }
                          />
                        </div>
                      </>
                    ) : (
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                        {item.body}
                      </p>
                    )}
                  </div>
                ) : null}
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
