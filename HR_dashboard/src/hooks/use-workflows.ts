"use client";

import { useCallback, useEffect, useState } from "react";
import { buildWorkflowSeed } from "@/data/workflow-seed";
import type {
  WorkflowBundle,
  WorkflowDomain,
  WorkflowProcess,
} from "@/lib/types";

const STORAGE_KEY = "hr-dashboard-workflows-v4";
const LEGACY_KEYS = [
  "hr-dashboard-workflows-v3",
  "hr-dashboard-workflows-v2",
  "hr-dashboard-workflows-v1",
];

const DOMAINS: WorkflowDomain[] = ["hr", "ga", "planning"];

type LegacyProcess = WorkflowProcess & {
  standardLabel?: string;
  attachments?: WorkflowProcess["steps"][number]["attachments"];
  changeHistory?: WorkflowProcess["steps"][number]["changeHistory"];
};

function normalizeProcess(raw: LegacyProcess): WorkflowProcess {
  let domain: WorkflowDomain = DOMAINS.includes(raw.domain)
    ? raw.domain
    : "hr";
  if (raw.id === "wf3" || raw.category === "급여" || raw.name.includes("급여")) {
    domain = "ga";
  }

  // 예전 프로세스 단위 기준 → 첫 단계로 이전
  const legacyLabel = raw.standardLabel ?? "";
  const legacyAtt = Array.isArray(raw.attachments) ? raw.attachments : [];
  const legacyHist = Array.isArray(raw.changeHistory) ? raw.changeHistory : [];

  const steps = (raw.steps ?? []).map((s, idx) => {
    const hasOwn =
      Boolean(s.standardLabel) ||
      (s.attachments?.length ?? 0) > 0 ||
      (s.changeHistory?.length ?? 0) > 0;
    const migrate = idx === 0 && !hasOwn;
    return {
      ...s,
      dueLabel: s.dueLabel ?? "",
      ownerId: s.ownerId ?? "",
      stage: s.stage || 1,
      standardLabel: s.standardLabel ?? (migrate ? legacyLabel : ""),
      attachments: Array.isArray(s.attachments)
        ? s.attachments
        : migrate
          ? legacyAtt
          : [],
      changeHistory: Array.isArray(s.changeHistory)
        ? s.changeHistory
        : migrate
          ? legacyHist
          : [],
    };
  });

  return {
    id: raw.id,
    name: raw.name,
    domain,
    category: raw.category,
    description: raw.description,
    steps,
    updatedAt: raw.updatedAt,
  };
}

function load(): WorkflowBundle {
  if (typeof window === "undefined") return buildWorkflowSeed();
  try {
    const raw =
      window.localStorage.getItem(STORAGE_KEY) ||
      LEGACY_KEYS.map((k) => window.localStorage.getItem(k)).find(Boolean);
    if (!raw) return buildWorkflowSeed();
    const parsed = JSON.parse(raw) as WorkflowBundle;
    if (!parsed?.processes) return buildWorkflowSeed();
    return {
      ...parsed,
      version: 4,
      processes: parsed.processes.map((p) =>
        normalizeProcess(p as LegacyProcess),
      ),
    };
  } catch {
    return buildWorkflowSeed();
  }
}

export function useWorkflows() {
  const [bundle, setBundle] = useState<WorkflowBundle | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const next = load();
    setBundle(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setHydrated(true);
  }, []);

  const persist = useCallback((next: WorkflowBundle) => {
    const stamped = {
      ...next,
      version: 4,
      updatedAt: new Date().toISOString(),
      processes: next.processes.map(normalizeProcess),
    };
    setBundle(stamped);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stamped));
  }, []);

  const upsertProcess = useCallback(
    (process: WorkflowProcess) => {
      if (!bundle) return;
      const next = normalizeProcess(process);
      const exists = bundle.processes.some((p) => p.id === next.id);
      persist({
        ...bundle,
        processes: exists
          ? bundle.processes.map((p) => (p.id === next.id ? next : p))
          : [...bundle.processes, next],
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
