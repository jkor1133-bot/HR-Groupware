"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, FileWarning, Settings2 } from "lucide-react";
import { useLocalList } from "@/hooks/use-local-list";
import {
  CONTRACTS_STORAGE_KEY,
  PERMITS_STORAGE_KEY,
  loadContracts,
  loadPermits,
} from "@/lib/hr-ops-storage";
import { formatDaysLeft, isUrgentDeadline, daysUntil } from "@/lib/period";

export function ContractsAlertsPanel() {
  const contracts = useLocalList(CONTRACTS_STORAGE_KEY, loadContracts);
  const permits = useLocalList(PERMITS_STORAGE_KEY, loadPermits);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
  }, []);

  const dueContracts = useMemo(() => {
    if (!now) return [];
    return contracts.items
      .filter((c) => isUrgentDeadline(c.endDate, 31, now))
      .sort((a, b) => a.endDate.localeCompare(b.endDate));
  }, [contracts.items, now]);

  const duePermits = useMemo(() => {
    if (!now) return [];
    return permits.items
      .filter((p) => isUrgentDeadline(p.endDate, 31, now))
      .sort((a, b) => a.endDate.localeCompare(b.endDate));
  }, [permits.items, now]);

  return (
    <section className="flex h-full min-h-0 flex-col rounded-xl border border-border bg-card shadow-sm">
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-2 border-b border-border px-4 py-3 sm:px-5">
        <div>
          <h2 className="flex items-center gap-2 font-heading text-base font-semibold text-dh-deep dark:text-dh-light">
            <FileWarning className="size-4 text-dh-sea" />
            계약 · 인허가 알림
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            종료 1개월 이내·만료 초과 · 인사총무 이력에서 관리
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Link
            href="/hr-records?main=hr&sub=contracts"
            className="inline-flex h-7 items-center gap-1 rounded-lg border border-border bg-background px-2.5 text-[0.8rem] font-medium hover:bg-muted"
          >
            <Settings2 className="size-3.5" />
            계약직 현황
          </Link>
          <Link
            href="/hr-records?main=ga&sub=permits"
            className="inline-flex h-7 items-center gap-1 rounded-lg border border-border bg-background px-2.5 text-[0.8rem] font-medium hover:bg-muted"
          >
            <Settings2 className="size-3.5" />
            인허가 현황
          </Link>
        </div>
      </div>

      {!now ? (
        <p className="flex flex-1 items-center p-5 text-sm text-muted-foreground">
          불러오는 중…
        </p>
      ) : (
        <div className="grid min-h-0 flex-1 gap-4 p-4 @md/app:grid-cols-2 @sm/app:p-5">
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-dh-red">
              <AlertTriangle className="size-3.5" />
              근로계약 만료 임박 ({dueContracts.length})
            </p>
            {dueContracts.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
                1개월 내 만료·초과 계약 없음
              </p>
            ) : (
              <ul className="space-y-1.5">
                {dueContracts.map((c) => {
                  const left = now ? daysUntil(c.endDate, now) : 0;
                  return (
                  <li
                    key={c.id}
                    className="rounded-md border border-red-200 bg-[#fceeee] px-3 py-2 text-sm dark:border-red-900 dark:bg-red-950/30"
                  >
                    <p className="flex items-center justify-between gap-2 font-medium">
                      <span>
                        {c.employeeName} · {c.jobTrack}
                      </span>
                      <span className="shrink-0 text-[11px] font-semibold text-dh-red">
                        {formatDaysLeft(left)}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {c.contractType} · 종료 {c.endDate}
                    </p>
                  </li>
                  );
                })}
              </ul>
            )}
          </div>
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
              <AlertTriangle className="size-3.5" />
              인허가 종료 임박 ({duePermits.length})
            </p>
            {duePermits.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
                1개월 내 종료·초과 인허가 없음
              </p>
            ) : (
              <ul className="space-y-1.5">
                {duePermits.map((p) => {
                  const left = now ? daysUntil(p.endDate, now) : 0;
                  return (
                  <li
                    key={p.id}
                    className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm dark:border-amber-900 dark:bg-amber-950/30"
                  >
                    <p className="flex items-center justify-between gap-2 font-medium">
                      <span>{p.name}</span>
                      <span className="shrink-0 text-[11px] font-semibold text-amber-800 dark:text-amber-200">
                        {formatDaysLeft(left)}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {p.authority} · 종료 {p.endDate}
                    </p>
                  </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
