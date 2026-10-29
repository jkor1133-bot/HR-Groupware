/** 대한싸이로 승진 등급·포인트 기준 */

export const PROMOTION_GRADES = ["S", "A", "B", "C", "D"] as const;
export type PromotionGrade = (typeof PROMOTION_GRADES)[number];

export const PROMOTION_TITLES = [
  "사원",
  "대리",
  "과장",
  "차장",
  "부장",
] as const;
export type PromotionTitle = (typeof PROMOTION_TITLES)[number];

export const PROMOTION_ROLES = [
  "팀원",
  "팀장",
  "본부장",
  "기타",
] as const;

/** 등급별 승진포인트 (직위 공통) */
export const GRADE_POINTS: Record<PromotionGrade, number> = {
  S: 100,
  A: 80,
  B: 60,
  C: 40,
  D: 20,
};

/**
 * 현 직위 → 차기 승진 필요 누계 포인트·참고 년차
 * 승진대상 선정은 **포인트 충족이 우선**이며, 년차는 참고 지표입니다.
 * (등급 점수 100점 만점 기준으로 환산)
 */
export const PROMOTION_REQUIREMENTS: Record<
  PromotionTitle,
  { nextTitle: PromotionTitle | null; points: number; years: number }
> = {
  사원: { nextTitle: "대리", points: 240, years: 4 },
  대리: { nextTitle: "과장", points: 260, years: 4 },
  과장: { nextTitle: "차장", points: 380, years: 6 },
  차장: { nextTitle: "부장", points: 400, years: 6 },
  부장: { nextTitle: null, points: 0, years: 0 },
};

export const POINT_START_YEAR = 2018;

/** throughYear는 호출측에서 넘기세요 (모듈 기본값에 new Date() 사용 금지 — RSC prerender 경고) */
export function promotionYears(throughYear: number) {
  const years: number[] = [];
  for (let y = POINT_START_YEAR; y <= throughYear; y++) years.push(y);
  return years;
}

/** 최근 N개년 (당해 포함). 예: 2026 기준 5년 → 2022~2026 */
export function promotionYearsRecent(count: number, throughYear: number) {
  const start = Math.max(POINT_START_YEAR, throughYear - count + 1);
  const years: number[] = [];
  for (let y = start; y <= throughYear; y++) years.push(y);
  return years;
}

export function isPromotionTitle(v: string): v is PromotionTitle {
  return (PROMOTION_TITLES as readonly string[]).includes(v);
}

export function isPromotionGrade(v: string): v is PromotionGrade {
  return (PROMOTION_GRADES as readonly string[]).includes(v);
}

/** 구버전 B+ → B 로 정규화 */
export function normalizeGrade(grade: string | undefined | null): string {
  if (!grade) return "";
  if (grade === "B+") return "B";
  return isPromotionGrade(grade) ? grade : "";
}

export function pointsForGrade(
  _title: string,
  grade: string | undefined | null,
): number {
  const g = normalizeGrade(grade);
  if (!g || !isPromotionGrade(g)) return 0;
  return GRADE_POINTS[g];
}

export function nominalPointsForGrade(
  title: string,
  grade: string | undefined | null,
): number {
  return pointsForGrade(title, grade);
}

export function sumPromotionPoints(
  title: string,
  grades: Record<string, string>,
  years: number[],
): number {
  return years.reduce(
    (sum, y) => sum + pointsForGrade(title, grades[String(y)]),
    0,
  );
}

export type EffectivePointsResult = {
  /** 전체 연도 합계 */
  gross: number;
  /** 최근 승진 이전 연도 포인트 (차감) */
  deducted: number;
  /** 승진 이후(당해 포함) 유효 포인트 — 승진대상 판정용 */
  effective: number;
  /** 최근 승진 연도 (없으면 null) */
  lastPromotionYear: number | null;
  /** 차감 설명 */
  deductDetail: string;
};

/**
 * 승진 발령 이후에는 그 이전 연도 포인트를 차감합니다.
 * 예: 2023년 사원→대리 승진 → 2019~2022 포인트 차감, 2023~ 만 유효.
 */
