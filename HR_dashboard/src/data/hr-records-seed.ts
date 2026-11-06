import type {
  AwardRecord,
  CompanyVehicleRecord,
  CongratulatoryStandardRecord,
  GolfMembershipRecord,
  OverseasTrainingRecord,
  IpAssignmentRecord,
  PayBandMatrix,
  PcAssignmentRecord,
  PolicyMemoRecord,
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
  return [];
}

/** 대한싸이로 Pay-Band 매트릭스 (사진 기준 + Max는 차트용 초기값) */
export function seedPayBandMatrix(): PayBandMatrix {
  return {
    company: "대한싸이로",
    general: [
      {
        title: "사원",
        standardYears: 4,
        limitYears: 7,
        minSalary: null,
        maxSalary: null,
        promotionBump: null,
      },
      {
        title: "대리",
        standardYears: 4,
        limitYears: 7,
        minSalary: null,
        maxSalary: null,
        promotionBump: null,
      },
      {
        title: "과장",
        standardYears: 6,
        limitYears: 9,
        minSalary: null,
        maxSalary: null,
        promotionBump: null,
      },
      {
        title: "차장",
        standardYears: 6,
        limitYears: 9,
        minSalary: null,
        maxSalary: null,
        promotionBump: null,
      },
      {
        title: "부장",
        standardYears: null,
        limitYears: null,
        minSalary: null,
        maxSalary: 100_000_000,
        promotionBump: null,
      },
    ],
    support: [
      {
        title: "사원",
        standardYears: 10,
        limitYears: 13,
        minSalary: null,
        maxSalary: null,
        promotionBump: null,
      },
      {
        title: "주임",
        standardYears: 10,
        limitYears: 13,
        minSalary: null,
        maxSalary: null,
        promotionBump: null,
      },
      {
        title: "대리",
        standardYears: 10,
        limitYears: 10,
        minSalary: null,
        maxSalary: null,
        promotionBump: null,
      },
    ],
  };
}

export function seedGroupExecCongratulatory(): CongratulatoryStandardRecord[] {
  return [
    {
      id: "gec1",
      eventType: "결혼",
      relation: "본인",
      amount: 500000,
      effectiveDate: ymdOffset(-400),
      note: "그룹사 임원 기준",
    },
    {
      id: "gec2",
      eventType: "사망",
      relation: "부모",
      amount: 1000000,
      effectiveDate: ymdOffset(-400),
      note: "",
    },
  ];
}

export function seedStaffCongratulatory(): CongratulatoryStandardRecord[] {
  return [
    {
      id: "sc1",
      eventType: "결혼",
      relation: "본인",
      amount: 300000,
      effectiveDate: ymdOffset(-400),
      note: "직원 기준",
    },
    {
      id: "sc2",
      eventType: "출산",
      relation: "본인·배우자",
      amount: 200000,
      effectiveDate: ymdOffset(-400),
      note: "",
    },
  ];
}

export function seedGroupExecVehiclePolicy(): PolicyMemoRecord[] {
  return [
    {
      id: "gev1",
      memoDate: ymdOffset(-200),
      title: "그룹사 임원 차량 지급 기준 제정",
      body: "임원 직급별 차량 지급·유지 기준을 정리합니다. 세부 금액·차종은 내부 기준에 따릅니다.",
      note: "최초 등록",
    },
  ];
}

export function seedCompanyVehiclePolicy(): PolicyMemoRecord[] {
  return [
    {
      id: "cvp1",
      memoDate: ymdOffset(-150),
      title: "당사 업무용 차량 지급 기준",
      body: "업무 필요에 따른 차량 배정·교체 주기·공용 차량 운영 기준을 기록합니다.",
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

/** 대한싸이로 IP 주소 현황 샘플 */
export function seedIpAssignments(): IpAssignmentRecord[] {
  return [
    {
      id: "ip1",
      userName: "영양사",
      ipAddress: "210.101.130.141",
      note: "지하",
    },
    {
      id: "ip2",
      userName: "이영운",
      ipAddress: "210.101.130.44",
      note: "1층",
    },
    {
      id: "ip3",
      userName: "고인환",
      ipAddress: "210.101.130.2",
      note: "1층",
    },
    {
      id: "ip4",
      userName: "김형철",
      ipAddress: "210.101.130.43",
      note: "",
    },
    {
      id: "ip5",
      userName: "유병곤",
      ipAddress: "210.101.130.66",
      note: "",
    },
  ];
}
