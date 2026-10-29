/** 사이드바 메뉴 정의 (권한 지정·필터 공통) */

export type AppMenuId =
  | "/"
  | "/calendar"
  | "/weekly-plans"
  | "/hr-records"
  | "/raci"
  | "/workflows"
  | "/members";

export type AppMenuDef = {
  href: AppMenuId;
  label: string;
};

export const APP_MENUS: AppMenuDef[] = [
  { href: "/", label: "홈" },
  { href: "/calendar", label: "Calendar" },
  { href: "/weekly-plans", label: "주간업무" },
  { href: "/hr-records", label: "인사총무 이력" },
  { href: "/raci", label: "RACI" },
  { href: "/workflows", label: "업무기술서" },
  { href: "/members", label: "담당자" },
];

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