export function computeEffectivePoints(input: {
  title: string;
  grades: Record<string, string>;
  years: number[];
  /** 해당 직원 승진 발령일 YYYY-MM-DD 목록 */
  promotionDates: string[];
}): EffectivePointsResult {
  const { title, grades, years, promotionDates } = input;
  const gross = sumPromotionPoints(title, grades, years);

  const promoYears = promotionDates
    .map((d) => {
      const y = Number(String(d).slice(0, 4));
      return Number.isFinite(y) ? y : null;
    })
    .filter((y): y is number => y != null)
    .sort((a, b) => a - b);

  const lastPromotionYear =
    promoYears.length > 0 ? promoYears[promoYears.length - 1]! : null;

  if (lastPromotionYear == null) {
    return {
      gross,
      deducted: 0,
      effective: gross,
      lastPromotionYear: null,
      deductDetail: "승진 발령 이력 없음 — 전 기간 포인트 합산",
    };
  }

  const before = years.filter((y) => y < lastPromotionYear);
  const after = years.filter((y) => y >= lastPromotionYear);
  const deducted = sumPromotionPoints(title, grades, before);
  const effective = sumPromotionPoints(title, grades, after);

  return {
    gross,
    deducted,
    effective,
    lastPromotionYear,
    deductDetail:
      deducted > 0
        ? `${lastPromotionYear}년 승진 반영 → ${before[0] ?? "—"}~${lastPromotionYear - 1}년 ${deducted}점 차감`
        : `${lastPromotionYear}년 승진 반영 · 차감할 이전 포인트 없음`,
  };
}

export function normalizeGradesMap(
  grades: Record<string, string>,
): Record<string, string> {
  const next: Record<string, string> = {};
  for (const [k, v] of Object.entries(grades ?? {})) {
    next[k] = normalizeGrade(v);
  }
  return next;
}

export type EligibilityResult = {
  eligible: boolean;
  label: string;
  detail: string;
  /** 당해 최소 필요 등급 (포인트·제도 기준), 없으면 null */
  minGradeThisYear?: string | null;
  /** 예: "당해 B 이상" */
  minGradeNote?: string;
};

/** 필요 점수 이상을 주는 가장 낮은 등급 (D→S). 불가능하면 null */
export function minGradeForNeededPoints(
  needed: number,
): PromotionGrade | null {
  if (needed <= 0) return null;
  const ascending: PromotionGrade[] = ["D", "C", "B", "A", "S"];
  for (const g of ascending) {
    if (GRADE_POINTS[g] >= needed) return g;
  }
  return null;
}

function stricterMinGrade(
  a: PromotionGrade | null,
  b: PromotionGrade | null,
): PromotionGrade | null {
  if (!a) return b;
  if (!b) return a;
  return GRADE_POINTS[a] >= GRADE_POINTS[b] ? a : b;
}

