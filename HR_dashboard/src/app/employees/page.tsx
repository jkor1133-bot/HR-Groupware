"use client";

import { EmployeeRosterPanel } from "@/components/employees/employee-roster-panel";

export default function EmployeesPage() {
  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div>
        <h1 className="font-heading text-xl font-semibold text-dh-deep dark:text-dh-light sm:text-2xl">
          사원명부
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          임직원 마스터를 관리하고, 인사총무 이력 등에서 불러와 사용합니다.
        </p>
      </div>
      <EmployeeRosterPanel />
    </div>
  );
}
