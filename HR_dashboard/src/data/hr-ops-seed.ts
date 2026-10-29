import { ORG_TEAMS } from "@/data/org";
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

function yearMonth(offsetMonths: number) {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offsetMonths);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
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

/** 당해·전년 1월~당월까지 월별 시드 (누계 비교용) */
function monthsForYtdSeed() {
  const now = new Date();
  const curMonth = now.getMonth(); // 0-based
  const offsets: number[] = [];
  for (let m = 0; m <= curMonth; m++) offsets.push(m - curMonth);
  for (let m = 0; m <= curMonth; m++) offsets.push(m - curMonth - 12);
  return offsets.map(yearMonth);
}

export function seedLaborCosts(): LaborCostRow[] {
  const tracks = ["일반직", "지원직", "현장직", "별정직", "계약직"] as const;
  const months = monthsForYtdSeed();
  const base: Record<(typeof tracks)[number], number> = {
    일반직: 85_000_000,
    지원직: 42_000_000,
    현장직: 120_000_000,
    별정직: 28_000_000,
    계약직: 18_000_000,
  };
  const head: Record<(typeof tracks)[number], number> = {
    일반직: 12,
    지원직: 8,
    현장직: 35,
    별정직: 6,
    계약직: 4,
  };
  const rows: LaborCostRow[] = [];
  let i = 0;
  for (const ym of months) {
    const [y, m] = ym.split("-").map(Number);
    const season = 0.94 + (m / 12) * 0.08;
    const yearFactor = y === new Date().getFullYear() ? 1 : 0.92;
    for (const track of tracks) {
      rows.push({
        id: `lc-${++i}`,
        yearMonth: ym,
        jobTrack: track,
        headcount: head[track],
        amount: Math.round(base[track] * season * yearFactor),
      });
    }
  }
  return rows;
}

export function seedWorkHours(): WorkHoursRow[] {
  const tracks = ["현장직", "별정직"] as const;
  const months = monthsForYtdSeed();
  const base = { 현장직: 6200, 별정직: 980 };
  const rows: WorkHoursRow[] = [];
  let i = 0;
  for (const ym of months) {
    const [, m] = ym.split("-").map(Number);
    const season = 0.94 + (m / 12) * 0.08;
    const yearFactor = ym.startsWith(String(new Date().getFullYear()))
      ? 1
      : 0.93;
    for (const track of tracks) {
      rows.push({
        id: `wh-${++i}`,
        yearMonth: ym,
        jobTrack: track,
        hours: Math.round(base[track] * season * yearFactor),
      });
    }
  }
  return rows;
}

/** 팀별 인건비 계획·실적 (원) */
export function seedTeamLaborMetrics(): TeamPeriodMetric[] {
  const basePlan: Record<(typeof ORG_TEAMS)[number], number> = {
    인사총무팀: 48_000_000,
    재경팀: 52_000_000,
    신용관리팀: 41_000_000,
    곡물사업팀: 68_000_000,
    기술팀: 72_000_000,
    SCM사업팀: 55_000_000,
    구매팀: 44_000_000,
    영업팀: 78_000_000,
    물류지원팀: 95_000_000,
  };
  const months = monthsForYtdSeed();
  const rows: TeamPeriodMetric[] = [];
  let i = 0;
  for (const ym of months) {
    const [y, m] = ym.split("-").map(Number);
    const season = 0.94 + (m / 12) * 0.08;
    const yearFactor = y === new Date().getFullYear() ? 1 : 0.91;
    for (const team of ORG_TEAMS) {
      const plan = Math.round(basePlan[team] * season * yearFactor);
      const drift = 0.92 + ((i * 7) % 17) / 100; // 0.92~1.08
      rows.push({
        id: `tl-${++i}`,
        yearMonth: ym,
        team,
        plan,
        actual: Math.round(plan * drift),
      });
    }
  }
  return rows;
}

/** 팀별 근무시간 계획·실적 (시간) — 현장 비중 큰 팀 위주 */
export function seedTeamHoursMetrics(): TeamPeriodMetric[] {
  const basePlan: Record<(typeof ORG_TEAMS)[number], number> = {
    인사총무팀: 320,
    재경팀: 360,
    신용관리팀: 300,
    곡물사업팀: 480,
    기술팀: 920,
    SCM사업팀: 540,
    구매팀: 400,
    영업팀: 610,
    물류지원팀: 1480,
  };
  const months = monthsForYtdSeed();
  const rows: TeamPeriodMetric[] = [];
  let i = 0;
  for (const ym of months) {
    const [y, m] = ym.split("-").map(Number);
    const season = 0.94 + (m / 12) * 0.08;
    const yearFactor = y === new Date().getFullYear() ? 1 : 0.93;
    for (const team of ORG_TEAMS) {
      const plan = Math.round(basePlan[team] * season * yearFactor);
      const drift = 0.93 + ((i * 5) % 15) / 100;
      rows.push({
        id: `th-${++i}`,
        yearMonth: ym,
        team,
        plan,
        actual: Math.round(plan * drift),
      });
    }
  }
  return rows;
}
