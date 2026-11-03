import { JOB_TRACKS, ORG_DIVISIONS, ORG_TEAMS, TEAM_DIVISION } from "@/data/org";
import type {
  EmployeeRosterRecord,
  Gender,
  HrEmployee,
  JobTrack,
  OrgDivision,
  OrgTeam,
} from "@/lib/types";

function mapGender(raw: string): Gender {
  const g = raw.trim();
  if (g === "여" || g === "여자" || g.toLowerCase() === "f") return "여";
  return "남";
}

/**
 * 사원명부 → 인사 대시보드용 HrEmployee (재직).
 * 생년월일·퇴사일은 명부에 없어 비움. 연봉은 명부 salary를 그대로 반영.
 * 본부·팀·직군은 명부 값을 그대로 써서 필터·차트에 반영.
 */
export function rosterToHrEmployees(
  records: EmployeeRosterRecord[],
): HrEmployee[] {
  return records
    .filter((r) => r.name?.trim())
    .map((r) => {
      const hireDate = r.hireDate || r.groupHireDate || "";
      const jobTrackRaw = r.jobTrack?.trim() || "일반직";
      const jobTrack = (
        (JOB_TRACKS as readonly string[]).includes(jobTrackRaw)
          ? jobTrackRaw
          : jobTrackRaw
      ) as JobTrack;

      let division = (r.division?.trim() || "") as OrgDivision;
      let team = (r.department?.trim() || "") as OrgTeam;

      if (
        !division &&
        (ORG_TEAMS as readonly string[]).includes(team) &&
        TEAM_DIVISION[team]
      ) {
        division = TEAM_DIVISION[team];
      }
      if (!division && (ORG_DIVISIONS as readonly string[]).length) {
        division = "경영지원본부";
      }
      if (!team) {
        team = "인사총무팀";
      }

      return {
        id: `roster-${r.id}`,
        name: r.name.trim(),
        gender: mapGender(r.gender),
        birthDate: "",
        hireDate,
        status: "재직" as const,
        jobTrack,
        division,
        team,
        title: r.title || "사원",
        salary:
          typeof r.salary === "number" && Number.isFinite(r.salary)
            ? Math.max(0, Math.floor(r.salary))
            : 0,
      };
    });
}

/** HR Dashboard 필터 표시 순서 */
export const HR_FILTER_JOB_TRACK_ORDER = [
  "임원",
  "일반직",
  "지원직",
  "별정직",
  "현장직",
  "계약직",
] as const;

export const HR_FILTER_DIVISION_ORDER = [
  "임원실",
  "경영지원본부",
  "국제물류사업본부",
  "축산자원사업본부",
] as const;

export const HR_FILTER_TEAM_ORDER = [
  "임원실",
  "인사총무팀",
  "재경팀",
  "신용관리팀",
  "곡물사업팀",
  "SCM사업팀",
  "기술팀",
  "구매팀",
  "영업팀",
  "물류지원팀",
] as const;

export function sortByPreferredOrder(
  values: Iterable<string>,
  preferred: readonly string[],
) {
  const rank = new Map(preferred.map((v, i) => [v, i]));
  return [...new Set(values)].sort((a, b) => {
    const ra = rank.has(a) ? rank.get(a)! : preferred.length;
    const rb = rank.has(b) ? rank.get(b)! : preferred.length;
    if (ra !== rb) return ra - rb;
    return a.localeCompare(b, "ko");
  });
}

/** 대시보드 필터용: 사원명부에 실제 있는 직군·본부·팀 */
export function rosterFilterOptions(records: EmployeeRosterRecord[]) {
  const tracks = new Set<string>([
    ...HR_FILTER_JOB_TRACK_ORDER,
    ...JOB_TRACKS,
  ]);
  const divisions = new Set<string>([
    ...HR_FILTER_DIVISION_ORDER,
    ...ORG_DIVISIONS,
  ]);
  const teams = new Set<string>([...HR_FILTER_TEAM_ORDER, ...ORG_TEAMS]);
  for (const r of records) {
    if (r.jobTrack?.trim()) tracks.add(r.jobTrack.trim());
    if (r.division?.trim()) divisions.add(r.division.trim());
    if (r.department?.trim()) teams.add(r.department.trim());
  }
  return {
    jobTracks: sortByPreferredOrder(tracks, HR_FILTER_JOB_TRACK_ORDER),
    divisions: sortByPreferredOrder(divisions, HR_FILTER_DIVISION_ORDER),
    teams: sortByPreferredOrder(teams, HR_FILTER_TEAM_ORDER),
  };
}
