"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LayoutDashboard, Settings2 } from "lucide-react";
import { CalendarPanel } from "@/components/home/calendar-panel";
import { ContractsAlertsPanel } from "@/components/home/contracts-alerts-panel";
import { HrDashboardView } from "@/components/home/hr-dashboard-view";
import { LaborCostPanel } from "@/components/home/labor-cost-panel";
import { LeavePanel } from "@/components/home/leave-panel";
import { ScheduleOverview } from "@/components/home/schedule-overview";
import { WorkHoursPanel } from "@/components/home/work-hours-panel";
import { useHomeLayout } from "@/hooks/use-home-layout";
import type { HomeViewId, HomeWidgetConfig, HomeWidgetId } from "@/lib/types";
import { cn } from "@/lib/utils";

function widgetClass(size: HomeWidgetConfig["size"]) {
  return size === "full" ? "@lg/app:col-span-2" : "";
}

function OpsWidgets() {
  const { hydrated, sortedOps } = useHomeLayout();

  if (!hydrated) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-sm text-muted-foreground">
        홈 화면을 불러오는 중…
      </div>
    );
  }

  const visible = sortedOps.filter((w) => w.visible);

  function render(id: HomeWidgetId) {
    switch (id) {
      case "weekly_plans":
        return <ScheduleOverview />;
      case "calendar":
        return <CalendarPanel />;
      case "leave":
        return <LeavePanel />;
      case "contracts_alerts":
        return <ContractsAlertsPanel />;
      case "labor_cost":
        return <LaborCostPanel />;
      case "work_hours":
        return <WorkHoursPanel />;
      default:
        return null;
    }
  }

  if (!visible.length) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        표시할 운영 위젯이 없습니다.{" "}
        <Link href="/settings" className="text-dh-real underline">
          홈화면 편집
        </Link>
        에서 켜주세요.
      </div>
    );
  }

  return (
    <div className="grid items-stretch gap-4 @lg/app:grid-cols-2">
      {visible.map((w) => (
        <div
          key={w.id}
          className={cn("flex h-full min-h-0 flex-col", widgetClass(w.size))}
        >
          {render(w.id)}
        </div>
      ))}
    </div>
  );
}

export function HomeDashboard() {
  const { hydrated, prefs } = useHomeLayout();
  const [view, setView] = useState<HomeViewId>("ops");

  useEffect(() => {
    if (hydrated) setView(prefs.defaultView);
  }, [hydrated, prefs.defaultView]);

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight text-dh-deep dark:text-dh-light sm:text-2xl">
            인사 그룹웨어
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            운영 현황과 인사자료를 두 화면으로 나눴습니다. 배치·크기는 설정에서
            편집할 수 있습니다.
          </p>
        </div>
        <Link
          href="/settings"
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-sm transition hover:bg-muted"
        >
          <Settings2 className="size-3.5" />
          홈화면 편집
        </Link>
      </div>

      <div className="inline-flex rounded-lg border border-border bg-card p-1 shadow-sm">
        <button
          type="button"
          onClick={() => setView("ops")}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition",
            view === "ops"
              ? "bg-dh-real text-white"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <LayoutDashboard className="size-3.5" />
          운영 현황
        </button>
        <button
          type="button"
          onClick={() => setView("hr")}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition",
            view === "hr"
              ? "bg-dh-real text-white"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          HR Dashboard
        </button>
      </div>

      {view === "ops" ? <OpsWidgets /> : <HrDashboardView />}
    </div>
  );
}
