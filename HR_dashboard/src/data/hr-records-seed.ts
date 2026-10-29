import type {
  AwardRecord,
  CompanyVehicleRecord,
  GolfMembershipRecord,
  OverseasTrainingRecord,
  PcAssignmentRecord,
  PromotionRecord,
  QualificationAllowanceRecord,
} from "@/lib/types";
import { addDays, formatYmd } from "@/lib/week";

function ymdOffset(days: number) {
  return formatYmd(addDays(new Date(), days));
}

export function seedPromotions(): PromotionRecord[] {
  return [
    {
      id: "pr-lee",
      employeeName: "이대현",
      team: "인사총무팀",
      fromTitle: "사원",
      toTitle: "대리",
      effectiveDate: "2023-01-01",
      note: "사원→대리(240점) · 2019~2022 포인트 차감",
    },
    {
      id: "pr1",
      employeeName: "김인사",
      team: "인사총무팀",
      fromTitle: "대리",
      toTitle: "과장",
      effectiveDate: ymdOffset(-120),
      note: "정기 승진",
    },
    {
      id: "pr2",
      employeeName: "이총무",
      team: "인사총무팀",
      fromTitle: "사원",
      toTitle: "대리",
      effectiveDate: ymdOffset(-40),
      note: "",
    },
  ];
}

export function seedAwards(): AwardRecord[] {
  return [
    {
      id: "aw1",
      employeeName: "박영업",
      team: "영업팀",
      awardName: "우수사원상",
      awardDate: ymdOffset(-90),
      note: "분기 실적",
    },
  ];
}

export function seedQualificationAllowances(): QualificationAllowanceRecord[] {
  return [
    {
      id: "qa1",
      employeeName: "최자격",
      team: "생산팀",
      qualification: "위험물기능사",
      monthlyAmount: 50000,
      startDate: ymdOffset(-400),
      note: "",
    },
    {
      id: "qa2",
      employeeName: "정IT",
      team: "경영지원팀",
      qualification: "정보처리기사",
      monthlyAmount: 80000,
      startDate: ymdOffset(-200),
      note: "",
    },
  ];
}

export function seedGolfMemberships(): GolfMembershipRecord[] {
  return [
    {
      id: "gf1",
      clubName: "레이크사이드 CC",
      memberName: "법인",
      membershipType: "주중회원",
      startDate: ymdOffset(-800),
      endDate: ymdOffset(200),
      note: "접대용",
    },
  ];
}

export function seedCompanyVehicles(): CompanyVehicleRecord[] {
  return [
    {
      id: "cv1",
      plateNo: "12가 3456",
      model: "쏘렌토",
      assignee: "김인사",
      team: "인사총무팀",
      acquiredDate: ymdOffset(-600),
      note: "",
    },
    {
      id: "cv2",
      plateNo: "34나 7890",
      model: "아반떼",
      assignee: "공유",
      team: "영업팀",
      acquiredDate: ymdOffset(-300),
      note: "영업 공용",
    },
  ];
}

export function seedOverseasTrainings(): OverseasTrainingRecord[] {
  return [
    {
      id: "ot1",
      employeeName: "이총무",
      team: "인사총무팀",
      country: "일본",
      program: "물류 벤치마킹",
      startDate: ymdOffset(-180),
      endDate: ymdOffset(-173),
      note: "",
    },
  ];
}

export function seedPcAssignments(): PcAssignmentRecord[] {
  return [
    {
      id: "pc1",
      employeeName: "김인사",
      team: "인사총무팀",
      assetTag: "DH-PC-001",
      model: "ThinkPad T14",
      assignedDate: ymdOffset(-500),
      note: "",
    },
    {
      id: "pc2",
      employeeName: "정IT",
      team: "경영지원팀",
      assetTag: "DH-PC-014",
      model: "MacBook Pro 14",
      assignedDate: ymdOffset(-60),
      note: "개발용",
    },
  ];
}
