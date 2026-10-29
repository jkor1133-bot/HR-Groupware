"use client";

import { useMemo, useState } from "react";
import { Bell, ExternalLink, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNotices } from "@/hooks/use-notices";
import type { NoticeBoard } from "@/lib/types";
import { cn } from "@/lib/utils";

const FILTERS: NoticeBoard[] = [
  "전체",
  "회사",
  "그룹",
  "인사총무",
  "차세대ERP",
];

function sourceLabel(source: string | null) {
  if (source === "dooray") return "Dooray 연동";
  if (source === "groupware") return "그룹웨어 연동";
  if (source === "mock-fallback") return "연동 실패 · 샘플 표시";
  if (source === "mock") return "샘플 데이터";
  return "그룹웨어 공지 연동";
}

export function NoticesPanel() {
  const { items, fetchedAt, loading, error, refresh, source, warning } =
    useNotices();
  const [board, setBoard] = useState<NoticeBoard>("전체");

  const filtered = useMemo(() => {
    if (board === "전체") return items;
    return items.filter((n) => n.board === board);
  }, [board, items]);

  const fetchedLabel = fetchedAt
    ? new Date(fetchedAt).toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

  return (
    <section className="rounded-xl border border-border bg-card shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
        <div>
          <h2 className="flex items-center gap-2 font-heading text-base font-semibold text-dh-deep dark:text-dh-light">
            <Bell className="size-4 text-dh-sea" />
            사내 소식 · 공지사항
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {sourceLabel(source)} · 10분마다 자동 갱신 (기준 {fetchedLabel})
          </p>
          {warning ? (
            <p className="mt-1 max-w-xl text-xs text-amber-700 dark:text-amber-300">
              {warning}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refresh()}
            disabled={loading}
          >
            <RefreshCw
              className={cn("size-3.5", loading && "animate-spin")}
              data-icon="inline-start"
            />
            새로고침
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 border-b border-border px-4 py-2.5 sm:px-5">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setBoard(f)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition",
              board === f
                ? "bg-dh-real text-white"
                : "bg-muted text-muted-foreground hover:bg-dh-light/30 hover:text-dh-real",
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {error ? (
        <p className="px-5 py-4 text-sm text-dh-red">{error}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="gw-data-table w-full min-w-[480px] text-sm">
            <thead>
              <tr className="bg-muted/60 text-xs text-muted-foreground">
                <th className="px-4 py-2.5 font-medium sm:px-5">게시판</th>
                <th className="px-4 py-2.5 text-left font-medium">제목</th>
                <th className="px-4 py-2.5 font-medium sm:px-5">날짜</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="px-5 py-10 text-center text-muted-foreground"
                  >
                    {loading
                      ? "공지사항을 불러오는 중…"
                      : "등록된 공지가 없습니다."}
                  </td>
                </tr>
              ) : (
                filtered.map((n, i) => (
                  <tr
                    key={n.id}
                    className={cn(
                      "border-t border-border/70",
                      i % 2 === 1 && "bg-muted/30",
                    )}
                  >
                    <td className="px-4 py-2.5 whitespace-nowrap text-dh-real sm:px-5">
                      {n.board}
                    </td>
                    <td className="px-4 py-2.5 text-left font-medium text-foreground">
                      {n.url ? (
                        <a
                          href={n.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 hover:text-dh-real hover:underline"
                        >
                          {n.title}
                          <ExternalLink className="size-3 opacity-50" />
                        </a>
                      ) : (
                        n.title
                      )}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-muted-foreground sm:px-5">
                      {n.date}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
