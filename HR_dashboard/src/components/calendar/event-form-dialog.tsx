"use client";

import { useRef, useState, type ReactNode } from "react";
import { Paperclip, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type {
  CalendarAttachment,
  CalendarEvent,
  CalendarVisibility,
  TeamMember,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const MAX_FILE_BYTES = 1.5 * 1024 * 1024;
const MAX_FILES = 5;

export const CALENDAR_NAMES = [
  "내 캘린더",
  "인사총무",
  "경영지원",
  "전사 공유",
  "휴가·근태",
] as const;

export const EVENT_COLORS = [
  "#1f4889",
  "#2d9cdb",
  "#2a9d8f",
  "#e85d04",
  "#9b2226",
  "#6c757d",
] as const;

export const REMINDER_OPTIONS = [
  "없음",
  "정시",
  "5분 전",
  "10분 전",
  "30분 전",
  "1시간 전",
  "1일 전",
] as const;

export type EventFormState = {
  title: string;
  date: string;
  endDate: string;
  startTime: string;
  endTime: string;
  allDay: boolean;
  location: string;
  description: string;
  ownerId: string;
  calendarName: string;
  attendees: string;
  visibility: CalendarVisibility;
  color: string;
  videoLink: string;
  reminder: string;
  attachments: CalendarAttachment[];
};

export function emptyEventForm(
  date: string,
  ownerId: string,
): EventFormState {
  return {
    title: "",
    date,
    endDate: date,
    startTime: "09:00",
    endTime: "10:00",
    allDay: false,
    location: "",
    description: "",
    ownerId,
    calendarName: "내 캘린더",
    attendees: "",
    visibility: "공개",
    color: EVENT_COLORS[0],
    videoLink: "",
    reminder: "10분 전",
    attachments: [],
  };
}

export function eventToForm(ev: CalendarEvent): EventFormState {
  return {
    title: ev.title,
    date: ev.date,
    endDate: ev.endDate || ev.date,
    startTime: ev.startTime,
    endTime: ev.endTime,
    allDay: ev.allDay,
    location: ev.location,
    description: ev.description,
    ownerId: ev.ownerId,
    calendarName: ev.calendarName || "내 캘린더",
    attendees: ev.attendees || "",
    visibility: ev.visibility === "비공개" ? "비공개" : "공개",
    color: ev.color || EVENT_COLORS[0],
    videoLink: ev.videoLink || "",
    reminder: ev.reminder || "없음",
    attachments: ev.attachments || [],
  };
}

function formToEvent(
  form: EventFormState,
  existingId?: string,
  createdAt?: string,
): CalendarEvent | null {
  if (!form.title.trim() || !form.date || !form.ownerId) return null;
  const endDate =
    form.endDate && form.endDate >= form.date ? form.endDate : form.date;
  return {
    id: existingId ?? `c-${Date.now()}`,
    title: form.title.trim(),
    date: form.date,
    endDate,
    startTime: form.allDay ? "00:00" : form.startTime,
    endTime: form.allDay ? "23:59" : form.endTime,
    allDay: form.allDay,
    location: form.location.trim(),
    description: form.description.trim(),
    ownerId: form.ownerId,
    createdAt: createdAt ?? new Date().toISOString(),
    calendarName: form.calendarName.trim() || "내 캘린더",
    attendees: form.attendees.trim(),
    visibility: form.visibility,
    color: form.color,
    videoLink: form.videoLink.trim(),
    reminder: form.reminder,
    attachments: form.attachments,
  };
}

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: TeamMember[];
  form: EventFormState;
  onChange: (next: EventFormState) => void;
  onSave: (event: CalendarEvent) => void;
  /** 수정 모드일 때 */
  editingId?: string | null;
  editingCreatedAt?: string;
  title?: string;
};

export function EventFormDialog({
  open,
  onOpenChange,
  members,
  form,
  onChange,
  onSave,
  editingId,
  editingCreatedAt,
  title = "새 일정",
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setFileError(null);
    const remaining = MAX_FILES - form.attachments.length;
    if (remaining <= 0) {
      setFileError(`첨부는 최대 ${MAX_FILES}개까지 가능합니다.`);
      return;
    }
    const next: CalendarAttachment[] = [...form.attachments];
    for (const file of Array.from(files).slice(0, remaining)) {
      if (file.size > MAX_FILE_BYTES) {
        setFileError(
          `"${file.name}"은(는) ${formatBytes(MAX_FILE_BYTES)}를 초과합니다.`,
        );
        continue;
      }
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("read failed"));
        reader.readAsDataURL(file);
      });
      next.push({
        id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: file.name,
        size: file.size,
        mimeType: file.type || "application/octet-stream",
        dataUrl,
      });
    }
    onChange({ ...form, attachments: next });
    if (fileRef.current) fileRef.current.value = "";
  }

  function save() {
    const event = formToEvent(form, editingId ?? undefined, editingCreatedAt);
    if (!event) return;
    onSave(event);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-3.5 py-1">
          <div className="grid gap-1.5">
            <Label htmlFor="ev-title">제목</Label>
            <Input
              id="ev-title"
              placeholder="제목을 입력해 주세요"
              value={form.title}
              onChange={(e) => onChange({ ...form, title: e.target.value })}
            />
          </div>

          <div className="grid gap-1.5">
            <div className="flex items-center justify-between">
              <Label>일시</Label>
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={form.allDay}
                  onChange={(e) =>
                    onChange({ ...form, allDay: e.target.checked })
                  }
                />
                종일
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Input
                type="date"
                value={form.date}
                onChange={(e) => {
                  const date = e.target.value;
                  onChange({
                    ...form,
                    date,
                    endDate: form.endDate < date ? date : form.endDate,
                  });
                }}
              />
              {!form.allDay ? (
                <Input
                  type="time"
                  value={form.startTime}
                  onChange={(e) =>
                    onChange({ ...form, startTime: e.target.value })
                  }
                />
              ) : (
                <div className="hidden sm:block" />
              )}
              <Input
                type="date"
                value={form.endDate}
                min={form.date}
                onChange={(e) =>
                  onChange({ ...form, endDate: e.target.value })
                }
              />
              {!form.allDay ? (
                <Input
                  type="time"
                  value={form.endTime}
                  onChange={(e) =>
                    onChange({ ...form, endTime: e.target.value })
                  }
                />
              ) : null}
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="ev-cal">캘린더</Label>
            <select
              id="ev-cal"
              className="h-9 rounded-md border border-border bg-background px-2 text-sm"
              value={form.calendarName}
              onChange={(e) =>
                onChange({ ...form, calendarName: e.target.value })
              }
            >
              {CALENDAR_NAMES.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-1.5">
            <Label>색상</Label>
            <div className="flex flex-wrap gap-2">
              {EVENT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`색상 ${c}`}
                  className={cn(
                    "size-6 rounded-full border-2 transition",
                    form.color === c
                      ? "border-foreground scale-110"
                      : "border-transparent",
                  )}
                  style={{ backgroundColor: c }}
                  onClick={() => onChange({ ...form, color: c })}
                />
              ))}
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="ev-attendees">참석자</Label>
            <Input
              id="ev-attendees"
              placeholder="참석자를 입력해 주세요 (쉼표로 구분)"
              value={form.attendees}
              onChange={(e) =>
                onChange({ ...form, attendees: e.target.value })
              }
            />
          </div>

          <div className="grid gap-1.5">
            <Label>등록 담당자</Label>
            <select
              className="h-9 rounded-md border border-border bg-background px-2 text-sm"
              value={form.ownerId}
              onChange={(e) =>
                onChange({ ...form, ownerId: e.target.value })
              }
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} · {m.role}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="ev-video">화상 회의</Label>
            <Input
              id="ev-video"
              placeholder="화상 회의 링크를 입력해 주세요"
              value={form.videoLink}
              onChange={(e) =>
                onChange({ ...form, videoLink: e.target.value })
              }
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="ev-loc">장소</Label>
            <Input
              id="ev-loc"
              placeholder="장소를 입력해 주세요"
              value={form.location}
              onChange={(e) =>
                onChange({ ...form, location: e.target.value })
              }
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="ev-desc">설명</Label>
            <Textarea
              id="ev-desc"
              placeholder="일정 내용을 구체적으로 적어 주세요"
              rows={4}
              value={form.description}
              onChange={(e) =>
                onChange({ ...form, description: e.target.value })
              }
            />
          </div>

          <div className="grid gap-1.5">
            <Label>첨부 파일</Label>
            <input
              ref={fileRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => void handleFiles(e.target.files)}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-fit"
              onClick={() => fileRef.current?.click()}
            >
              <Paperclip data-icon="inline-start" />
              파일 첨부
            </Button>
            <p className="text-[11px] text-muted-foreground">
              파일당 최대 {formatBytes(MAX_FILE_BYTES)} · 최대 {MAX_FILES}개
              (브라우저에 저장)
            </p>
            {fileError ? (
              <p className="text-xs text-dh-red">{fileError}</p>
            ) : null}
            {form.attachments.length > 0 ? (
              <ul className="space-y-1.5">
                {form.attachments.map((att) => (
                  <li
                    key={att.id}
                    className="flex items-center justify-between gap-2 rounded-md border border-border bg-muted/30 px-2.5 py-1.5 text-xs"
                  >
                    <a
                      href={att.dataUrl}
                      download={att.name}
                      className="min-w-0 truncate font-medium text-dh-real hover:underline"
                    >
                      {att.name}
                      <span className="ml-1.5 font-normal text-muted-foreground">
                        ({formatBytes(att.size)})
                      </span>
                    </a>
                    <button
                      type="button"
                      className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-dh-red"
                      aria-label="첨부 삭제"
                      onClick={() =>
                        onChange({
                          ...form,
                          attachments: form.attachments.filter(
                            (a) => a.id !== att.id,
                          ),
                        })
                      }
                    >
                      <X className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="ev-reminder">알림</Label>
              <select
                id="ev-reminder"
                className="h-9 rounded-md border border-border bg-background px-2 text-sm"
                value={form.reminder}
                onChange={(e) =>
                  onChange({ ...form, reminder: e.target.value })
                }
              >
                {REMINDER_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label>공개 설정</Label>
              <div className="flex h-9 items-center gap-4 text-sm">
                {(["공개", "비공개"] as const).map((v) => (
                  <label key={v} className="flex items-center gap-1.5">
                    <input
                      type="radio"
                      name="ev-visibility"
                      checked={form.visibility === v}
                      onChange={() =>
                        onChange({ ...form, visibility: v })
                      }
                    />
                    {v}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button onClick={save} disabled={!form.title.trim()}>
            저장
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** 일정 상세 보기 (첨부 다운로드 포함) */
export function EventDetailDialog({
  event,
  ownerName,
  open,
  onOpenChange,
  onEdit,
  onDelete,
  footerExtra,
}: {
  event: CalendarEvent | null;
  ownerName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: () => void;
  onDelete?: () => void;
  footerExtra?: ReactNode;
}) {
  if (!event) return null;
  const period =
    event.endDate && event.endDate !== event.date
      ? `${event.date} ~ ${event.endDate}`
      : event.date;
  const isWeekly = event.source === "weekly" || event.id.startsWith("weekly-");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span
              className="inline-block size-3 shrink-0 rounded-full"
              style={{ backgroundColor: event.color || "#1f4889" }}
            />
            {event.title}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2 text-sm">
          {isWeekly ? (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-200">
              주간업무계획에서 가져온 기한입니다. 캘린더에서 직접 수정할 수
              없습니다.
            </p>
          ) : null}
          <p>
            <span className="text-muted-foreground">일시 · </span>
            {period}
            {" · "}
            {event.allDay
              ? "종일"
              : `${event.startTime} ~ ${event.endTime}`}
          </p>
          <p>
            <span className="text-muted-foreground">캘린더 · </span>
            {event.calendarName}
          </p>
          {event.attendees ? (
            <p>
              <span className="text-muted-foreground">참석자 · </span>
              {event.attendees}
            </p>
          ) : null}
          {event.location ? (
            <p>
              <span className="text-muted-foreground">장소 · </span>
              {event.location}
            </p>
          ) : null}
          {event.videoLink ? (
            <p>
              <span className="text-muted-foreground">화상 · </span>
              <a
                href={event.videoLink}
                target="_blank"
                rel="noreferrer"
                className="text-dh-real hover:underline"
              >
                {event.videoLink}
              </a>
            </p>
          ) : null}
          {event.description ? (
            <p className="whitespace-pre-wrap rounded-md bg-muted/40 p-2.5 text-sm">
              {event.description}
            </p>
          ) : null}
          <p>
            <span className="text-muted-foreground">등록 · </span>
            {ownerName ?? "미지정"} · {event.visibility} · 알림{" "}
            {event.reminder}
          </p>
          {event.attachments?.length ? (
            <ul className="space-y-1 border-t border-border pt-2">
              {event.attachments.map((att) => (
                <li key={att.id}>
                  <a
                    href={att.dataUrl}
                    download={att.name}
                    className="inline-flex items-center gap-1.5 text-dh-real hover:underline"
                  >
                    <Paperclip className="size-3.5" />
                    {att.name}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          <div className="flex flex-wrap gap-2">{footerExtra}</div>
          <div className="flex flex-wrap gap-2">
            {onDelete ? (
              <Button
                variant="outline"
                className="text-dh-red"
                onClick={onDelete}
              >
                <Trash2 data-icon="inline-start" />
                삭제
              </Button>
            ) : null}
            {onEdit ? <Button onClick={onEdit}>수정</Button> : null}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
