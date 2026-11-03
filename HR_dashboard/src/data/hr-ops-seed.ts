import type {
  ContractRecord,
  LaborCostRow,
  LeaveRecord,
  PermitRecord,
  TeamPeriodMetric,
  WorkHoursRow,
} from "@/lib/types";
import { addDays, formatYmd } from "@/lib/week";

function ymdOffset(days: number) {
  return formatYmd(addDays(new Date(), days));
}

export function seedLeaves(): LeaveRecord[] {
  return [
    {
      id: "lv1",
      name: "김영진",
      department: "인사총무팀",
      leaveType: "연차",
      startDate: ymdOffset(0),
      endDate: ymdOffset(0),
      days: 1,
    },
    {
      id: "lv2",
      name: "이정훈",
      department: "인사총무팀",
      leaveType: "반차",
      startDate: ymdOffset(2),
      endDate: ymdOffset(2),
      days: 0.5,
    },
    {
      id: "lv3",
      name: "박현장",
      department: "생산팀",
      leaveType: "연차",
      startDate: ymdOffset(1),
      endDate: ymdOffset(3),
      days: 3,
    },
  ];
}

export function seedContracts(): ContractRecord[] {
  return [
    {
      id: "ct1",
      employeeName: "최계약",
      jobTrack: "현장직",
      contractType: "기간제",
      initialDate: ymdOffset(-700),
      startDate: ymdOffset(-300),
      endDate: ymdOffset(20),
      note: "계약 만료 임박",
    },
    {
      id: "ct2",
      employeeName: "한별정",
      jobTrack: "별정직",
      contractType: "기간제",
      initialDate: ymdOffset(-200),
      startDate: ymdOffset(-200),
      endDate: ymdOffset(40),
      note: "",
    },
    {
      id: "ct3",
      employeeName: "오일반",
      jobTrack: "일반직",
      contractType: "정규",
      initialDate: ymdOffset(-800),
      startDate: ymdOffset(-800),
      endDate: ymdOffset(200),
      note: "",
    },
  ];
}

export function seedPermits(): PermitRecord[] {
  return [
    {
      id: "pm1",
      name: "위험물 인허가",
      authority: "소방서",
      initialDate: ymdOffset(-1100),
      startDate: ymdOffset(-340),
      endDate: ymdOffset(15),
      note: "갱신 준비",
    },
    {
      id: "pm2",
      name: "사업장 폐기물 처리 허가",
      authority: "시청",
      initialDate: ymdOffset(-700),
      startDate: ymdOffset(-700),
      endDate: ymdOffset(50),
      note: "",
    },
  ];
}

/** 실데이터 입력용 — 샘플 없음 */
export function seedLaborCosts(): LaborCostRow[] {
  return [];
}

/** 실데이터 입력용 — 샘플 없음 */
export function seedWorkHours(): WorkHoursRow[] {
  return [];
}

/** 팀별 인건비 계획·실적 (원) — 실데이터 입력용 빈 시작 */
export function seedTeamLaborMetrics(): TeamPeriodMetric[] {
  return [];
}

/** 팀별 근무시간 계획·실적 (시간) — 실데이터 입력용 빈 시작 */
export function seedTeamHoursMetrics(): TeamPeriodMetric[] {
  return [];
}
