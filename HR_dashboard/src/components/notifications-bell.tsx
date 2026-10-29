"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import {
  AlertTriangle,
  Bell,
  ClipboardList,
  FileWarning,
  ScrollText,
} from "lucide-react";
import { useDeadlineAlerts } from "@/hooks/use-deadline-alerts";
import type { DeadlineAlertKind } from "@/lib/deadline-alerts";
import { cn } from "@/lib/utils";

const KIND_META: Record<
  DeadlineAlertKind,
  { label: string; Icon: typeof ClipboardList }
> = {
  task: { label: "업무", Icon: ClipboardList },
  contract: { label: "계약", Icon: FileWarning },
  permit: { label: "인허가", Icon: ScrollText },
};

export function NotificationsBell({
  className,
  iconClassName,
  compact = false,
}: {
  className?: string;
  iconClassName?: string;
  compact?: boolean;
}) {
  const { alerts, count, overdueCount, hydrated } = useDeadlineAlerts();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const badge = hydrated && count > 0;

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        className={cn(
          "relative rounded-md text-white/85 transition hover:bg-white/10 hover:text-white",
          compact ? "p-1.5" : "p-2",
        )}
        aria-label={count > 0 ? `알림 ${count}건` : "알림"}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <Bell className={iconClassName ?? (compact ? "size-4" : "size-[18px]")} />
        {badge ? (
          <span
            className={cn(
              "absolute flex items-center justify-center rounded-full bg-dh-red font-semibold text-white",
              count > 9
                ? "top-0.5 right-0 min-w-[1.05rem] px-0.5 text-[9px] leading-none"
                : compact
                  ? "top-1 right-1 size-1.5"
                  : "top-1.5 right-1.5 size-1.5",
              count <= 9 && "ring-2 ring-dh-deep",
            )}
          >
            {count > 9 ? (count > 99 ? "99+" : String(count)) : null}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-label="기한 알림"
          className={cn(
            "absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-xl shadow-black/20",
            compact && "right-0",
          )}
        >
          <div className="border-b border-border px-3.5 py-2.5">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-dh-deep dark:text-dh-light">
              <AlertTriangle className="size-3.5 text-dh-red" />
              기한 알림
              {hydrated ? (
                <span className="ml-auto text-xs font-medium text-muted-foreground">
                  {count}건
                  {overdueCount > 0 ? ` · 초과 ${overdueCount}` : ""}
                </span>
              ) : null}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              미완료 업무(7일)·계약·인허가(1개월) 만료 임박·초과
            </p>
          </div>

          <div className="max-h-[min(24rem,55vh)] overflow-y-auto">
            {!hydrated ? (
              <p className="px-3.5 py-8 text-center text-sm text-muted-foreground">
                불러오는 중…
              </p>
            ) : alerts.length === 0 ? (
              <p className="px-3.5 py-8 text-center text-sm text-muted-foreground">
                확인할 기한 알림이 없습니다
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {alerts.map((a) => {
                  const meta = KIND_META[a.kind];
                  const Icon = meta.Icon;
                  return (
                    <li key={a.id}>
                      <Link
                        href={a.href}
                        onClick={() => setOpen(false)}
                        className="flex gap-2.5 px-3.5 py-2.5 transition hover:bg-muted/70"
                      >
                        <span
                          className={cn(
                            "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md",
                            a.severity === "overdue"
                              ? "bg-[#fceeee] text-dh-red dark:bg-red-950/40"
                              : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
                          )}
                        >
                          <Icon className="size-3.5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-start justify-between gap-2">
                            <span className="truncate text-sm font-medium text-foreground">
                              {a.title}
                            </span>
                            <span
                              className={cn(
                                "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold",
                                a.severity === "overdue"
                                  ? "bg-dh-red/10 text-dh-red"
                                  : "bg-amber-500/15 text-amber-800 dark:text-amber-200",
                              )}
                            >
                              {a.daysLeftLabel}
                            </span>
                          </span>
                          <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                            <span className="font-medium text-dh-sea">
                              {meta.label}
                            </span>
                            {" · "}
                            {a.detail}
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
