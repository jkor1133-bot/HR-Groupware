/** 사원명부 선택값·스토리지 키 */

export const EMPLOYEES_STORAGE_KEY = "hr-dashboard-employees-v1";
export const EMPLOYEES_UPDATED_EVENT = "hr-employees-updated";

export const EMPLOYEE_DIVISIONS = [
  "임원실",
  "경영지원본부",
  "국제물류사업본부",
  "축산자원사업본부",
] as const;

export const EMPLOYEE_DEPARTMENTS = [
  "인사총무팀",
  "재경팀",
  "신용관리팀",
  "곡물사업팀",
  "기술팀",
  "SCM사업팀",
  "구매팀",
  "영업팀",
] as const;

export const EMPLOYEE_TITLES = [
  "회장",
  "부회장",
  "사장",
  "부사장",
  "전무",
  "상무",
  "상무보",
  "부장",
  "차장",
  "과장",
  "대리",
  "주임",
  "사원",
] as const;

export const EMPLOYEE_JOB_ROLES = [
  "대표이사",
  "본부장",
  "팀장",
  "소장",
  "팀원",
] as const;

/** 부서 세부 파트 (선택) */
export const EMPLOYEE_PARTS = [
  "하역파트",
  "곡물관리파트",
  "기계파트",
  "전기파트",
  "계근파트",
  "안전파트",
  "경인영업소",
  "안성영업소",
  "사천영업소",
  "정읍영업소",
  "안동영업소",
  "남항사업소",
  "광주물류센터",
] as const;

export const EMPLOYEE_JOB_TRACKS = [
  "임원",
  "일반직",
  "지원직",
  "별정직",
  "현장직",
  "계약직",
] as const;

export const EMPLOYEE_GENDERS = ["남자", "여자"] as const;

/** 상위부서 → 부서 */
export const DEPARTMENTS_BY_DIVISION: Record<
  (typeof EMPLOYEE_DIVISIONS)[number],
  readonly string[]
> = {
  임원실: ["임원실"],
  경영지원본부: ["인사총무팀", "재경팀", "신용관리팀"],
  국제물류사업본부: ["곡물사업팀", "기술팀", "SCM사업팀"],
  축산자원사업본부: ["구매팀", "영업팀"],
};

export function departmentsForDivision(division: string): string[] {
  const list =
    DEPARTMENTS_BY_DIVISION[
      division as (typeof EMPLOYEE_DIVISIONS)[number]
    ];
  if (list?.length) return [...list];
  return [...EMPLOYEE_DEPARTMENTS];
}

export function notifyEmployeesUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EMPLOYEES_UPDATED_EVENT));
}
