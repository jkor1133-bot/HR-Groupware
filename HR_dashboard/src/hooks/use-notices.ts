"use client";

import { useCallback, useEffect, useState } from "react";
import type { NoticeItem } from "@/lib/types";

const POLL_MS = 10 * 60 * 1000;

type NoticesState = {
  items: NoticeItem[];
  fetchedAt: string | null;
  loading: boolean;
  error: string | null;
  source: string | null;
  warning: string | null;
};

export function useNotices() {
  const [state, setState] = useState<NoticesState>({
    items: [],
    fetchedAt: null,
    loading: true,
    error: null,
    source: null,
    warning: null,
  });

  const refresh = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const res = await fetch("/api/notices", { cache: "no-store" });
      if (!res.ok) throw new Error("공지사항을 불러오지 못했습니다.");
      const data = (await res.json()) as {
        items: NoticeItem[];
        fetchedAt: string;
        source?: string;
        warning?: string;
        note?: string;
      };
      setState({
        items: data.items,
        fetchedAt: data.fetchedAt,
        loading: false,
        error: null,
        source: data.source ?? null,
        warning: data.warning ?? data.note ?? null,
      });
    } catch (e) {
      setState((s) => ({
        ...s,
        loading: false,
        error: e instanceof Error ? e.message : "오류가 발생했습니다.",
      }));
    }
  }, []);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => {
      void refresh();
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [refresh]);

  return { ...state, refresh };
}
