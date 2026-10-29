import {
  ALL_MENU_HREFS,
  DEFAULT_MEMBER_MENUS,
} from "@/lib/app-menus";
import type { TeamMember, WeeklyTask } from "@/lib/types";
import { addDays, formatYmd, weekIdFromDate, shiftWeek } from "@/lib/week";

/** 인사총무팀 기본 담당자 (HR Dashboard 등록 시드) */
export const SEED_MEMBERS: TeamMember[] = [
  {
    id: "m1",
    name: "김재선",
    role: "팀장",
    email: "",
    status: "active",
    isAdmin: false,
    allowedMenus: [...DEFAULT_MEMBER_MENUS],
  },
  {
    id: "m2",
    name: "이대현",
    role: "대리",
    email: "",
    status: "active",
    isAdmin: true,
    allowedMenus: [...ALL_MENU_HREFS],
  },
  {
    id: "m3",
    name: "김연경",
    role: "대리",
    email: "",
    status: "active",
    isAdmin: false,
    allowedMenus: [...DEFAULT_MEMBER_MENUS],
  },
  {
    id: "m4",
    name: "이선미",
    role: "주임",
    email: "",
    status: "active",
    isAdmin: false,
    allowedMenus: [...DEFAULT_MEMBER_MENUS],
  },
  {
    id: "m5",
    name: "이정훈",
    role: "사원",
    email: "",
    status: "active",
    isAdmin: false,
    allowedMenus: [...DEFAULT_MEMBER_MENUS],
  },
];

function thisWeekId() {
  return weekIdFromDate(new Date());
}

function lastWeekId() {
  return shiftWeek(thisWeekId(), -1);
}

function dateForWeekDay(weekId: string, day: WeeklyTask["dueDay"]): string {
  const idx = { 월: 0, 화: 1, 수: 2, 목: 3, 금: 4 }[day];
  return formatYmd(addDays(new Date(`${weekId}T00:00:00`), idx));
}

/** Sample weekly plans so the dashboard looks real from day one. */
export function buildSeedTasks(): WeeklyTask[] {
  const thisWeek = thisWeekId();
  const lastWeek = lastWeekId();
  const now = new Date().toISOString();

  const thisWeekTasks: WeeklyTask[] = [
    {
      id: "t1",
      weekId: thisWeek,
      ownerId: "m1",
      title: "주간 인사 운영 미팅 준비",
      description: "채용 파이프라인, 교육 일정, 이슈 공유 자료 정리",
      status: "in_progress",
      priority: "high",
      dueDay: "월",
      dueDate: dateForWeekDay(thisWeek, "월"),
      category: "운영",
      updatedAt: now,
    },
    {
      id: "t2",
      weekId: thisWeek,
      ownerId: "m1",
      title: "조직 개편 관련 FAQ 초안",
      description: "구성원 문의 대응용 FAQ 1차 작성 후 리뷰",
      status: "planned",
      priority: "medium",
      dueDay: "수",
      dueDate: dateForWeekDay(thisWeek, "수"),
      category: "커뮤니케이션",
      updatedAt: now,
    },
    {
      id: "t3",
      weekId: thisWeek,
      ownerId: "m2",
      title: "개발직군 서류 스크리닝",
      description: "이번 주 접수 지원서 1차 검토 및 면접 후보 선별",
      status: "in_progress",
      priority: "high",
      dueDay: "화",
      dueDate: dateForWeekDay(thisWeek, "화"),
      category: "채용",
      updatedAt: now,
    },
    {
      id: "t4",
      weekId: thisWeek,
      ownerId: "m3",
      title: "면접관 가이드 공유",
      description: "신규 면접관 대상 평가 기준 및 질문 가이드 배포",
      status: "planned",
      priority: "medium",
      dueDay: "목",
      dueDate: dateForWeekDay(thisWeek, "목"),
      category: "채용",
      updatedAt: now,
    },
    {
      id: "t5",
      weekId: thisWeek,
      ownerId: "m4",
      title: "신입 온보딩 Day1 체크리스트",
      description: "입사 예정자 계정·장비·환영 키트 준비 상태 점검",
      status: "done",
      priority: "high",
      dueDay: "월",
      dueDate: dateForWeekDay(thisWeek, "월"),
      category: "온보딩",
      updatedAt: now,
    },
    {
      id: "t6",
      weekId: thisWeek,
      ownerId: "m5",
      title: "리더십 교육 수요 조사",
      description: "팀장급 대상 교육 희망 주제 설문 발송",
      status: "planned",
      priority: "low",
      dueDay: "금",
      dueDate: dateForWeekDay(thisWeek, "금"),
      category: "교육",
      updatedAt: now,
    },
    {
      id: "t7",
      weekId: thisWeek,
      ownerId: "m2",
      title: "월중 급여 변동분 검토",
      description: "중도 입·퇴사 및 수당 변동 내역 1차 확인",
      status: "in_progress",
      priority: "high",
      dueDay: "수",
      dueDate: dateForWeekDay(thisWeek, "수"),
      category: "급여",
      updatedAt: now,
    },
    {
      id: "t8",
      weekId: thisWeek,
      ownerId: "m3",
      title: "복리후생 이용 가이드 업데이트",
      description: "복지몰·건강검진 안내문 최신화",
      status: "delayed",
      priority: "medium",
      dueDay: "화",
      dueDate: dateForWeekDay(thisWeek, "화"),
      category: "복리후생",
      updatedAt: now,
    },
    {
      id: "t13",
      weekId: thisWeek,
      ownerId: "m4",
      title: "회의실·비품 재고 점검",
      description: "본사 회의실 비품 및 소모품 재고 확인",
      status: "planned",
      priority: "low",
      dueDay: "목",
      dueDate: dateForWeekDay(thisWeek, "목"),
      category: "총무",
      updatedAt: now,
    },
  ];

  const lastWeekTasks: WeeklyTask[] = [
    {
      id: "t9",
      weekId: lastWeek,
      ownerId: "m1",
      title: "월간 인사 KPI 리포트",
      description: "채용·이직·교육 이수율 월간 요약",
      status: "done",
      priority: "high",
      dueDay: "금",
      dueDate: dateForWeekDay(lastWeek, "금"),
      category: "리포트",
      updatedAt: now,
    },
    {
      id: "t10",
      weekId: lastWeek,
      ownerId: "m2",
      title: "채용 공고 문구 개선",
      description: "직무 소개 및 복리후생 문구 A/B 검토",
      status: "done",
      priority: "medium",
      dueDay: "수",
      dueDate: dateForWeekDay(lastWeek, "수"),
      category: "채용",
      updatedAt: now,
    },
    {
      id: "t11",
      weekId: lastWeek,
      ownerId: "m5",
      title: "컴플라이언스 교육 이수 독려",
      description: "미이수자 리마인드 메일 발송",
      status: "done",
      priority: "medium",
      dueDay: "목",
      dueDate: dateForWeekDay(lastWeek, "목"),
      category: "교육",
      updatedAt: now,
    },
    {
      id: "t12",
      weekId: lastWeek,
      ownerId: "m3",
      title: "연차 사용 현황 공유",
      description: "팀별 잔여 연차 요약 전달",
      status: "delayed",
      priority: "low",
      dueDay: "금",
      dueDate: dateForWeekDay(lastWeek, "금"),
      category: "근태",
      updatedAt: now,
    },
  ];

  return [...thisWeekTasks, ...lastWeekTasks];
}
