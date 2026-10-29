import type { JobTrack, LeaveReason, OrgDivision, OrgTeam } from "@/lib/types";

export const JOB_TRACKS: JobTrack[] = [
  "일반직",
  "지원직",
  "현장직",
  "별정직",
  "계약직",
];

export const LEAVE_REASONS: LeaveReason[] = [
  "이직",
  "개인사정",
  "계약만료",
  "권고사직",
  "정년퇴직",
  "기타",
];

/** 직군별 직위 (퇴사 도넛·마스터 기준) */
export const TITLES_BY_TRACK: Record<JobTrack, readonly string[]> = {
  일반직: ["부장", "차장", "과장", "대리", "사원"],
  지원직: ["대리", "주임", "사원"],
  현장직: ["기장", "직장", "사원"],
  별정직: ["사원"],
  계약직: ["사원"],
};

export const ALL_TITLE_KEYS: { track: JobTrack; title: string; label: string }[] =
  JOB_TRACKS.flatMap((track) =>
    TITLES_BY_TRACK[track].map((title) => ({
      track,
      title,
      label: `${track}·${title}`,
    })),
  );

export const ORG_DIVISIONS: OrgDivision[] = [
  "경영지원본부",
  "국제물류사업본부",
  "축산자원사업본부",
];

export const ORG_TEAMS: OrgTeam[] = [
  "인사총무팀",
  "재경팀",
  "신용관리팀",
  "곡물사업팀",
  "기술팀",
  "SCM사업팀",
  "구매팀",
  "영업팀",
  "물류지원팀",
];

/** 팀 → 소속 본부 */
export const TEAM_DIVISION: Record<OrgTeam, OrgDivision> = {
  인사총무팀: "경영지원본부",
  재경팀: "경영지원본부",
  신용관리팀: "경영지원본부",
  곡물사업팀: "국제물류사업본부",
  기술팀: "국제물류사업본부",
  SCM사업팀: "국제물류사업본부",
  구매팀: "축산자원사업본부",
  영업팀: "축산자원사업본부",
  물류지원팀: "축산자원사업본부",
};

export const TEAMS_BY_DIVISION: Record<OrgDivision, OrgTeam[]> = {
  경영지원본부: ["인사총무팀", "재경팀", "신용관리팀"],
  국제물류사업본부: ["곡물사업팀", "기술팀", "SCM사업팀"],
  축산자원사업본부: ["구매팀", "영업팀", "물류지원팀"],
};
