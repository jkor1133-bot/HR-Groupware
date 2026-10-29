import { WeeklyPlanBoard } from "@/components/weekly-plan-board";

export default function WeeklyPlansPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-xl font-semibold tracking-tight text-dh-deep dark:text-dh-light sm:text-2xl">
          주간업무계획 등록
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          담당자가 주간 업무를 직접 등록·수정하고 진행 상태를 관리합니다.
        </p>
      </div>
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <WeeklyPlanBoard />
      </div>
    </div>
  );
}