/** 당해년도 승진대상 여부 — 포인트 충족이 우선(년차는 참고), 당해 최소 등급도 안내 */
export function currentYearEligibility(input: {
  title: string;
  titleYears: number;
  /** 당해 등급을 제외한 유효 누계 */
  pointsBeforeCurrentYear: number;
  prevYearGrade: string;
  currentYearGrade: string;
}): EligibilityResult {
  const title = isPromotionTitle(input.title) ? input.title : "사원";
  const req = PROMOTION_REQUIREMENTS[title];
  if (!req.nextTitle) {
    return {
      eligible: false,
      label: "해당없음",
      detail: "최고 직위(부장) — 추가 승진 구간 없음",
      minGradeThisYear: null,
      minGradeNote: "",
    };
  }

  const prev = normalizeGrade(input.prevYearGrade);
  const current = normalizeGrade(input.currentYearGrade);
  const currentPts = pointsForGrade(title, current);
  const totalPoints = input.pointsBeforeCurrentYear + currentPts;
  const needThisYear = Math.max(0, req.points - input.pointsBeforeCurrentYear);

  let minByPoints = minGradeForNeededPoints(needThisYear);
  const prevCd = prev === "C" || prev === "D";
  if (prevCd) {
    minByPoints = stricterMinGrade(minByPoints, "A");
  }

  const yearsOk = input.titleYears >= req.years;
  const pointsOk = totalPoints >= req.points;
  const currentSa = current === "S" || current === "A";
  const yearsNote = yearsOk
    ? `년차 ${input.titleYears}/${req.years}`
    : `년차 미달(${input.titleYears}/${req.years}, 참고)`;

  const minGradeNote =
    needThisYear > GRADE_POINTS.S
      ? `당해 S(100)로도 부족 · ${needThisYear}점 필요`
      : needThisYear <= 0 && !prevCd
        ? "당해 등급 무관(포인트 기충족)"
        : minByPoints
          ? `당해 ${minByPoints} 이상(${GRADE_POINTS[minByPoints]}점↑)`
          : "";

  if (prevCd && current && !currentSa) {
    return {
      eligible: false,
      label: "비대상",
      detail: `전년도 ${prev} → 당해 S/A 필요 · 포인트 ${totalPoints}/${req.points}`,
      minGradeThisYear: minByPoints,
      minGradeNote: minGradeNote || "당해 A 이상",
    };
  }

  if (prevCd && !current) {
    return {
      eligible: false,
      label: "대기",
      detail: `전년도 ${prev} · 당해 S/A + 포인트 ${input.pointsBeforeCurrentYear}/${req.points} (당해 ${needThisYear}점 필요)`,
      minGradeThisYear: minByPoints,
      minGradeNote,
    };
  }

  if (!current) {
    if (needThisYear > GRADE_POINTS.S) {
      return {
        eligible: false,
        label: "비대상",
        detail: `포인트 기확보 ${input.pointsBeforeCurrentYear}/${req.points} · 당해 최대 100점으로도 부족`,
        minGradeThisYear: null,
        minGradeNote,
      };
    }
    if (needThisYear <= 0) {
      return {
        eligible: true,
        label: "대상가능",
        detail: `포인트 기충족(${input.pointsBeforeCurrentYear}/${req.points}) · ${yearsNote} · 당해 등급 입력 시 확정`,
        minGradeThisYear: null,
        minGradeNote: "당해 등급 무관(포인트 기충족)",
      };
    }
    return {
      eligible: false,
      label: "대기",
      detail: `기확보 ${input.pointsBeforeCurrentYear}/${req.points} · 당해 ${minByPoints} 이상이면 대상`,
      minGradeThisYear: minByPoints,
      minGradeNote,
    };
  }

  // 포인트 충족이 승진대상 선정의 우선 기준 (년차 미달 허용)
  if (pointsOk) {
    return {
      eligible: true,
      label: "대상",
      detail: `${req.nextTitle} 포인트 충족 (${totalPoints}/${req.points}) · ${yearsNote} · 당해 ${current}`,
      minGradeThisYear: minByPoints,
      minGradeNote: yearsOk
        ? minByPoints
          ? `참고: 당해 ${minByPoints} 이상이면 포인트 충족`
          : "당해 등급 무관(포인트 기충족)"
        : `포인트 우선 충족 · ${yearsNote}`,
    };
  }

  return {
    eligible: false,
    label: "비대상",
    detail: `포인트 ${totalPoints}/${req.points} (부족 ${Math.max(0, req.points - totalPoints)}) · 당해 ${current}(${currentPts}점)`,
    minGradeThisYear: minByPoints,
    minGradeNote,
  };
}

/** 차기년도 승진대상 가능 여부 */
export function nextYearEligibility(input: {
  title: string;
  titleYears: number;
  totalPoints: number;
  currentYearGrade: string;
}): EligibilityResult {
  const title = isPromotionTitle(input.title) ? input.title : "사원";
  const req = PROMOTION_REQUIREMENTS[title];
  if (!req.nextTitle) {
    return {
      eligible: false,
      label: "해당없음",
      detail: "최고 직위 — 차기 승진 구간 없음",
    };
  }

  const current = normalizeGrade(input.currentYearGrade);
  if (current === "C" || current === "D") {
    return {
      eligible: false,
      label: "조건부",
      detail: `당해 ${current} → 차기년 S/A 등급 시에만 승진대상 검토 가능`,
    };
  }

  if (!current) {
    return {
      eligible: false,
      label: "미정",
      detail: "당해 등급 입력 후 차기 전망을 확인할 수 있습니다",
    };
  }

  const projectedYears = input.titleYears + 1;
  const pointsOk = input.totalPoints >= req.points;
  const yearsOk = projectedYears >= req.years;
  const yearsNote = yearsOk
    ? `예상년차 ${projectedYears}/${req.years}`
    : `예상년차 미달(${projectedYears}/${req.years}, 참고)`;

  // 포인트 충족이 우선 — 년차 미달해도 차기 가능
  if (pointsOk) {
    return {
      eligible: true,
      label: "가능",
      detail: `차기년 ${req.nextTitle} 승진대상 가능 전망 (포인트 ${input.totalPoints}/${req.points}, ${yearsNote})`,
    };
  }

  return {
    eligible: false,
    label: "어려움",
    detail: `차기년 포인트 미달 전망 · ${input.totalPoints}/${req.points} (부족 ${req.points - input.totalPoints}) · ${yearsNote}`,
  };
}
