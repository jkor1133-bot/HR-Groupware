"use client";

import { useCallback, useEffect, useState } from "react";
import { buildWorkflowSeed } from "@/data/workflow-seed";
import type { WorkflowBundle, WorkflowProcess } from "@/lib/types";

const STORAGE_KEY = "hr-dashboard-workflows-v1";

function load(): WorkflowBundle {
  if (typeof window === "undefined") return buildWorkflowSeed();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return buildWorkflowSeed();
    const parsed = JSON.parse(raw) as WorkflowBundle;
    if (!parsed?.processes) return buildWorkflowSeed();
    return parsed;
  } catch {
    return buildWorkflowSeed();
  }
}

export function useWorkflows() {
  const [bundle, setBundle] = useState<WorkflowBundle | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setBundle(load());
    setHydrated(true);
  }, []);

  const persist = useCallback((next: WorkflowBundle) => {
    const stamped = { ...next, updatedAt: new Date().toISOString() };
    setBundle(stamped);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stamped));
  }, []);

  const upsertProcess = useCallback(
    (process: WorkflowProcess) => {
      if (!bundle) return;
      const exists = bundle.processes.some((p) => p.id === process.id);
      persist({
        ...bundle,
        processes: exists
          ? bundle.processes.map((p) => (p.id === process.id ? process : p))
          : [...bundle.processes, process],
      });
    },
    [bundle, persist],
  );

  const deleteProcess = useCallback(
    (id: string) => {
      if (!bundle) return;
      persist({
        ...bundle,
        processes: bundle.processes.filter((p) => p.id !== id),
      });
    },
    [bundle, persist],
  );

  const resetToSeed = useCallback(() => {
    persist(buildWorkflowSeed());
  }, [persist]);

  return {
    hydrated,
    processes: bundle?.processes ?? [],
    upsertProcess,
    deleteProcess,
    resetToSeed,
    updatedAt: bundle?.updatedAt ?? null,
  };
}
