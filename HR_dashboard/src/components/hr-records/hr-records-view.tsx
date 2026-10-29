"use client";

import { useMemo, useState } from "react";
import { FolderKanban } from "lucide-react";
import { ContractsDbPanel } from "@/components/hr-records/contracts-db-panel";
import { PermitsDbPanel } from "@/components/hr-records/permits-db-panel";
import { PromotionPointsPanel } from "@/components/hr-records/promotion-points-panel";
import { SimpleRecordsPanel } from "@/components/hr-records/simple-records-panel";
import {
  seedAwards,
  seedCompanyVehicles,
  seedGolfMemberships,
  seedOverseasTrainings,
  seedPcAssignments,
  seedPromotions,
  seedQualificationAllowances,
} from "@/data/hr-records-seed";
import type {
  AwardRecord,
  CompanyVehicleRecord,
  GolfMembershipRecord,
  OverseasTrainingRecord,
  PcAssignmentRecord,
  PromotionRecord,
  QualificationAllowanceRecord,
} from "@/lib/types";
import { cn } from "@/lib/utils";

type MainTab = "hr" | "ga" | "it";

type SubTab = {
  id: string;
  label: string;
};

const MAIN_TABS: { id: MainTab; label: string }[] = [
  { id: "hr", label: "인사" },
  { id: "ga", label: "총무" },
  { id: "it", label: "IT" },
];

const SUB_TABS: Record<MainTab, SubTab[]> = {
  hr: [
    { id: "promotions", label: "승진현황" },
    { id: "awards", label: "포상현황" },
    { id: "allowances", label: "자격수당 현황" },
    { id: "contracts", label: "계약직 현황" },
  ],
  ga: [
    { id: "permits", label: "인허가 현황" },
    { id: "golf", label: "골프 회원권 현황" },
    { id: "vehicles", label: "업무용 차량 현황" },
    { id: "overseas", label: "해외연수 현황" },
  ],
  it: [{ id: "pcs", label: "PC 지급 현황" }],
};

function PromotionsSection() {
  const [inner, setInner] = useState<"points" | "cumulative" | "history">(
    "points",
  );
  return (
    <div className="space-y-4">
      <div className="inline-flex flex-wrap rounded-lg border border-border bg-card p-0.5 shadow-sm">
        <button
          type="button"
          onClick={() => setInner("points")}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-medium transition sm:text-sm",
            inner === "points"
              ? "bg-dh-real text-white"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          승진포인트 현황
        </button>
        <button
          type="button"
          onClick={() => setInner("cumulative")}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-medium transition sm:text-sm",
            inner === "cumulative"
              ? "bg-dh-real text-white"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          승진포인트 누적 현황
        </button>
        <button
          type="button"
          onClick={() => setInner("history")}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-medium transition sm:text-sm",
            inner === "history"
              ? "bg-dh-real text-white"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          승진 발령 이력
        </button>
      </div>
      {inner === "points" ? (
        <PromotionPointsPanel mode="recent" />
      ) : inner === "cumulative" ? (
        <PromotionPointsPanel mode="cumulative" />
      ) : (
        <SimpleRecordsPanel<PromotionRecord>
          title="승진 발령 이력"
          description="승진 발령 건을 등록·관리합니다."
          storageKey="hr-dashboard-promotions-v2"
          seedFn={seedPromotions}
          idPrefix="pr"
          excelFileName="승진발령이력.xlsx"
          fields={[
            { key: "employeeName", label: "성명", required: true },
            { key: "team", label: "소속", required: true },
            { key: "fromTitle", label: "승진 전", required: true },
            { key: "toTitle", label: "승진 후", required: true },
            {
              key: "effectiveDate",
              label: "발령일",
              type: "date",
              required: true,
            },
            { key: "note", label: "비고" },
          ]}
        />
      )}
    </div>
  );
}

