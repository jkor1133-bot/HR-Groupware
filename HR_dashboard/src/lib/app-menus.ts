/** 사이드바 메뉴 정의 (권한 지정·필터 공통) */

import type { TeamMember } from "@/lib/types";

export type AppMenuId =
  | "/"
  | "/calendar"
  | "/weekly-plans"
  | "/employees"
  | "/hr-records"
  | "/raci"
  | "/workflows"
  | "/members";

export type AppMenuDef = {
  href: AppMenuId;
  label: string;
};

export type AppMenuGroupId = "home" | "work" | "hr" | "members";

export type AppMenuGroupDef = {
  id: AppMenuGroupId;
  /**
   * 사이드바 1단 표기.
   * - 단독(홈·담당자): 빈 문자열 → menus[0]을 바로 노출
   * - 그룹(업무·인사): 라벨을 클릭하면 menus 펼침
   */
  label: string;
  /** 아이콘 사이드바용 짧은 표기 */
  shortLabel?: string;
  /** true면 클릭 시 하위 메뉴 아코디언 */
  collapsible?: boolean;
  /** 하단 고정(담당자) */
  pinBottom?: boolean;
  menus: AppMenuDef[];
};

/**
 * 사이드바 그룹
 * 1. 홈 (단독)
 * 2. 업무 / R&R (펼침)
 * 3. 인사 (펼침)
 * 4. 담당자 (하단 단독)
 */
export const APP_MENU_GROUPS: AppMenuGroupDef[] = [
  {
    id: "home",
    label: "",
    menus: [{ href: "/", label: "홈" }],
  },
  {
    id: "work",
    label: "업무 / R&R",
    shortLabel: "업무",
    collapsible: true,
    menus: [
      { href: "/calendar", label: "일정" },
      { href: "/weekly-plans", label: "주간업무" },
      { href: "/raci", label: "RACI" },
      { href: "/workflows", label: "업무기술서" },
    ],
  },
  {
    id: "hr",
    label: "인사",
    shortLabel: "인사",
    collapsible: true,
    menus: [
      { href: "/employees", label: "사원명부" },
      { href: "/hr-records", label: "인사총무 이력" },
    ],
  },
  {
    id: "members",
    label: "",
    pinBottom: true,
    menus: [{ href: "/members", label: "담당자" }],
  },
];

export const APP_MENUS: AppMenuDef[] = APP_MENU_GROUPS.flatMap((g) => g.menus);

export const ALL_MENU_HREFS: AppMenuId[] = APP_MENUS.map((m) => m.href);

/** 비관리자 기본 메뉴 */
export const DEFAULT_MEMBER_MENUS: AppMenuId[] = [
  "/",
  "/calendar",
  "/weekly-plans",
];

export function ensureHomeMenu(menus: string[] | undefined): AppMenuId[] {
  const set = new Set<string>(menus?.length ? menus : DEFAULT_MEMBER_MENUS);
  set.add("/");
  return ALL_MENU_HREFS.filter((h) => set.has(h));
}

export function canAccessMenu(
  isAdmin: boolean | undefined,
  allowedMenus: string[] | undefined,
  href: string,
): boolean {
  if (isAdmin) return true;
  if (href === "/" || href.startsWith("/settings")) return true;
  const menus = ensureHomeMenu(allowedMenus);
  return menus.some(
    (m) => m === href || (m !== "/" && href.startsWith(m)),
  );
}

/** 인사총무 이력 · 승진현황 탭 id */
export const HR_SUB_PROMOTIONS = "promotions";

/**
 * 인사총무 이력 하위 탭 접근.
 * - 관리자: 전부
 * - promotions 외 탭: 당분간 항상 허용
 * - promotions: allowedHrSubs 없음 → 허용 / 배열이면 포함 시에만
 */
export function canAccessHrSub(
  isAdmin: boolean | undefined,
  allowedHrSubs: string[] | undefined,
  subId: string,
): boolean {
  if (isAdmin) return true;
  if (subId !== HR_SUB_PROMOTIONS) return true;
  if (allowedHrSubs == null) return true;
  return allowedHrSubs.includes(HR_SUB_PROMOTIONS);
}

/** 승진현황 탭 on/off → allowedHrSubs 갱신 */
export function setPromotionsHrSub(
  allowedHrSubs: string[] | undefined,
  allow: boolean,
): string[] | undefined {
  if (allow) {
    if (allowedHrSubs == null) return undefined;
    if (allowedHrSubs.includes(HR_SUB_PROMOTIONS)) return allowedHrSubs;
    return [...allowedHrSubs, HR_SUB_PROMOTIONS];
  }
  if (allowedHrSubs == null) return [];
  return allowedHrSubs.filter((s) => s !== HR_SUB_PROMOTIONS);
}

/** 주간업무: 관리자·팀장(이상)은 전체 스케줄 조회·배정 가능 */
export function canManageAllWeeklyPlans(
  member: TeamMember | null | undefined,
): boolean {
  if (!member) return false;
  if (member.isAdmin) return true;
  const role = member.role ?? "";
  return /팀장|과장|차장|부장/.test(role);
}
