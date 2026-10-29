"use client";

import { useEffect, useMemo, useState } from "react";
import { buildDeadlineAlerts } from "@/lib/deadline-alerts";
import { useLocalList } from "@/hooks/use-local-list";
import { useMembers } from "@/hooks/use-members";
import { useWeeklyPlans } from "@/hooks/use-weekly-plans";
import {
  CONTRACTS_STORAGE_KEY,
  PERMITS_STORAGE_KEY,
  loadContracts,
  loadPermits,
} from "@/lib/hr-ops-storage";

export function useDeadlineAlerts() {
  const { tasks, hydrated: tasksHydrated } = useWeeklyPlans();
  const { members, hydrated: membersHydrated } = useMembers();
  const contracts = useLocalList(CONTRACTS_STORAGE_KEY, loadContracts);
  const permits = useLocalList(PERMITS_STORAGE_KEY, loadPermits);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
  }, []);

  const hydrated =
    !!now &&
    tasksHydrated &&
    membersHydrated &&
    contracts.hydrated &&
    permits.hydrated;

  const alerts = useMemo(() => {
    if (!now) return [];
    return buildDeadlineAlerts({
      tasks,
      members,
      contracts: contracts.items,
      permits: permits.items,
      now,
    });
  }, [now, tasks, members, contracts.items, permits.items]);

  const overdueCount = useMemo(
    () => alerts.filter((a) => a.severity === "overdue").length,
    [alerts],
  );

  return {
    alerts,
    count: alerts.length,
    overdueCount,
    hydrated,
  };
}