export function HrRecordsView({
  initialMain = "hr",
  initialSub,
}: {
  initialMain?: MainTab;
  initialSub?: string;
}) {
  const [main, setMain] = useState<MainTab>(initialMain);
  const defaultSub = initialSub ?? SUB_TABS[initialMain][0]?.id ?? "promotions";
  const [sub, setSub] = useState(defaultSub);

  const subs = SUB_TABS[main];

  function switchMain(next: MainTab) {
    setMain(next);
    setSub(SUB_TABS[next][0]?.id ?? "");
  }

  const panel = useMemo(() => {
    switch (sub) {
      case "promotions":
        return <PromotionsSection />;
      case "awards":
        return (
          <SimpleRecordsPanel<AwardRecord>
            title="포상현황"
            description="포상·표창 이력을 등록·관리합니다."
            storageKey="hr-dashboard-awards-v1"
            seedFn={seedAwards}
            idPrefix="aw"
            excelFileName="포상현황.xlsx"
            fields={[
              { key: "employeeName", label: "성명", required: true },
              { key: "team", label: "소속", required: true },
              { key: "awardName", label: "포상명", required: true },
              {
                key: "awardDate",
                label: "포상일",
                type: "date",
                required: true,
              },
              { key: "note", label: "비고" },
            ]}
          />
        );
      case "allowances":
        return (
          <SimpleRecordsPanel<QualificationAllowanceRecord>
            title="자격수당 현황"
            description="자격수당 지급 대상을 등록·관리합니다."
            storageKey="hr-dashboard-qual-allowances-v1"
            seedFn={seedQualificationAllowances}
            idPrefix="qa"
            excelFileName="자격수당현황.xlsx"
            fields={[
              { key: "employeeName", label: "성명", required: true },
              { key: "team", label: "소속", required: true },
              { key: "qualification", label: "자격", required: true },
              {
                key: "monthlyAmount",
                label: "월수당(원)",
                type: "number",
                required: true,
              },
              {
                key: "startDate",
                label: "시작일",
                type: "date",
                required: true,
              },
              { key: "note", label: "비고" },
            ]}
          />
        );
      case "contracts":
      case "contracts-db":
      case "contractors":
        return (
          <ContractsDbPanel
            title="계약직 현황"
            description="근로계약을 등록·관리합니다. 홈 화면에는 종료 1개월 전 항목이 알림으로 표시됩니다."
          />
        );
      case "permits":
      case "permits-db":
        return (
          <PermitsDbPanel
            statusView
            title="인허가 현황"
            description="인허가를 등록·관리합니다. 홈 화면에는 종료 1개월 전 항목이 알림으로 표시됩니다."
          />
        );
      case "golf":
        return (
          <SimpleRecordsPanel<GolfMembershipRecord>
            title="골프 회원권 현황"
            description="법인·개인 골프 회원권을 등록·관리합니다."
            storageKey="hr-dashboard-golf-v1"
            seedFn={seedGolfMemberships}
            idPrefix="gf"
            excelFileName="골프회원권현황.xlsx"
            fields={[
              { key: "clubName", label: "골프장", required: true },
              { key: "memberName", label: "명의", required: true },
              { key: "membershipType", label: "회원유형", required: true },
              {
                key: "startDate",
                label: "시작일",
                type: "date",
                required: true,
              },
              { key: "endDate", label: "종료일", type: "date", required: true },
              { key: "note", label: "비고" },
            ]}
          />
        );
      case "vehicles":
        return (
          <SimpleRecordsPanel<CompanyVehicleRecord>
            title="업무용 차량 현황"
            description="업무용 차량 배정 현황을 등록·관리합니다."
            storageKey="hr-dashboard-vehicles-v1"
            seedFn={seedCompanyVehicles}
            idPrefix="cv"
            excelFileName="업무용차량현황.xlsx"
            fields={[
              { key: "plateNo", label: "차량번호", required: true },
              { key: "model", label: "차종", required: true },
              { key: "assignee", label: "사용자", required: true },
              { key: "team", label: "소속", required: true },
              {
                key: "acquiredDate",
                label: "취득일",
                type: "date",
                required: true,
              },
              { key: "note", label: "비고" },
            ]}
          />
        );
      case "overseas":
        return (
          <SimpleRecordsPanel<OverseasTrainingRecord>
            title="해외연수 현황"
            description="해외연수·출장 교육 이력을 등록·관리합니다."
            storageKey="hr-dashboard-overseas-v1"
            seedFn={seedOverseasTrainings}
            idPrefix="ot"
            excelFileName="해외연수현황.xlsx"
            fields={[
              { key: "employeeName", label: "성명", required: true },
              { key: "team", label: "소속", required: true },
              { key: "country", label: "국가", required: true },
              { key: "program", label: "과정", required: true },
              {
                key: "startDate",
                label: "시작일",
                type: "date",
                required: true,
              },
              { key: "endDate", label: "종료일", type: "date", required: true },
              { key: "note", label: "비고" },
            ]}
          />
        );
      case "pcs":
        return (
          <SimpleRecordsPanel<PcAssignmentRecord>
            title="PC 지급 현황"
            description="업무용 PC·노트북 지급 이력을 등록·관리합니다."
            storageKey="hr-dashboard-pcs-v1"
            seedFn={seedPcAssignments}
            idPrefix="pc"
            excelFileName="PC지급현황.xlsx"
            fields={[
              { key: "employeeName", label: "성명", required: true },
              { key: "team", label: "소속", required: true },
              { key: "assetTag", label: "자산번호", required: true },
              { key: "model", label: "모델", required: true },
              {
                key: "assignedDate",
                label: "지급일",
                type: "date",
                required: true,
              },
              { key: "note", label: "비고" },
            ]}
          />
        );
      default:
        return null;
    }
  }, [sub]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 font-heading text-xl font-semibold text-dh-deep dark:text-dh-light sm:text-2xl">
          <FolderKanban className="size-6 text-dh-sea" />
          인사총무 이력 관리
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          인사 · 총무 · IT 이력을 탭으로 관리합니다. 계약·인허가 DB는 기존과
          동일하게 홈 알림과 연동됩니다.
        </p>
      </div>

      <div className="inline-flex rounded-lg border border-border bg-card p-1 shadow-sm">
        {MAIN_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => switchMain(t.id)}
            className={cn(
              "rounded-md px-4 py-1.5 text-sm font-medium transition",
              main === t.id
                ? "bg-dh-real text-white"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5 border-b border-border pb-2">
        {subs.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSub(s.id)}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition sm:text-sm",
              sub === s.id
                ? "bg-dh-deep text-white dark:bg-dh-sea"
                : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {panel}
    </div>
  );
}
