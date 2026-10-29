"use client";

import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  RotateCcw,
  Settings2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  HR_WIDGET_META,
  OPS_WIDGET_META,
} from "@/data/home-layout";
import { useHomeLayout } from "@/hooks/use-home-layout";
import type { HomeViewId, HomeWidgetConfig, HomeWidgetId } from "@/lib/types";
import { cn } from "@/lib/utils";

function WidgetEditor({
  view,
  widgets,
}: {
  view: HomeViewId;
  widgets: HomeWidgetConfig[];
}) {
  const { updateWidget, moveWidget, setWidgetSize } = useHomeLayout();

  function metaOf(id: HomeWidgetId) {
    if (view === "ops" && id in OPS_WIDGET_META) {
      return OPS_WIDGET_META[id as keyof typeof OPS_WIDGET_META];
    }
    if (view === "hr" && id in HR_WIDGET_META) {
      return HR_WIDGET_META[id as keyof typeof HR_WIDGET_META];
    }
    return null;
  }

  return (
    <ul className="divide-y divide-border rounded-xl border border-border bg-card shadow-sm">
      {widgets.map((w, idx) => {
        const info = metaOf(w.id);
        if (!info) return null;
        return (
          <li
            key={w.id}
            className={cn(
              "flex flex-wrap items-center gap-3 px-4 py-3",
              !w.visible && "opacity-60",
            )}
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">{info.label}</p>
              <p className="text-xs text-muted-foreground">{info.description}</p>
            </div>

            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={w.visible}
                onChange={(e) =>
                  updateWidget(view, w.id, { visible: e.target.checked })
                }
                className="size-3.5 accent-dh-real"
              />
              표시
            </label>

            <select
              className="h-8 rounded-md border border-border bg-background px-2 text-xs"
              value={w.size}
              onChange={(e) =>
                setWidgetSize(
                  view,
                  w.id,
                  e.target.value as HomeWidgetConfig["size"],
                )
              }
              title="가로 크기"
            >
              <option value="half">반폭</option>
              <option value="full">전체폭</option>
            </select>

            <div className="flex gap-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 px-2"
                disabled={idx === 0}
                onClick={() => moveWidget(view, w.id, -1)}
                title="위로"
              >
                <ArrowUp className="size-3.5" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 px-2"
                disabled={idx === widgets.length - 1}
                onClick={() => moveWidget(view, w.id as HomeWidgetId, 1)}
                title="아래로"
              >
                <ArrowDown className="size-3.5" />
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export default function SettingsPage() {
  const {
    hydrated,
    prefs,
    sortedOps,
    sortedHr,
    setDefaultView,
    reset,
  } = useHomeLayout();

  if (!hydrated) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-sm text-muted-foreground">
        설정을 불러오는 중…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2 text-dh-deep dark:text-dh-sky">
            <Settings2 className="size-4" />
            <span className="text-xs font-semibold tracking-wide">설정</span>
          </div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-dh-deep dark:text-dh-light">
            홈화면 편집
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            메인 위젯의 표시 여부·순서·크기(반폭/전체폭)를 개인별로 저장합니다.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/"
            className="inline-flex h-7 items-center rounded-lg border border-border bg-background px-2.5 text-[0.8rem] hover:bg-muted"
          >
            메인으로
          </Link>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              if (window.confirm("홈화면 배치를 기본값으로 되돌릴까요?")) {
                reset();
              }
            }}
          >
            <RotateCcw className="size-3.5" />
            기본값
          </Button>
        </div>
      </div>

      <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-foreground">기본 시작 화면</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          홈에 들어올 때 먼저 보일 화면을 고릅니다.
        </p>
        <div className="mt-3 inline-flex rounded-lg border border-border p-1">
          <button
            type="button"
            onClick={() => setDefaultView("ops")}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm",
              prefs.defaultView === "ops"
                ? "bg-dh-real text-white"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            운영 현황
          </button>
          <button
            type="button"
            onClick={() => setDefaultView("hr")}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm",
              prefs.defaultView === "hr"
                ? "bg-dh-real text-white"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            HR Dashboard
          </button>
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            1. 운영 현황 위젯
          </h2>
          <p className="text-xs text-muted-foreground">
            주간업무 · 캘린더 · 연차 · 계약/인허가 (인건비·근무시간은 기본 숨김)
          </p>
        </div>
        <WidgetEditor view="ops" widgets={sortedOps} />
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            2. HR Dashboard 위젯
          </h2>
          <p className="text-xs text-muted-foreground">
            KPI · 조직 인원 · 인력 구성 · 보상 요약
          </p>
        </div>
        <WidgetEditor view="hr" widgets={sortedHr} />
      </section>
    </div>
  );
}
