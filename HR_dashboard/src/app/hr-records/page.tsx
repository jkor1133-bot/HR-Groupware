"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { HrRecordsView } from "@/components/hr-records/hr-records-view";

type MainTab = "hr" | "ga" | "it";

function HrRecordsInner() {
  const sp = useSearchParams();
  const mainRaw = sp.get("main");
  const main: MainTab =
    mainRaw === "ga" || mainRaw === "it" || mainRaw === "hr" ? mainRaw : "hr";

  return <HrRecordsView initialMain={main} initialSub={sp.get("sub") ?? undefined} />;
}

export default function HrRecordsPage() {
  return (
    <Suspense
      fallback={
        <p className="p-6 text-sm text-muted-foreground">불러오는 중…</p>
      }
    >
      <HrRecordsInner />
    </Suspense>
  );
}
